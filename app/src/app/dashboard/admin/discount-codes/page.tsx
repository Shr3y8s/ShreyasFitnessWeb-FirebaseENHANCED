'use client';

// Admin — Discount Codes.
//
// All access is through AUTH+ADMIN-gated callables (createDiscountCode /
// listDiscountCodes / setDiscountCodeActive / updateDiscountCode /
// listCodeRedemptions). The collections themselves are server-only
// (firestore.rules deny all client reads/writes), so this page never touches
// Firestore directly — it calls the functions, which use the admin SDK.
//
// UI is split into two tabs:
//   • Create / Edit — the code form (create mode).
//   • Manage Codes  — the list of codes, with an inline card slot above the list
//                     that shows EITHER the edit form OR the redemption history
//                     (mutually exclusive) when a row action is clicked.
//
// Subscription discounts apply a per-subscriber billing-cycle override at checkout
// (the discount-codes-2cycle override model). A subscription code can be scoped to a
// single tier (OC / CT) via appliesTo.productIds — the server's validateCode enforces
// it at checkout. One-time (in-person session) codes never apply to subscriptions.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminSidebar from '@/components/AdminSidebar';
import { Tag, Plus, Loader2, Power, Info, Pencil, History, X } from 'lucide-react';

interface DiscountCodeRow {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  expiresAt: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  perUserLimit: number | null;
  minChargeFloor: number;
  freeComp: boolean;
  discountScope: string;
  introCycles?: number;
  appliesTo?: { productIds?: string[] } | null;
}

interface RedemptionRow {
  id: string;
  userId: string | null;
  mode: string | null;
  originalAmount: number | null;
  discountedAmount: number | null;
  amountOff: number | null;
  transactionId: string | null;
  createdAt: number | null;
}

// App tier ids for OC/CT scoping (must match firebase/functions/product-config.js
// and app/src/lib/constants.ts). A subscription discount can be restricted to one
// tier via appliesTo.productIds — the server's validateCode enforces it at checkout.
const TIER_OC = 'online_coaching';
const TIER_CT = 'complete_transformation';

const fmtCents = (c: number) => `$${(Math.max(0, c) / 100).toFixed(2)}`;

