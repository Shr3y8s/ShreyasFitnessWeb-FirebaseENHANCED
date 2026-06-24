'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { getPaymentProvider } from '@/lib/payments';
import type { RevenueMetrics, AdminTransaction } from '@/lib/payments/types';
import {
  DollarSign,
  Users,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface RevenueByTier {
  tierName: string;
  revenue: number; // dollars
  count: number;
  percentage: number;
  color: string;
}

export default function AdminRevenuePage() {
  const router = useRouter();
  const { user, canAccessAdminDashboard } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mrr, setMrr] = useState(0); // dollars
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [revenueByTier, setRevenueByTier] = useState<RevenueByTier[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<AdminTransaction[]>([]);
  const [subscriptionRevenue, setSubscriptionRevenue] = useState(0); // dollars, last N txns
  const [oneTimeRevenue, setOneTimeRevenue] = useState(0); // dollars, last N txns

  // Provider-neutral: all analytics + the external dashboard URL come from the
  // active payment provider's adapter. The page does ZERO provider-specific
  // Firestore reads. Providers without analytics (capabilities.adminAnalytics)
  // simply yield empty states.
  const provider = getPaymentProvider();
  const supportsAnalytics =
    !!provider.capabilities.adminAnalytics &&
    typeof provider.getRevenueMetrics === 'function' &&
    typeof provider.getRecentTransactions === 'function';
  const paymentsDashboardUrl =
    provider.capabilities.externalAdminDashboard && provider.getAdminDashboardUrl
      ? provider.getAdminDashboardUrl()
      : null;

  useEffect(() => {
    if (!user || !canAccessAdminDashboard) {
      router.push('/dashboard/trainer');
      return;
    }
    loadBusinessData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAccessAdminDashboard, router]);

  const loadBusinessData = async () => {
    try {
      if (!supportsAnalytics) return;

      const [metrics, txns]: [RevenueMetrics, AdminTransaction[]] = await Promise.all([
        provider.getRevenueMetrics!(),
        provider.getRecentTransactions!(10),
      ]);

      // Metrics are in minor units; convert to dollars for display.
      const mrrDollars = metrics.mrr / 100;
      setMrr(mrrDollars);
      setActiveSubscriptions(metrics.activeSubscriptions);

      const colors = ['#059669', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
      setRevenueByTier(
        metrics.revenueByTier.map((t, i) => ({
          tierName: t.tierName,
          revenue: t.revenueMonthly / 100,
          count: t.count,
          percentage: metrics.mrr > 0 ? (t.revenueMonthly / metrics.mrr) * 100 : 0,
          color: colors[i % colors.length],
        }))
      );

      setRecentTransactions(txns);
      // Split recent revenue by type (subscription renewal vs one-time purchase).
      let subTotal = 0;
      let oneTimeTotal = 0;
      txns.forEach((t) => {
        if (t.status === 'refunded') return;
        if (t.type === 'subscription') subTotal += t.amount;
        else oneTimeTotal += t.amount;
      });
      setSubscriptionRevenue(subTotal / 100);
      setOneTimeRevenue(oneTimeTotal / 100);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fmtCurrency = (amount: number, currency = 'usd') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);

  const fmtDate = (epochSeconds: number) =>
    new Date(epochSeconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Loading revenue data...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar currentPage="revenue" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Revenue & Billing</h1>
              <p className="text-gray-600 mt-2">
                Monitor revenue, subscriptions, and payment activity
              </p>
            </div>

            {!supportsAnalytics && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-900">
                  Revenue analytics are not available for the current payment provider.
                </p>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-100 rounded-full">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Monthly Recurring Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">${mrr.toFixed(0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Active subscriptions only</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Subscriptions</p>
                  <p className="text-3xl font-bold text-gray-900">{activeSubscriptions}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    ${(mrr / Math.max(activeSubscriptions, 1)).toFixed(0)} avg/month
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-100 rounded-full">
                    <CheckCircle2 className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Subscription Payments</p>
                  <p className="text-3xl font-bold text-gray-900">${subscriptionRevenue.toFixed(0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Last 10 transactions</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">One-Time Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">${oneTimeRevenue.toFixed(0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Last 10 transactions</p>
                </div>
              </div>
            </div>

            {/* Revenue by Tier */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Tier</h3>
              {revenueByTier.length > 0 ? (
                <div className="space-y-4">
                  {revenueByTier.map((tier) => (
                    <div key={tier.tierName}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">{tier.tierName}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${tier.revenue.toFixed(0)}/mo ({tier.count})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${tier.percentage}%`, backgroundColor: tier.color }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{tier.percentage.toFixed(1)}% of MRR</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No subscription data yet</p>
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl border">
              <div className="p-6 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                  <p className="text-sm text-gray-600 mt-1">Last 10 payments</p>
                </div>
                {paymentsDashboardUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(paymentsDashboardUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                )}
              </div>

              {recentTransactions.length > 0 ? (
                <div className="divide-y">
                  {recentTransactions.map((t) => (
                    <div key={t.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${t.status === 'refunded' ? 'bg-red-100' : 'bg-green-100'}`}>
                            <CheckCircle2 className={`h-5 w-5 ${t.status === 'refunded' ? 'text-red-600' : 'text-green-600'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {fmtCurrency(t.amount / 100, t.currency)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {fmtDate(t.date)} • {t.productName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-700">
                            {t.type === 'subscription' ? 'Subscription' : 'One-time'}
                          </span>
                          <span
                            className={`px-3 py-1 text-sm rounded-full font-medium ${
                              t.status === 'refunded'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {t.status === 'refunded' ? 'Refunded' : 'Paid'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentsDashboardUrl && (
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4 flex-col items-start bg-white"
                    onClick={() => window.open(paymentsDashboardUrl, '_blank')}
                  >
                    <ExternalLink className="h-5 w-5 mb-2 text-blue-600" />
                    <span className="font-semibold">Payments Dashboard</span>
                    <span className="text-sm opacity-80 mt-1">Manage payments & refunds</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="justify-start h-auto p-4 flex-col items-start bg-white"
                  onClick={() => router.push('/dashboard/admin/pending-accounts')}
                >
                  <Clock className="h-5 w-5 mb-2 text-orange-600" />
                  <span className="font-semibold">Pending Accounts</span>
                  <span className="text-sm opacity-80 mt-1">Review unpaid accounts</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
