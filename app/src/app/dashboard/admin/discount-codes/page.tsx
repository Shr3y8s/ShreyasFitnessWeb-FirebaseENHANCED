'use client';

// Admin — Discount Codes (Feature 2, phase 1: create / list / activate-deactivate).
//
// All access is through AUTH+ADMIN-gated callables (createDiscountCode /
// listDiscountCodes / setDiscountCodeActive). The collections themselves are
// server-only (firestore.rules deny all client reads/writes), so this page never
// touches Firestore directly — it calls the functions, which use the admin SDK.
//
// Phase 1 covers one-time discounts: percentage / fixed, optional expiry, global
// max-redemptions, per-user limit, min-charge floor, and a free-comp flag. Full
// edit + redemption history + subscription scope/fallback-plan UI is Phase 2.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Tag, Plus, Loader2, Power, Info, Pencil } from 'lucide-react';

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
}

const fmtCents = (c: number) => `$${(Math.max(0, c) / 100).toFixed(2)}`;

export default function AdminDiscountCodesPage() {
  const router = useRouter();
  const { user, canAccessAdminDashboard } = useAuth();

  const [codes, setCodes] = useState<DiscountCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create/edit form state. `editId` is null in create mode, or the code id when
  // editing an existing code (the code string itself is immutable in edit mode).
  const [showForm, setShowForm] = useState(false);
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

  const isEditing = editId !== null;

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
    setFormError('');
  };

  // Open the form in "new" mode (cleared).
  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  // Open the form in "edit" mode pre-filled from a row. The code field becomes
  // read-only because the code string is the document identity.
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
    setFormError('');
    setShowForm(true);
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
    return null;
  };

  const handleSave = async () => {
    setFormError('');
    if (isEditing) {
      // Edit mode: code is immutable; send only the editable fields.
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
        });
        resetForm();
        setShowForm(false);
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
        // percentage: 0–100; fixed: minor units (cents) off.
        value: freeComp ? 0 : type === 'fixed' ? Math.round(Number(value) * 100) : Number(value),
        minChargeFloor: Math.round((Number(minFloorDollars) || 1) * 100),
        maxRedemptions: maxRedemptions.trim() ? Number(maxRedemptions) : null,
        perUserLimit: perUserLimit.trim() ? Number(perUserLimit) : null,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
        freeComp,
        discountScope: 'one_time',
        active: true,
      });
      resetForm();
      setShowForm(false);
      await loadCodes();
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

  return (
    <SidebarProvider>
      <AdminSidebar currentPage="discount-codes" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Tag className="w-7 h-7 text-emerald-600" />
                  Discount Codes
                </h1>
                <p className="text-muted-foreground mt-2">
                  Create and manage one-time discount codes for checkout.
                </p>
              </div>
              <Button
                onClick={() => {
                  if (showForm && !isEditing) {
                    setShowForm(false);
                  } else {
                    startCreate();
                  }
                }}
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Code
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 space-y-1">
                  <p>
                    <span className="font-medium">Phase 1:</span> codes apply to one-time
                    purchases (training sessions). Subscription discounts are coming in Phase 2.
                  </p>
                  <p>
                    The <span className="font-medium">minimum charge floor</span> guarantees the
                    charged amount never drops below it (PayPal rejects $0). A 100%-off paid code
                    clamps to the floor; use <span className="font-medium">Free comp</span> for a
                    true $0 (Phase 2 fulfillment).
                  </p>
                </div>
              </div>
            </div>

            {showForm && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">
                  {isEditing ? `Edit code: ${code}` : 'Create a code'}
                </h2>
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
                      <p className="mt-1 text-xs text-gray-500">
                        Code can&apos;t be changed after creation.
                      </p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Minimum charge floor ($)
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Expires (blank = never)
                    </label>
                    <Input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-7">
                    <input
                      id="freeComp"
                      type="checkbox"
                      checked={freeComp}
                      onChange={(e) => setFreeComp(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="freeComp" className="text-sm text-gray-700">
                      Free comp (100% off — Phase 2 fulfillment)
                    </label>
                  </div>
                </div>

                {/* In edit mode, show read-only system-managed fields for context. */}
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
                      <span className="font-medium text-gray-800">
                        {editRow.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-500">Scope</span>
                      <span className="font-medium text-gray-800">{editRow.discountScope}</span>
                    </div>
                  </div>
                )}

                {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

                <div className="flex items-center gap-3 mt-5">
                  <Button onClick={handleSave} disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {isEditing ? 'Save Changes' : 'Create Code'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </div>
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
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No discount codes yet.</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Code
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Discount</th>
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
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
