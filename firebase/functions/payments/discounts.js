/**
 * Provider-NEUTRAL discount-code core (Feature 2 — discount codes, phase 1).
 *
 * Pure-ish helpers for validating a code, computing the discounted amount with a
 * minimum-charge floor, and recording a redemption transactionally. These contain
 * NO provider (PayPal/Stripe) specifics — the PayPal callables in ./index.js call
 * them to resolve a server-authoritative discounted amount, and the adapter only
 * ever sees the resulting amount (design: app + adapter never trust a client amount).
 *
 * Firestore model (design §2):
 *   discount_codes/{CODE_UPPER}      — admin-managed code definitions
 *   discount_redemptions/{autoId}    — one doc per successful redemption (audit)
 *
 * SECURITY: codes are read ONLY server-side (admin SDK); firestore.rules deny all
 * client access to both collections.
 *
 * See docs/02-implementation/payment-processor/discount-codes-design.md
 */

const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

/** Default minimum charge (minor units) a discounted total may never go below. */
const DEFAULT_MIN_CHARGE_FLOOR = 100; // $1.00 — PayPal rejects $0 transactions.

/** Normalize a user-entered code to the canonical doc id (uppercased, trimmed). */
function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

/**
 * Read a discount code doc. Returns { id, ...data } or null.
 * @param {string} code raw user-entered code
 */
async function getCode(code) {
  const id = normalizeCode(code);
  if (!id) return null;
  const snap = await admin.firestore().collection("discount_codes").doc(id).get();
  if (!snap.exists) return null;
  return { id, ...(snap.data() || {}) };
}

/**
 * Validate a code against an item + caller. Returns { valid, reason? }.
 * Reasons: 'not_found' | 'inactive' | 'expired' | 'limit_reached' |
 *          'per_user_limit' | 'not_applicable'
 *
 * @param {object|null} codeDoc result of getCode (null = not found)
 * @param {object} ctx { productId, mode, priceId, userId }
 * @param {number} [redemptionsForUser] caller-supplied per-user redemption count
 */
function validateCode(codeDoc, ctx = {}, redemptionsForUser = 0) {
  if (!codeDoc) return { valid: false, reason: "not_found" };
  if (codeDoc.active === false) return { valid: false, reason: "inactive" };

  // Expiry (expiresAt is a Firestore Timestamp or epoch seconds).
  if (codeDoc.expiresAt) {
    const expMs =
      typeof codeDoc.expiresAt === "number"
        ? codeDoc.expiresAt * 1000
        : codeDoc.expiresAt.toMillis
        ? codeDoc.expiresAt.toMillis()
        : Date.parse(codeDoc.expiresAt);
    if (Number.isFinite(expMs) && expMs < Date.now()) {
      return { valid: false, reason: "expired" };
    }
  }

  // Global redemption cap.
  if (
    codeDoc.maxRedemptions != null &&
    (codeDoc.redemptionCount || 0) >= codeDoc.maxRedemptions
  ) {
    return { valid: false, reason: "limit_reached" };
  }

  // Per-user cap (optional).
  if (codeDoc.perUserLimit != null && redemptionsForUser >= codeDoc.perUserLimit) {
    return { valid: false, reason: "per_user_limit" };
  }

  // Applicability (appliesTo). Absent/null = applies to everything.
  const a = codeDoc.appliesTo;
  if (a && typeof a === "object") {
    if (Array.isArray(a.modes) && a.modes.length && !a.modes.includes(ctx.mode)) {
      return { valid: false, reason: "not_applicable" };
    }
    if (
      Array.isArray(a.productIds) &&
      a.productIds.length &&
      !a.productIds.includes(ctx.productId)
    ) {
      return { valid: false, reason: "not_applicable" };
    }
    if (Array.isArray(a.items) && a.items.length && !a.items.includes(ctx.priceId)) {
      return { valid: false, reason: "not_applicable" };
    }
  }

  return { valid: true };
}

/**
 * Compute the discounted amount (minor units) for a valid code, clamped to the
 * code's minimum-charge floor. NEVER returns below the floor unless freeComp.
 *
 * @param {object} codeDoc
 * @param {number} originalMinor original amount in minor units (server-resolved)
 * @returns {{ discountedAmount:number, amountOff:number, floored:boolean, freeComp:boolean, label:string }}
 */
