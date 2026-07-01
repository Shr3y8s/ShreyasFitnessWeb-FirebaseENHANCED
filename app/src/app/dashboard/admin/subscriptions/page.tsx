'use client';

// Admin — Subscription Management Console.
//
// Mirrors the PayPal merchant "Subscriptions" dashboard but inside the app, sourced
// from the Firestore `paypalPlans` registry + the neutral subscription store via
// admin-gated callables (subscription-admin-api.ts). Two tabs:
//   A) Subscription plans — list/search/toggle/reprice/create plans (Tier-first).
//   B) Subscriptions — GLOBAL all-status list (active/paused/canceled) with per-sub
//      detail + actions (view / reprice / change-plan / pause-resume / cancel).
//
// Provider-neutral: the table leads with TIER (OC/CT); PayPal plan ids + subscription
// ids are shown only as de-emphasized "provider reference" rows in the detail view.
// All amounts are MINOR units (cents). "Change plan" is scoped to the SAME tier
// (PayPal /revise only allows same-product moves). Reprice-one uses the PATCH
// per-subscriber override; reprice-plan uses update-pricing-schemes.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Layers, Loader2, MoreHorizontal, Search, RefreshCw, X,
} from 'lucide-react';
import { SERVICE_TIERS } from '@/lib/constants';
import {
  listPaypalPlans, setPaypalPlanActive,
  repricePlansPreview, repricePlansApply,
  getPaypalSubscriptionDetail, revisePaypalSubscription, adminCancelSubscription,

  repriceClientSubscription, listAllSubscriptions,
  adminPauseSubscription, adminResumeSubscription,
} from '@/lib/subscription-admin-api';



import type {
  PaypalPlanRow, PaypalSubscriptionDetail, AllSubscriptionRow,
  RepriceMode, RepricePreviewRow,
} from '@/types/subscription-admin';

const fmtCents = (c: number | null | undefined) =>
  c == null ? '—' : `$${(Math.max(0, c) / 100).toFixed(2)}`;
const fmtDate = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleDateString() : '—';
/** Long, human-friendly date — e.g. "April 28, 2026". */
const fmtDateLong = (ms: number | null | undefined) =>
  ms
    ? new Date(ms).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';
const fmtIso = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString() : '—';
/** Long ISO date — e.g. "April 28, 2026". */
const fmtIsoLong = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';


type StatusFilter = 'ACTIVE' | 'INACTIVE' | 'ALL';
type SubStatusFilter = 'all' | 'active' | 'paused' | 'canceled';

