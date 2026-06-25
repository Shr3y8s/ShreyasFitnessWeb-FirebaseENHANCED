/**
 * Unit tests for the provider-neutral discount core (Feature 2, phase 1).
 *
 * Covers the PURE helpers — `computeDiscountedAmount` (percentage, fixed, floor
 * clamp, 100%→floor, freeComp) and `validateCode` (inactive, expired, global +
 * per-user limits, applicability). These have no Firestore dependency, so the
 * `firebase-admin` / `firebase-functions` requires at the top of discounts.js are
 * harmless here (no admin app is initialized at require time).
 *
 * Run: `npm test` (from firebase/functions).
 */

const {
  computeDiscountedAmount,
  validateCode,
  normalizeCode,
  DEFAULT_MIN_CHARGE_FLOOR,
} = require("./discounts");

describe("normalizeCode", () => {
  test("uppercases + trims", () => {
    expect(normalizeCode("  friends25 ")).toBe("FRIENDS25");
  });
  test("handles nullish", () => {
    expect(normalizeCode(null)).toBe("");
    expect(normalizeCode(undefined)).toBe("");
  });
});

describe("computeDiscountedAmount", () => {
  test("percentage off (25% of $75.00)", () => {
    const r = computeDiscountedAmount({ type: "percentage", value: 25 }, 7500);
    expect(r.discountedAmount).toBe(5625);
    expect(r.amountOff).toBe(1875);
    expect(r.floored).toBe(false);
    expect(r.freeComp).toBe(false);
  });

  test("fixed off ($10.00 off $75.00)", () => {
    const r = computeDiscountedAmount({ type: "fixed", value: 1000 }, 7500);
    expect(r.discountedAmount).toBe(6500);
    expect(r.amountOff).toBe(1000);
    expect(r.floored).toBe(false);
  });

  test("floor clamps below the minimum (SMOKETEST: $75 → $1.00 floor)", () => {
    // 99% off $75 = $0.75 which is below the $1.00 floor → clamps to $1.00.
    const r = computeDiscountedAmount(
      { type: "percentage", value: 99, minChargeFloor: 100 },
      7500
    );
    expect(r.discountedAmount).toBe(100);
    expect(r.floored).toBe(true);
    expect(r.amountOff).toBe(7400);
  });

  test("100%-off PAID code clamps to floor (never $0 unless freeComp)", () => {
    const r = computeDiscountedAmount(
      { type: "percentage", value: 100, minChargeFloor: 100 },
      7500
    );
    expect(r.discountedAmount).toBe(100);
    expect(r.floored).toBe(true);
    expect(r.freeComp).toBe(false);
  });

  test("freeComp yields $0 and bypasses the floor", () => {
    const r = computeDiscountedAmount({ freeComp: true }, 7500);
    expect(r.discountedAmount).toBe(0);
    expect(r.amountOff).toBe(7500);
    expect(r.freeComp).toBe(true);
  });

  test("custom floor honored (default when unset)", () => {
    const noFloor = computeDiscountedAmount({ type: "percentage", value: 100 }, 7500);
    expect(noFloor.discountedAmount).toBe(DEFAULT_MIN_CHARGE_FLOOR);
  });

  test("fixed off greater than price clamps to floor (never negative)", () => {
    const r = computeDiscountedAmount(
      { type: "fixed", value: 99999, minChargeFloor: 100 },
      7500
    );
    expect(r.discountedAmount).toBe(100);
    expect(r.floored).toBe(true);
  });
});

describe("validateCode", () => {
  const base = { type: "percentage", value: 25, active: true };

  test("not_found when codeDoc is null", () => {
    expect(validateCode(null)).toEqual({ valid: false, reason: "not_found" });
  });

  test("inactive code", () => {
    expect(validateCode({ ...base, active: false })).toEqual({
      valid: false,
      reason: "inactive",
    });
  });

  test("expired code (epoch seconds in the past)", () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    expect(validateCode({ ...base, expiresAt: past })).toEqual({
      valid: false,
      reason: "expired",
    });
  });

  test("valid when expiry is in the future", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(validateCode({ ...base, expiresAt: future })).toEqual({ valid: true });
  });

  test("global limit reached", () => {
    expect(
      validateCode({ ...base, maxRedemptions: 5, redemptionCount: 5 })
    ).toEqual({ valid: false, reason: "limit_reached" });
  });

  test("per-user limit reached", () => {
    expect(
      validateCode({ ...base, perUserLimit: 1 }, {}, 1)
    ).toEqual({ valid: false, reason: "per_user_limit" });
  });

  test("applicability: mode mismatch → not_applicable", () => {
    expect(
      validateCode(
        { ...base, appliesTo: { modes: ["subscription"] } },
        { mode: "payment" }
      )
    ).toEqual({ valid: false, reason: "not_applicable" });
  });

  test("applicability: productId mismatch → not_applicable", () => {
    expect(
      validateCode(
        { ...base, appliesTo: { productIds: ["online_coaching"] } },
        { productId: "in_person" }
      )
    ).toEqual({ valid: false, reason: "not_applicable" });
  });

  test("applicability: priceId match passes", () => {
    expect(
      validateCode(
        { ...base, appliesTo: { items: ["IN_PERSON"] } },
        { priceId: "IN_PERSON" }
      )
    ).toEqual({ valid: true });
  });

  test("valid with no constraints", () => {
    expect(validateCode(base, { mode: "payment", priceId: "IN_PERSON" })).toEqual({
      valid: true,
    });
  });
});