function computeDiscountedAmount(codeDoc, originalMinor) {
  const original = Math.max(0, Math.round(originalMinor || 0));
  const floor =
    codeDoc.minChargeFloor != null
      ? Math.max(0, Math.round(codeDoc.minChargeFloor))
      : DEFAULT_MIN_CHARGE_FLOOR;

  // Free comp bypasses the processor entirely (handled by a separate callable);
  // it yields a $0 "charge" and is flagged so callers route to the comp path.
  if (codeDoc.freeComp === true) {
    return {
      discountedAmount: 0,
      amountOff: original,
      floored: false,
      freeComp: true,
      label: "Complimentary (100% off)",
    };
  }

  let off = 0;
  let label = "";
  if (codeDoc.type === "percentage") {
    const pct = Math.max(0, Math.min(100, Number(codeDoc.value) || 0));
    off = Math.round((original * pct) / 100);
    label = `${pct}% off`;
  } else if (codeDoc.type === "fixed") {
    off = Math.max(0, Math.round(Number(codeDoc.value) || 0));
    label = `$${(off / 100).toFixed(2)} off`;
  }

  let discounted = original - off;
  let floored = false;
  if (discounted < floor) {
    discounted = Math.min(original, floor); // never charge MORE than original
    floored = true;
    label = `${label} (min $${(floor / 100).toFixed(2)})`;
  }
  const actualOff = original - discounted;

  return {
    discountedAmount: discounted,
    amountOff: actualOff,
    floored,
    freeComp: false,
    label,
  };
}

/**
 * Count this user's prior redemptions of a code (for per-user limits).
 */
async function countUserRedemptions(codeId, userId) {
  if (!codeId || !userId) return 0;
  const snap = await admin
    .firestore()
    .collection("discount_redemptions")
    .where("codeId", "==", normalizeCode(codeId))
    .where("userId", "==", userId)
    .get();
  return snap.size;
}

/**
 * Record a redemption transactionally: re-check limits inside the transaction,
 * write a `discount_redemptions` doc, and atomically increment `redemptionCount`.
 * Idempotent on `transactionId` (a capture/subscription id) — a duplicate webhook
 * or retried capture won't double-count.
 *
 * @param {object} p { codeId, userId, mode, productId, originalAmount,
 *                      discountedAmount, amountOff, transactionId, freeComp }
 * @returns {Promise<{recorded:boolean, reason?:string}>}
 */
async function recordRedemption(p) {
  const codeId = normalizeCode(p.codeId);
  if (!codeId || !p.userId) return { recorded: false, reason: "missing_args" };

  const db = admin.firestore();
  const codeRef = db.collection("discount_codes").doc(codeId);

  // Idempotency guard: skip if a redemption already exists for this transaction.
  if (p.transactionId) {
    const existing = await db
      .collection("discount_redemptions")
      .where("codeId", "==", codeId)
      .where("transactionId", "==", p.transactionId)
      .limit(1)
      .get();
    if (!existing.empty) {
      return { recorded: false, reason: "already_recorded" };
    }
  }

  try {
    return await db.runTransaction(async (t) => {
      const codeSnap = await t.get(codeRef);
      if (!codeSnap.exists) return { recorded: false, reason: "not_found" };
      const code = codeSnap.data() || {};

      // Re-check the global cap under the transaction (prevents over-redemption).
      if (
        code.maxRedemptions != null &&
        (code.redemptionCount || 0) >= code.maxRedemptions
      ) {
        return { recorded: false, reason: "limit_reached" };
      }

      const redemptionRef = db.collection("discount_redemptions").doc();
      t.set(redemptionRef, {
        codeId,
        userId: p.userId,
        mode: p.mode || null,
        productId: p.productId || null,
        originalAmount: p.originalAmount ?? null,
        discountedAmount: p.discountedAmount ?? null,
        amountOff: p.amountOff ?? null,
        transactionId: p.transactionId || null,
        freeComp: p.freeComp === true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      t.set(
        codeRef,
        {
          redemptionCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { recorded: true };
    });
  } catch (err) {
    logger.error("recordRedemption failed", { codeId, userId: p.userId, error: err.message });
    return { recorded: false, reason: "error" };
  }
}

module.exports = {
  DEFAULT_MIN_CHARGE_FLOOR,
  normalizeCode,
  getCode,
  validateCode,
  computeDiscountedAmount,
  countUserRedemptions,
  recordRedemption,
};