export default function AdminDiscountCodesPage() {
  const router = useRouter();
  const { user, canAccessAdminDashboard } = useAuth();

  const [codes, setCodes] = useState<DiscountCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Which tab is active. 'manage' shows the list first so the admin lands on their
  // existing codes; 'create' shows the blank form.
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('manage');

  // Which inline card (if any) shows above the list in the Manage tab. Edit and
  // history are mutually exclusive.
  const [managePanel, setManagePanel] = useState<'none' | 'edit' | 'history'>('none');

  // Shared create/edit form state. `editId` is null in create mode, or the code id
  // when editing (the code string itself is immutable in edit mode).
  const [editId, setEditId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<DiscountCodeRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minFloorDollars, setMinFloorDollars] = useState('1.00');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [freeComp, setFreeComp] = useState(false);
  // Where the code applies. 'one_time' = training-session purchases. The two
  // subscription scopes drive the 2-cycle billing override at checkout:
  //   'first_cycle' → intro: discount the FIRST N months, then revert to full price.
  //   'recurring'   → discount EVERY month for as long as the subscription is active.
  const [discountScope, setDiscountScope] =
    useState<'one_time' | 'first_cycle' | 'recurring'>('one_time');
  // Intro length (first_cycle scope only): how many months the discounted price
  // applies before PayPal auto-reverts to full. Stored as a string for the input.
  const [introCycles, setIntroCycles] = useState('1');
  // Which subscription tier a subscription-scoped code applies to. 'both' = no
  // restriction (appliesTo:null); 'oc'/'ct' scope the code to a single tier via
  // appliesTo.productIds. Only meaningful for subscription scopes.
  const [subPlan, setSubPlan] = useState<'both' | 'oc' | 'ct'>('both');

  // Redemption history state (loaded on demand via the History row action).
  const [history, setHistory] = useState<RedemptionRow[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyForCode, setHistoryForCode] = useState('');

  const isEditing = editId !== null;
  const isSubscriptionScope = discountScope === 'first_cycle' || discountScope === 'recurring';

  const callable = useCallback(async (name: string, payload: Record<string, unknown>) => {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('@/lib/firebase');
    const fn = httpsCallable(functions, name);
    const res = await fn(payload);
    return res.data as Record<string, unknown>;
  }, []);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callable('listDiscountCodes', {});
      setCodes(((data?.codes as DiscountCodeRow[]) || []).sort((a, b) => a.code.localeCompare(b.code)));
    } catch (e) {
      setError((e as Error)?.message || 'Failed to load discount codes.');
    } finally {
      setLoading(false);
    }
  }, [callable]);

  useEffect(() => {
    if (!user || !canAccessAdminDashboard) {
      router.push('/dashboard/trainer');
      return;
    }
    loadCodes();
  }, [user, canAccessAdminDashboard, router, loadCodes]);

  const resetForm = () => {
    setEditId(null);
    setEditRow(null);
    setCode('');
    setType('percentage');
    setValue('');
    setMinFloorDollars('1.00');
    setMaxRedemptions('');
    setPerUserLimit('');
    setExpiresAt('');
    setFreeComp(false);
    setDiscountScope('one_time');
    setIntroCycles('1');
    setSubPlan('both');
    setFormError('');
  };

  // Load recent redemptions for a code. Server-side only via callable.
  const loadHistory = useCallback(async (codeId: string) => {
    setHistoryLoading(true);
    setHistory([]);
    setHistoryTotal(0);
    try {
      const data = await callable('listCodeRedemptions', { code: codeId, limit: 25 });
      setHistory((data?.redemptions as RedemptionRow[]) || []);
      setHistoryTotal(Number(data?.total) || 0);
    } catch {
      // Non-fatal: leave history empty.
    } finally {
      setHistoryLoading(false);
    }
  }, [callable]);

  // Row action → open the edit form inline above the list (Manage tab), pre-filled.
  const startEdit = (row: DiscountCodeRow) => {
    setEditId(row.id);
    setEditRow(row);
    setCode(row.code);
    setType(row.type);
    setValue(
      row.freeComp
        ? ''
        : row.type === 'fixed'
          ? (row.value / 100).toFixed(2)
          : String(row.value)
    );
    setMinFloorDollars((row.minChargeFloor / 100).toFixed(2));
    setMaxRedemptions(row.maxRedemptions != null ? String(row.maxRedemptions) : '');
    setPerUserLimit(row.perUserLimit != null ? String(row.perUserLimit) : '');
    setExpiresAt(row.expiresAt ? new Date(row.expiresAt).toISOString().slice(0, 10) : '');
    setFreeComp(row.freeComp);
    setDiscountScope(
      row.discountScope === 'first_cycle' || row.discountScope === 'recurring'
        ? row.discountScope
        : 'one_time'
    );
    setIntroCycles(String(row.introCycles && row.introCycles > 0 ? row.introCycles : 1));
    // Decode the tier restriction from appliesTo.productIds back into the dropdown.
    const pids = row.appliesTo?.productIds;
    setSubPlan(
      Array.isArray(pids) && pids.length === 1 && pids[0] === TIER_OC
        ? 'oc'
        : Array.isArray(pids) && pids.length === 1 && pids[0] === TIER_CT
          ? 'ct'
          : 'both'
    );
    setFormError('');
    setManagePanel('edit');
    setActiveTab('manage');
  };

  // Row action → open the redemption-history card inline above the list (history only).
  const startHistory = (row: DiscountCodeRow) => {
    setHistoryForCode(row.code);
    setManagePanel('history');
    setActiveTab('manage');
    loadHistory(row.id);
  };

  // Close whatever inline card is open in the Manage tab.
  const closeManagePanel = () => {
    setManagePanel('none');
    resetForm();
  };

  // Tab switch. Entering the Create tab always resets to a blank create form.
  const onTabChange = (v: string) => {
    const next = v === 'create' ? 'create' : 'manage';
    setActiveTab(next);
    if (next === 'create') {
      setManagePanel('none');
      resetForm();
    }
  };

  // Validate the shared form (used by both create and edit).
  const validateForm = (): string | null => {
    if (!freeComp) {
      const v = Number(value);
      if (!Number.isFinite(v) || v <= 0) {
        return 'Enter a value greater than 0 (or mark it a free comp).';
      }
      if (type === 'percentage' && v > 100) {
        return 'Percentage cannot exceed 100.';
      }
    }
    // Subscription scopes are applied via the PayPal billing-cycle override. Free
    // comps aren't supported for subscriptions (a true $0 cycle; PayPal rejects $0).
    if (isSubscriptionScope && freeComp) {
      return 'Subscription discounts can\u2019t be free comps. Use a percentage/amount with a minimum charge floor.';
    }
    return null;
  };

  // Build the appliesTo payload from the subscription-tier selector. Tier scoping is
  // only meaningful for subscription scopes; one-time codes always send null.
  const buildAppliesTo = (): { productIds: string[] } | null => {
    if (!isSubscriptionScope) return null;
    if (subPlan === 'oc') return { productIds: [TIER_OC] };
    if (subPlan === 'ct') return { productIds: [TIER_CT] };
    return null;
  };

  const handleSave = async () => {
    setFormError('');
    if (isEditing) {
      const validationError = validateForm();
      if (validationError) {
        setFormError(validationError);
        return;
      }
      setCreating(true);
      try {
        await callable('updateDiscountCode', {
          code: editId,
          type,
          value: freeComp ? 0 : type === 'fixed' ? Math.round(Number(value) * 100) : Number(value),
          minChargeFloor: Math.round((Number(minFloorDollars) || 1) * 100),
          maxRedemptions: maxRedemptions.trim() ? Number(maxRedemptions) : null,
          perUserLimit: perUserLimit.trim() ? Number(perUserLimit) : null,
          expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
          freeComp,
          discountScope,
          introCycles: discountScope === 'first_cycle' ? Math.max(1, Number(introCycles) || 1) : 1,
          // Tier scope for subscription codes (OC-only / CT-only / both). null clears
          // any prior restriction so an edit back to "both" widens the code again.
          appliesTo: buildAppliesTo(),
        });
        resetForm();
        setManagePanel('none');
        await loadCodes();
      } catch (e) {
        setFormError((e as Error)?.message || 'Failed to update code.');
      } finally {
        setCreating(false);
      }
      return;
    }

    // Create mode.
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setFormError('Code is required.');
      return;
    }
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setCreating(true);
    try {
      await callable('createDiscountCode', {
        code: normalized,
        type,
        value: freeComp ? 0 : type === 'fixed' ? Math.round(Number(value) * 100) : Number(value),
        minChargeFloor: Math.round((Number(minFloorDollars) || 1) * 100),
        maxRedemptions: maxRedemptions.trim() ? Number(maxRedemptions) : null,
        perUserLimit: perUserLimit.trim() ? Number(perUserLimit) : null,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
        freeComp,
        discountScope,
        introCycles: discountScope === 'first_cycle' ? Math.max(1, Number(introCycles) || 1) : 1,
        appliesTo: buildAppliesTo(),
        active: true,
      });
      resetForm();
      await loadCodes();
      // Jump to the list so the admin sees the code they just created.
      setActiveTab('manage');
    } catch (e) {
      setFormError((e as Error)?.message || 'Failed to create code.');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (row: DiscountCodeRow) => {
    setBusyId(row.id);
    try {
      await callable('setDiscountCodeActive', { code: row.code, active: !row.active });
      await loadCodes();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to update code.');
    } finally {
      setBusyId(null);
    }
  };

  const describeValue = (row: DiscountCodeRow) => {
    if (row.freeComp) return 'Free (100% off)';
    return row.type === 'percentage' ? `${row.value}% off` : `${fmtCents(row.value)} off`;
  };

  // Short tier-restriction suffix for the Scope column (subscription codes only).
  const describeTier = (row: DiscountCodeRow): string => {
    const pids = row.appliesTo?.productIds;
    if (!Array.isArray(pids) || pids.length !== 1) return '';
    if (pids[0] === TIER_OC) return ' · OC only';
    if (pids[0] === TIER_CT) return ' · CT only';
    return '';
  };

  const describeScope = (row: DiscountCodeRow): string => {
    if (row.discountScope === 'first_cycle') {
      const months = row.introCycles && row.introCycles > 1 ? `${row.introCycles} months` : 'month';
      return `Sub · first ${months}${describeTier(row)}`;
    }
    if (row.discountScope === 'recurring') {
      return `Sub · every month${describeTier(row)}`;
    }
    return 'One-time';
  };

  // Shared form fields grid (used by both the Create tab and the inline edit card).
  const renderFields = () => (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Code</label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. SMOKETEST"
          className="uppercase"
          disabled={isEditing}
          readOnly={isEditing}
        />
        {isEditing && (
          <p className="mt-1 text-xs text-gray-500">Code can&apos;t be changed after creation.</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'percentage' | 'fixed')}
          disabled={freeComp}
          className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm disabled:opacity-50"
        >
          <option value="percentage">Percentage (%)</option>
          <option value="fixed">Fixed ($ off)</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Applies to (scope)</label>
        <select
          value={discountScope}
          onChange={(e) => {
            const next = e.target.value as 'one_time' | 'first_cycle' | 'recurring';
            setDiscountScope(next);
            if (next !== 'one_time') setFreeComp(false);
            if (formError) setFormError('');
          }}
          className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
        >
          <option value="one_time">One-time purchase (training sessions)</option>
          <option value="first_cycle">Subscription — first N months (intro)</option>
          <option value="recurring">Subscription — every month</option>
        </select>
      </div>

      {isSubscriptionScope && (
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Applies to plan</label>
          <select
            value={subPlan}
            onChange={(e) => setSubPlan(e.target.value as 'both' | 'oc' | 'ct')}
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="both">Both plans (OC &amp; CT)</option>
            <option value="oc">Online Coaching (OC) only</option>
            <option value="ct">Complete Transformation (CT) only</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Restrict this subscription discount to one tier. A code scoped to OC can&apos;t be
            redeemed on a CT subscription and vice-versa.
          </p>
        </div>
      )}

      {discountScope === 'first_cycle' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Intro length (months)</label>
          <Input
            type="number"
            min={1}
            step={1}
            value={introCycles}
            onChange={(e) => setIntroCycles(e.target.value)}
            placeholder="1"
          />
          <p className="mt-1 text-xs text-gray-500">
            How many months the discount applies before reverting to full price.
          </p>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {type === 'percentage' ? 'Percent off (0–100)' : 'Amount off ($)'}
        </label>
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={freeComp}
          placeholder={type === 'percentage' ? '25' : '10.00'}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimum charge floor ($)</label>
        <Input
          type="number"
          value={minFloorDollars}
          onChange={(e) => setMinFloorDollars(e.target.value)}
          placeholder="1.00"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Max redemptions (blank = unlimited)
        </label>
        <Input
          type="number"
          value={maxRedemptions}
          onChange={(e) => setMaxRedemptions(e.target.value)}
          placeholder="Unlimited"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Per-user limit (blank = no limit)
        </label>
        <Input
          type="number"
          value={perUserLimit}
          onChange={(e) => setPerUserLimit(e.target.value)}
          placeholder="No limit"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Expires (blank = never)</label>
        <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </div>
    </div>
  );

  // The full form card body (fields + edit-only system info + errors + buttons).
  // `onCancel` differs: create clears the form; inline edit closes the panel.
  const renderFormCard = (onCancel: () => void) => (
    <>
      {renderFields()}

      {isEditing && editRow && (
        <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div>
            <span className="block text-gray-500">Redemptions used</span>
            <span className="font-medium text-gray-800">
              {editRow.redemptionCount}
              {editRow.maxRedemptions != null ? ` / ${editRow.maxRedemptions}` : ' (no max)'}
            </span>
          </div>
          <div>
            <span className="block text-gray-500">Status</span>
            <span className="font-medium text-gray-800">{editRow.active ? 'Active' : 'Inactive'}</span>
          </div>
          <div>
            <span className="block text-gray-500">Scope</span>
            <span className="font-medium text-gray-800">{describeScope(editRow)}</span>
          </div>
        </div>
      )}

      {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

      <div className="flex items-center gap-3 mt-5">
        <Button onClick={handleSave} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {isEditing ? 'Save Changes' : 'Create Code'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={creating}>
          {/* In create mode the handler just clears the form (a Reset); in edit
              mode it closes the inline panel (a true Cancel). */}
          {isEditing ? 'Cancel' : 'Reset'}
        </Button>

      </div>
    </>
  );

  // The redemption-history card body.
  const renderHistoryCard = () => (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Redemption history{historyTotal > 0 ? ` (${historyTotal} total)` : ''}
        </span>
        {historyLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>
      {!historyLoading && history.length === 0 ? (
        <p className="px-4 py-4 text-sm text-gray-500">No redemptions yet.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-gray-500 sticky top-0">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Mode</th>
                <th className="px-4 py-2 font-medium">Original</th>
                <th className="px-4 py-2 font-medium">Charged</th>
                <th className="px-4 py-2 font-medium">Off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600 font-mono text-xs" title={r.userId || ''}>
                    {r.userId ? `${r.userId.slice(0, 8)}…` : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{r.mode || '—'}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {r.originalAmount != null ? fmtCents(r.originalAmount) : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-800">
                    {r.discountedAmount != null ? fmtCents(r.discountedAmount) : '—'}
                  </td>
                  <td className="px-4 py-2 text-emerald-700">
                    {r.amountOff != null ? fmtCents(r.amountOff) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <SidebarProvider>
      <AdminSidebar currentPage="discount-codes" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Tag className="w-7 h-7 text-emerald-600" />
                Discount Codes
              </h1>
              <p className="text-muted-foreground mt-2">
                Create and manage discount codes for one-time purchases and subscriptions.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 space-y-1">
                  <p>
                    <span className="font-medium">Scope</span> controls where a code applies:
                    <span className="font-medium"> one-time</span> (training-session purchases),
                    <span className="font-medium"> subscription — first month</span> (intro: the
                    first month is discounted, then the price reverts to full), or
                    <span className="font-medium"> subscription — every month</span> (the discount
                    applies for as long as the subscription is active).
                  </p>
                  <p>
                    <span className="font-medium">Applies to plan</span> (subscription scopes only)
                    restricts a code to a single tier — <span className="font-medium">Online
                    Coaching (OC)</span> or <span className="font-medium">Complete Transformation
                    (CT)</span>. An OC-only code can&apos;t be redeemed on a CT subscription and
                    vice-versa. Choose <span className="font-medium">Both plans</span> to leave it
                    unrestricted.
                  </p>
                  <p>
                    The <span className="font-medium">minimum charge floor</span> guarantees the
                    charged amount never drops below it (PayPal rejects $0). A 100%-off paid code
                    clamps to this floor (default $1.00).
                  </p>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={onTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="create">Create / Edit</TabsTrigger>
                <TabsTrigger value="manage">Manage Codes</TabsTrigger>
              </TabsList>

              {/* ── Create / Edit tab ─────────────────────────────────────────── */}
              <TabsContent value="create">
                <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Create a code</h2>

                  {/* This tab is always create mode; editId is cleared on entering it. */}
                  {renderFormCard(() => {
                    resetForm();
                  })}
                </div>
              </TabsContent>

              {/* ── Manage Codes tab ──────────────────────────────────────────── */}
              <TabsContent value="manage">
                {/* Inline card slot: edit form OR redemption history (mutually exclusive). */}
                {managePanel === 'edit' && (
                  <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Edit code: {code}</h2>

                      <Button variant="ghost" size="sm" onClick={closeManagePanel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {renderFormCard(closeManagePanel)}
                  </div>
                )}

                {managePanel === 'history' && (
                  <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Redemptions: {historyForCode}</h2>

                      <Button variant="ghost" size="sm" onClick={closeManagePanel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {renderHistoryCard()}
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                    Loading codes…
                  </div>
                ) : codes.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-emerald-200 rounded-xl bg-gradient-to-br from-emerald-50 via-white to-teal-50">

                    <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No discount codes yet.</p>
                    <Button onClick={() => onTabChange('create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Code
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-xl shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-emerald-50/60 text-left text-gray-600">

                        <tr>
                          <th className="px-4 py-3 font-medium">Code</th>
                          <th className="px-4 py-3 font-medium">Discount</th>
                          <th className="px-4 py-3 font-medium">Scope</th>
                          <th className="px-4 py-3 font-medium">Floor</th>
                          <th className="px-4 py-3 font-medium">Used</th>
                          <th className="px-4 py-3 font-medium">Limits</th>
                          <th className="px-4 py-3 font-medium">Expires</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {codes.map((row) => (
                          <tr key={row.id} className={row.active ? '' : 'opacity-60'}>
                            <td className="px-4 py-3 font-semibold">{row.code}</td>
                            <td className="px-4 py-3">{describeValue(row)}</td>
                            <td className="px-4 py-3 text-gray-600">{describeScope(row)}</td>
                            <td className="px-4 py-3">{fmtCents(row.minChargeFloor)}</td>
                            <td className="px-4 py-3">
                              {row.redemptionCount}
                              {row.maxRedemptions != null ? ` / ${row.maxRedemptions}` : ''}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {row.perUserLimit != null ? `${row.perUserLimit}/user` : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  row.active
                                    ? 'inline-flex rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium'
                                    : 'inline-flex rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium'
                                }
                              >
                                {row.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEdit(row)}
                                  disabled={busyId === row.id}
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startHistory(row)}
                                  disabled={busyId === row.id}
                                >
                                  <History className="h-4 w-4 mr-1" />
                                  History
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleActive(row)}
                                  disabled={busyId === row.id}
                                >
                                  {busyId === row.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Power className="h-4 w-4 mr-1" />
                                      {row.active ? 'Deactivate' : 'Activate'}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