/** Status → badge variant for the subscriptions table. */
function statusBadgeVariant(status: string, cancelAtPeriodEnd: boolean):
  'default' | 'secondary' | 'destructive' | 'outline' {
  if (cancelAtPeriodEnd) return 'destructive';
  const s = (status || '').toLowerCase();
  if (s === 'active') return 'default';
  if (s === 'paused') return 'outline';
  if (s === 'canceled' || s === 'cancelled') return 'destructive';
  return 'secondary';
}

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const { user, canAccessAdminDashboard } = useAuth();

  const [plans, setPlans] = useState<PaypalPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'plans' | 'subs'>('plans');

  // Plans tab state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  // Subscriptions tab state (GLOBAL all-status list)
  const [allSubs, setAllSubs] = useState<AllSubscriptionRow[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsLoaded, setSubsLoaded] = useState(false);
  const [subStatusFilter, setSubStatusFilter] = useState<SubStatusFilter>('all');
  const [subSearch, setSubSearch] = useState('');
  // Optional plan filter applied when drilling in from a plan's active-sub count.
  const [planFilter, setPlanFilter] = useState<{ planId: string; tierName: string | null } | null>(null);

  // Dialogs
  const [showReprice, setShowReprice] = useState(false);

  const [detail, setDetail] = useState<PaypalSubscriptionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listPaypalPlans();
      setPlans(data.sort((a, b) => (a.tierName || a.name).localeCompare(b.tierName || b.name)));
    } catch (e) {
      setError((e as Error)?.message || 'Failed to load plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllSubs = useCallback(async () => {
    setSubsLoading(true);
    try {
      setAllSubs(await listAllSubscriptions());
      setSubsLoaded(true);
    } catch (e) {
      setError((e as Error)?.message || 'Failed to load subscriptions.');
    } finally {
      setSubsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !canAccessAdminDashboard) {
      router.push('/dashboard/trainer');
      return;
    }
    loadPlans();
  }, [user, canAccessAdminDashboard, router, loadPlans]);

  // Lazy-load the global subscriptions list the first time the tab is opened.
  useEffect(() => {
    if (tab === 'subs' && !subsLoaded && !subsLoading) {
      loadAllSubs();
    }
  }, [tab, subsLoaded, subsLoading, loadAllSubs]);

  const visiblePlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (q && !(`${p.name} ${p.planId} ${p.tierName || ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [plans, statusFilter, search]);

  const visibleSubs = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    return allSubs.filter((s) => {
      if (planFilter && s.priceId !== planFilter.planId) return false;
      if (subStatusFilter !== 'all') {
        const st = (s.status || '').toLowerCase();
        if (subStatusFilter === 'canceled' && !(st === 'canceled' || st === 'cancelled')) return false;
        if (subStatusFilter !== 'canceled' && st !== subStatusFilter) return false;
      }
      if (q && !(`${s.tierName || ''} ${s.subscriptionId}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allSubs, planFilter, subStatusFilter, subSearch]);

  const toggleSelect = (planId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };

  const selectAllTier = (tierId: string) => {
    setSelected(new Set(visiblePlans.filter((p) => p.tierId === tierId).map((p) => p.planId)));
  };

  const handleToggleActive = async (p: PaypalPlanRow) => {
    setBusyPlan(p.planId);
    try {
      await setPaypalPlanActive(p.planId, p.status !== 'ACTIVE');
      await loadPlans();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to change plan status.');
    } finally {
      setBusyPlan(null);
    }
  };

  // Drill into a plan's subscriptions: switch to the Subscriptions tab with a
  // plan filter applied (the global list is the source; we just narrow it).
  const openSubsForPlan = (planId: string, tierName: string | null) => {
    setPlanFilter({ planId, tierName });
    setSubStatusFilter('all');
    setTab('subs');
    if (!subsLoaded) loadAllSubs();
  };

  const openDetail = async (subscriptionId: string) => {
    setDetailLoading(true);
    try {
      setDetail(await getPaypalSubscriptionDetail(subscriptionId));
    } catch (e) {
      setError((e as Error)?.message || 'Failed to load subscription.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Quick row-level actions (kebab menu) — no dialog needed. Pause/resume and
  // cancel only require the subscriber's userId, which the row already carries.
  const quickPauseResume = async (userId: string, isPaused: boolean) => {
    setError('');
    try {
      if (isPaused) await adminResumeSubscription(userId);
      else await adminPauseSubscription(userId);
      await loadAllSubs();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to update pause state.');
    }
  };

  const quickCancel = async (userId: string) => {
    setError('');
    try {
      await adminCancelSubscription(userId, 'Admin console cancel');
      await loadAllSubs();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to cancel.');
    }
  };


  if (!user || !canAccessAdminDashboard) return null;

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="p-8 max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Layers className="w-7 h-7 text-emerald-600" />
              <div>
                <h1 className="text-3xl font-bold">Subscription Management</h1>
                <p className="text-muted-foreground mt-1">
                  Plans &amp; subscriptions (PayPal). Reprices take effect at the next billing cycle.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { loadPlans(); if (tab === 'subs') loadAllSubs(); }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'plans' | 'subs')}>
            <TabsList className="mb-4">
              <TabsTrigger value="plans">Subscription plans</TabsTrigger>
              <TabsTrigger value="subs">Subscriptions</TabsTrigger>
            </TabsList>

            {/* ───────────────────────── Tab A: Plans ───────────────────────── */}
            <TabsContent value="plans">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="ALL">All</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tier / plan name"
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={() => selectAllTier(SERVICE_TIERS.ONLINE_COACHING)}>
                    All OC
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => selectAllTier(SERVICE_TIERS.COMPLETE_TRANSFORMATION)}>
                    All CT
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={selected.size === 0}
                    onClick={() => setShowReprice(true)}
                  >
                    Bulk reprice ({selected.size})
                  </Button>
                </div>

              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading plans…
                </div>
              ) : visiblePlans.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  No plans found. {plans.length === 0 && 'Run the catalog/seed scripts to populate the registry.'}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Plan variant</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Active subs</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visiblePlans.map((p) => (
                        <TableRow key={p.planId}>
                          <TableCell>
                            <Checkbox
                              checked={selected.has(p.planId)}
                              onCheckedChange={() => toggleSelect(p.planId)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{p.tierName || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={p.status === 'ACTIVE'}
                                disabled={busyPlan === p.planId}
                                onCheckedChange={() => handleToggleActive(p)}
                              />
                              <span className="text-xs text-muted-foreground">
                                {p.status === 'ACTIVE' ? 'On' : 'Off'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{fmtCents(p.amountMinor)}</TableCell>
                          <TableCell className="text-right">
                            {p.activeSubscriptions > 0 ? (
                              <button
                                className="text-primary hover:underline"
                                onClick={() => openSubsForPlan(p.planId, p.tierName)}
                              >
                                {p.activeSubscriptions}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelected(new Set([p.planId])); setShowReprice(true); }}>
                                  Reprice
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(p)}>
                                  {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openSubsForPlan(p.planId, p.tierName)}>
                                  View subscriptions
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>


            {/* ──────────────────────── Tab B: Subscriptions (global) ──────────────────────── */}

            <TabsContent value="subs">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Select value={subStatusFilter} onValueChange={(v) => setSubStatusFilter(v as SubStatusFilter)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tier / subscription id"
                    className="pl-8"
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                  />
                </div>
                {planFilter && (
                  <Badge variant="secondary" className="gap-1">
                    Plan: {planFilter.tierName || planFilter.planId}
                    <button onClick={() => setPlanFilter(null)} className="ml-1"><X className="w-3 h-3" /></button>
                  </Badge>
                )}
              </div>


              {subsLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading subscriptions…
                </div>
              ) : visibleSubs.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  No subscriptions match the current filters.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Next Billing Date</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleSubs.map((s) => {
                        const st = (s.status || '').toLowerCase();
                        const isPaused = st === 'paused' || st === 'suspended';
                        const isCanceled = st === 'canceled' || st === 'cancelled';
                        return (
                        <TableRow
                          key={s.subscriptionId}
                          className="cursor-pointer hover:bg-emerald-50/50"
                          onClick={() => openDetail(s.subscriptionId)}
                        >
                          <TableCell className="font-medium">{s.tierName || '—'}</TableCell>
                          <TableCell>
                            <ClientCell userId={s.userId} />
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(s.status, s.cancelAtPeriodEnd)}>
                              {s.cancelAtPeriodEnd ? 'canceling' : s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{fmtDateLong(s.startedAt)}</TableCell>
                          <TableCell className="text-right">
                            {fmtCents(s.amountMinor)}
                            {/* Cadence (prepay-plans Phase A): 3 = quarterly, else monthly. */}
                            <span className="text-xs text-muted-foreground ml-1">
                              {s.intervalCount === 3 ? '/qtr' : s.intervalCount === 12 ? '/yr' : '/mo'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{fmtDateLong(s.currentPeriodEnd)}</TableCell>

                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetail(s.subscriptionId)}>
                                  View full details &amp; actions
                                </DropdownMenuItem>
                                {!isCanceled && (
                                  <DropdownMenuItem
                                    onClick={() => quickPauseResume(s.userId, isPaused)}
                                  >
                                    {isPaused ? 'Resume subscription' : 'Pause subscription'}
                                  </DropdownMenuItem>
                                )}
                                {!isCanceled && !s.cancelAtPeriodEnd && (
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => quickCancel(s.userId)}
                                  >
                                    Cancel at period end
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>

                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        </div>
      </SidebarInset>


      {/* Bulk reprice dialog */}

      {showReprice && (
        <RepriceDialog
          planIds={Array.from(selected)}
          onClose={() => setShowReprice(false)}
          onApplied={async () => { setShowReprice(false); setSelected(new Set()); await loadPlans(); }}
        />
      )}

      {/* Subscription detail dialog */}
      {(detail || detailLoading) && (
        <Dialog open onOpenChange={(o) => { if (!o) setDetail(null); }}>
          <DialogContent className="p-0 overflow-hidden gap-0 sm:max-w-2xl">

            <DialogHeader className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-b border-emerald-100 px-6 py-4 space-y-0">
              <DialogTitle className="flex items-center gap-2 text-emerald-900">
                <Layers className="w-5 h-5 text-emerald-600" />
                Subscription detail &amp; actions
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4">
              {detailLoading || !detail ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : (
                <SubscriptionDetailBody
                  detail={detail}
                  plans={plans}
                  onChanged={async () => {
                    await loadAllSubs();
                    setDetail(null);
                  }}
                  onListRefresh={async () => {
                    // Silent background refresh of the table/kebab behind the modal.
                    // Does NOT touch `detail`/`detailLoading`, so the modal never
                    // flickers — the button flips in place via local state instead.
                    await loadAllSubs();
                  }}

                />

              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

    </SidebarProvider>
  );
}

/* ───────────────────────── Client name/email cell ───────────────────────── */
// The global list returns userId; we fetch the friendly name/email lazily from the
// detail callable is overkill per-row, so we read from the users doc via a light
// client read. To avoid N reads we accept the userId and show it; the detail dialog
// shows the resolved name/email. (Kept minimal — name is resolved server-side in the
// row when available via tierName; here we show a short uid hint.)
function ClientCell({ userId }: { userId: string }) {
  return (
    <div>
      <div className="font-medium text-sm">Client</div>
      <div className="text-xs text-muted-foreground font-mono">{userId.slice(0, 10)}…</div>
    </div>
  );
}

/* ───────────────────────── Bulk reprice (preview → confirm) ───────────────────────── */

function RepriceDialog({
  planIds, onClose, onApplied,
}: { planIds: string[]; onClose: () => void; onApplied: () => void }) {
  const [mode, setMode] = useState<RepriceMode>('percent');
  const [value, setValue] = useState('');
  const [preview, setPreview] = useState<RepricePreviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Money-affecting guardrail: repricing changes ONLY the price charged in PayPal.
  // The prices shown to customers come from two other places the admin must update
  // by hand — the marketing pages and the app config (app/src/lib/constants.ts).
  // The Apply button stays disabled until the admin acknowledges this.
  const [ack, setAck] = useState(false);

  const runPreview = async () => {

    setErr('');
    const v = parseFloat(value);
    if (Number.isNaN(v)) return setErr('Enter a numeric value.');
    setBusy(true);
    try {
      setPreview(await repricePlansPreview(planIds, { mode, value: v }));
    } catch (e) {
      setErr((e as Error)?.message || 'Failed to compute preview.');
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    setErr('');
    const v = parseFloat(value);
    setBusy(true);
    try {
      const results = await repricePlansApply(planIds, { mode, value: v });
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        setErr(`${failed.length} plan(s) failed: ${failed.map((f) => f.planId).join(', ')}`);
        return;
      }
      onApplied();
    } catch (e) {
      setErr((e as Error)?.message || 'Failed to apply reprice.');
    } finally {
      setBusy(false);
    }
  };

  const unit = mode === 'percent' ? '%' : '$';
  const help = mode === 'percent'
    ? 'Adjust each selected plan by this percentage (e.g. 10 = +10%, -10 = −10%).'
    : mode === 'amount'
      ? 'Add/subtract this many dollars on each selected plan (e.g. -20).'
      : 'Set every selected plan to this exact dollar amount.';

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk reprice — {planIds.length} plan(s)</DialogTitle>
          <DialogDescription>
            Affects ALL current &amp; future subscribers of these plans. PayPal applies its
            standard consumer-notice timing before changing existing subscribers&apos; price.
          </DialogDescription>
        </DialogHeader>

        {/* Marketing-sync guardrail (Option C). Repricing touches ONLY PayPal — the
            displayed prices live elsewhere and must be updated by hand. */}
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">⚠️ This changes the price charged in PayPal only.</p>
          <p className="mt-1">
            The prices shown to customers are NOT updated by this action. After repricing,
            you must also update them in <span className="font-medium">two</span> places or
            customers will see a different price than they are charged:
          </p>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            <li>the <span className="font-medium">marketing pages</span> (public pricing/site copy), and</li>
            <li>the <span className="font-medium">app config</span> (<code className="font-mono text-xs">app/src/lib/constants.ts</code> — <code className="font-mono text-xs">APP_PRODUCTS</code>).</li>
          </ul>
        </div>

        <div className="flex items-end gap-3">

          <div>
            <label className="text-sm font-medium">Action</label>
            <Select value={mode} onValueChange={(v) => { setMode(v as RepriceMode); setPreview(null); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent (%)</SelectItem>
                <SelectItem value="amount">Amount ($)</SelectItem>
                <SelectItem value="set">Set to ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Value ({unit})</label>
            <Input
              value={value}
              onChange={(e) => { setValue(e.target.value); setPreview(null); }}
              placeholder={mode === 'percent' ? '10' : '200.00'}
              inputMode="decimal"
            />
          </div>
          <Button variant="secondary" onClick={runPreview} disabled={busy}>
            {busy && !preview && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Preview
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{help} A $1.00 floor is enforced.</p>

        {preview && (
          <div className="rounded-md border max-h-72 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Old</TableHead>
                  <TableHead className="text-right">New</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((r) => (
                  <TableRow key={r.planId}>
                    <TableCell>
                      <div className="font-medium">{r.name || r.planId}</div>
                      {r.error && <div className="text-xs text-red-600">{r.error}</div>}
                    </TableCell>
                    <TableCell className="text-right">{fmtCents(r.oldMinor)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtCents(r.newMinor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {err && <p className="text-sm text-red-600">{err}</p>}

        {/* Required acknowledgment before applying (money-affecting action). */}
        <label className="flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm cursor-pointer">
          <Checkbox
            checked={ack}
            onCheckedChange={(c) => setAck(c === true)}
            className="mt-0.5"
          />
          <span>
            I understand the marketing pages and the app config
            (<code className="font-mono text-xs">constants.ts</code>) prices must be updated
            separately to match.
          </span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={apply} disabled={busy || !preview || !ack}>
            {busy && preview && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Apply reprice
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Subscription detail body ───────────────────────── */
function SubscriptionDetailBody({
  detail, plans, onChanged, onListRefresh,
}: { detail: PaypalSubscriptionDetail; plans: PaypalPlanRow[]; onChanged: () => void; onListRefresh: () => void }) {

  const { subscription: s, user: u } = detail;
  // Which action is in flight, so ONLY that button shows its spinner (not all of
  // them). `busy` is derived = any action running (used to disable the others).
  const [busyAction, setBusyAction] = useState<null | 'pause' | 'plan' | 'price' | 'cancel'>(null);
  const busy = busyAction !== null;
  const setBusy = (on: boolean) => { if (!on) setBusyAction(null); };
  const [err, setErr] = useState('');

  const [newPlanId, setNewPlanId] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [msg, setMsg] = useState('');
  // Local optimistic status so Pause/Resume flips the button IN PLACE (no modal
  // re-fetch/flicker). Null until the admin pauses/resumes here; falls back to the
  // live PayPal status from `detail`. The background list refresh keeps the table
  // behind the modal in sync.
  const [statusOverride, setStatusOverride] = useState<string | null>(null);

  const effectiveStatus = statusOverride ?? s.status ?? '';
  const isPaused = effectiveStatus.toUpperCase() === 'SUSPENDED' || effectiveStatus.toLowerCase() === 'paused';


  // Resolve the tier of the CURRENT plan so "Change plan" only offers SAME-tier
  // targets (PayPal /revise rejects cross-product moves). Match by plan id.
  const currentPlan = plans.find((p) => p.planId === s.planId);
  const currentTierId = currentPlan?.tierId || u?.tierId || null;
  const tierName = currentPlan?.tierName || u?.tierName || null;
  const targets = plans.filter(
    (p) => p.status === 'ACTIVE' && p.planId !== s.planId && (!currentTierId || p.tierId === currentTierId)
  );

  const doCancel = async () => {
    if (!u?.userId) return;
    setErr(''); setBusyAction('cancel');
    try {
      await adminCancelSubscription(u.userId, 'Admin console cancel');

      onChanged();
    } catch (e) {
      setErr((e as Error)?.message || 'Failed to cancel.');
    } finally {
      setBusy(false);
    }
  };

  const doPauseResume = async () => {
    if (!u?.userId) return;
    setErr(''); setMsg(''); setBusy(true);
    try {
      if (isPaused) {
        await adminResumeSubscription(u.userId);
        setStatusOverride('ACTIVE');
      } else {
        await adminPauseSubscription(u.userId);
        setStatusOverride('SUSPENDED');
      }
      // Flip the button label IN PLACE via statusOverride (above); silently refresh
      // the table/kebab behind the modal so they stay in sync — no modal flicker.
      onListRefresh();
    } catch (e) {
      setErr((e as Error)?.message || 'Failed to update pause state.');
    } finally {

      setBusy(false);
    }
  };

  const doChangePlan = async () => {
    if (!newPlanId) return setErr('Select a target plan.');
    setErr(''); setBusyAction('plan');
    try {
      await revisePaypalSubscription(s.id, newPlanId);

      onChanged();
    } catch (e) {
      setErr((e as Error)?.message || 'Failed to change plan.');
    } finally {
      setBusy(false);
    }
  };

  const doChangePrice = async () => {
    if (!u?.userId) return;
    const dollars = parseFloat(priceDollars);
    if (!(dollars >= 1)) return setErr('Enter a price of at least $1.00.');
    setErr(''); setMsg(''); setBusy(true);
    try {
      await repriceClientSubscription(u.userId, Math.round(dollars * 100));
      setMsg(`New price $${dollars.toFixed(2)} set — effective at the next billing cycle.`);
    } catch (e) {
      setErr((e as Error)?.message || 'Failed to change price.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tier-first summary. Provider ids are de-emphasized references below. */}
      <div className="grid grid-cols-2 gap-3 text-sm rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
        <div><span className="text-emerald-700/80">Tier</span><div className="font-medium">{tierName || '—'}</div></div>
        <div><span className="text-emerald-700/80">Status</span><div>{s.status || '—'}{u?.cancelAtPeriodEnd ? ' (canceling)' : ''}</div></div>
        <div><span className="text-emerald-700/80">Client</span><div className="font-medium">{u?.name || '—'}</div></div>
        <div><span className="text-emerald-700/80">Email</span><div className="break-all">{u?.email || '—'}</div></div>

        <div><span className="text-emerald-700/80">Start Date</span><div>{fmtIsoLong(s.startTime)}</div></div>
        <div><span className="text-emerald-700/80">Next Billing Date</span><div>{fmtIsoLong(s.nextBillingTime)}</div></div>
        <div><span className="text-emerald-700/80">Last payment</span><div>{fmtCents(s.lastPaymentAmountMinor)} · {fmtIso(s.lastPaymentTime)}</div></div>
      </div>


      {/* Provider references (read-only) */}
      <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div>
          <span className="block text-gray-500">Provider plan id</span>
          <span className="font-mono text-gray-700">{s.planId || '—'}</span>
        </div>
        <div>
          <span className="block text-gray-500">Provider subscription id</span>
          <span className="font-mono text-gray-700">{s.id}</span>
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <div>
          <label className="text-sm font-medium">Change plan (same tier)</label>
          <div className="flex gap-2 mt-1">
            <Select value={newPlanId} onValueChange={setNewPlanId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder={targets.length ? 'Select target plan' : 'No other same-tier plans'} /></SelectTrigger>
              <SelectContent>
                {targets.map((p) => (
                  <SelectItem key={p.planId} value={p.planId}>
                    {p.name} — {fmtCents(p.amountMinor)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={doChangePlan} disabled={busy || !newPlanId}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Apply
            </Button>

          </div>
          <p className="text-xs text-muted-foreground mt-1">
            PayPal only allows moving to another plan in the SAME tier. Cross-tier moves
            require cancel + re-subscribe.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Change price (this subscriber)</label>
          <div className="flex gap-2 mt-1">
            <Input
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              placeholder="175.00"
              inputMode="decimal"
              className="flex-1"
            />
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={doChangePrice} disabled={busy || !u?.userId}>
              {busyAction === 'price' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Apply
            </Button>


          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Sets a custom recurring price for THIS subscriber only (PayPal inline override).
            Takes effect at the next billing cycle. $1.00 minimum.
          </p>
        </div>

        {msg && <p className="text-sm text-green-700">{msg}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            onClick={doPauseResume}
            disabled={busy || !u?.userId}
          >
            {busyAction === 'pause' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isPaused ? 'Resume subscription' : 'Pause subscription'}
          </Button>


          <Button variant="destructive" onClick={doCancel} disabled={busy || !u?.userId || u?.cancelAtPeriodEnd}>
            {u?.cancelAtPeriodEnd ? 'Already canceling' : 'Cancel at period end'}
          </Button>
        </div>
      </div>
    </div>
  );
}



