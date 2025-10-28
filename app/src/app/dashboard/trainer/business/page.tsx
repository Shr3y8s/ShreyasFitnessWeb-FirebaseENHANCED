'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { 
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar
} from 'lucide-react';
import { formatCurrency, getProductDetails } from '@/lib/stripe';

interface SubscriptionData {
  id: string;
  userId: string;
  status: string;
  amount: number;
  interval: 'month' | 'year';
  currentPeriodEnd: Date;
  created: Date;
  priceId: string;
}

interface PaymentData {
  id: string;
  userId: string;
  amount: number;
  status: string;
  created: Date;
  paymentMethod?: string;
}

interface InvoiceData {
  id: string;
  userId: string;
  amount: number;
  status: string;
  created: Date;
  attemptCount?: number;
}

interface RevenueByTier {
  tierName: string;
  revenue: number;
  count: number;
  percentage: number;
  color: string;
}

export default function BusinessOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mrr, setMrr] = useState(0);
  const [lastMonthMrr, setLastMonthMrr] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState<SubscriptionData[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentData[]>([]);
  const [failedInvoices, setFailedInvoices] = useState<InvoiceData[]>([]);
  const [revenueByTier, setRevenueByTier] = useState<RevenueByTier[]>([]);
  const [oneTimeRevenue, setOneTimeRevenue] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadBusinessData();
  }, [user, router]);

  const loadBusinessData = async () => {
    try {
      // Load all data in parallel
      await Promise.all([
        loadSubscriptions(),
        loadPayments(),
        loadInvoices()
      ]);
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const subsQuery = query(
        collectionGroup(db, 'subscriptions'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(subsQuery);
      const subs: SubscriptionData[] = [];
      let totalMrr = 0;
      const tierRevenue: Map<string, { revenue: number; count: number }> = new Map();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const userId = doc.ref.parent.parent?.id || 'unknown';
        
        // Extract subscription data
        if (data.items && data.items.length > 0) {
          data.items.forEach((item: any) => {
            const amount = (item.price?.unit_amount || 0) / 100;
            const interval = item.price?.recurring?.interval || 'month';
            
            // Normalize to monthly for MRR
            let monthlyAmount = amount;
            if (interval === 'year') {
              monthlyAmount = amount / 12;
            }
            
            totalMrr += monthlyAmount;
            
            // Try to determine tier from metadata or price
            const tierName = data.metadata?.tierName || item.price?.product?.name || 'Unknown Plan';
            const existing = tierRevenue.get(tierName) || { revenue: 0, count: 0 };
            tierRevenue.set(tierName, {
              revenue: existing.revenue + monthlyAmount,
              count: existing.count + 1
            });
            
            subs.push({
              id: doc.id,
              userId,
              status: data.status,
              amount: monthlyAmount,
              interval,
              currentPeriodEnd: data.current_period_end?.toDate() || new Date(),
              created: data.created?.toDate() || new Date(),
              priceId: item.price?.id || ''
            });
          });
        }
      });

      setMrr(totalMrr);
      setActiveSubscriptions(subs);
      
      // Calculate revenue by tier percentages
      const tierData: RevenueByTier[] = [];
      const colors = ['#059669', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
      let colorIndex = 0;
      
      tierRevenue.forEach((data, tierName) => {
        tierData.push({
          tierName,
          revenue: data.revenue,
          count: data.count,
          percentage: totalMrr > 0 ? (data.revenue / totalMrr) * 100 : 0,
          color: colors[colorIndex % colors.length]
        });
        colorIndex++;
      });
      
      setRevenueByTier(tierData.sort((a, b) => b.revenue - a.revenue));
      
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const loadPayments = async () => {
    try {
      const paymentsQuery = query(
        collectionGroup(db, 'payments'),
        where('status', '==', 'succeeded'),
        orderBy('created', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(paymentsQuery);
      const payments: PaymentData[] = [];
      let oneTimeTotal = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const userId = doc.ref.parent.parent?.id || 'unknown';
        const amount = (data.amount || 0) / 100;
        
        // Handle created field - Stripe Extension stores as Unix timestamp (number)
        let createdDate = new Date();
        if (data.created) {
          if (typeof data.created === 'number') {
            createdDate = new Date(data.created * 1000); // Convert seconds to milliseconds
          } else if (data.created.toDate) {
            createdDate = data.created.toDate();
          }
        }
        
        payments.push({
          id: doc.id,
          userId,
          amount,
          status: data.status,
          created: createdDate,
          paymentMethod: data.payment_method_details?.type || 'card'
        });
        
        // Track one-time payments (not subscriptions)
        if (!data.invoice) {
          oneTimeTotal += amount;
        }
      });

      setRecentPayments(payments);
      setOneTimeRevenue(oneTimeTotal);
      
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const invoicesQuery = query(
        collectionGroup(db, 'invoices'),
        where('status', 'in', ['open', 'uncollectible']),
        orderBy('created', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(invoicesQuery);
      const invoices: InvoiceData[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const userId = doc.ref.parent.parent?.id || 'unknown';
        
        invoices.push({
          id: doc.id,
          userId,
          amount: (data.amount_due || 0) / 100,
          status: data.status,
          created: data.created?.toDate() || new Date(),
          attemptCount: data.attempt_count || 0
        });
      });

      setFailedInvoices(invoices);
      
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const mrrChange = lastMonthMrr > 0 ? ((mrr - lastMonthMrr) / lastMonthMrr) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Loading business metrics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <TrainerSidebar currentPage="business" />

      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Overview</h1>
            <p className="text-gray-600 mt-2">
              Monitor revenue, subscriptions, and payment activity
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* MRR Card */}
            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                {mrrChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    mrrChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {mrrChange > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {Math.abs(mrrChange).toFixed(1)}%
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Monthly Recurring Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${mrr.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Active subscriptions only</p>
              </div>
            </div>

            {/* Active Subscriptions */}
            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Subscriptions</p>
                <p className="text-3xl font-bold text-gray-900">
                  {activeSubscriptions.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ${(mrr / Math.max(activeSubscriptions.length, 1)).toFixed(0)} avg/month
                </p>
              </div>
            </div>

            {/* One-Time Revenue */}
            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">One-Time Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${oneTimeRevenue.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Last 10 transactions</p>
              </div>
            </div>

            {/* Failed Payments */}
            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-full ${
                  failedInvoices.length > 0 ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <AlertCircle className={`h-6 w-6 ${
                    failedInvoices.length > 0 ? 'text-red-600' : 'text-gray-400'
                  }`} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Failed Payments</p>
                <p className="text-3xl font-bold text-gray-900">
                  {failedInvoices.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Requires attention
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown & Recent Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Tier */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Revenue by Tier
              </h3>
              {revenueByTier.length > 0 ? (
                <div className="space-y-4">
                  {revenueByTier.map((tier) => (
                    <div key={tier.tierName}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {tier.tierName}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${tier.revenue.toFixed(0)}/mo ({tier.count})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${tier.percentage}%`,
                            backgroundColor: tier.color
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {tier.percentage.toFixed(1)}% of MRR
                      </p>
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

            {/* Failed Payments Alert */}
            {failedInvoices.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Failed Payments
                    </h3>
                    <p className="text-sm text-gray-600">
                      {failedInvoices.length} payment{failedInvoices.length !== 1 ? 's' : ''} require{failedInvoices.length === 1 ? 's' : ''} attention
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {failedInvoices.slice(0, 3).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          ${invoice.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {invoice.created.toLocaleDateString()} • Attempt #{invoice.attemptCount || 1}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://dashboard.stripe.com/invoices/${invoice.id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => window.open('https://dashboard.stripe.com/invoices?status=open', '_blank')}
                >
                  View All in Stripe Dashboard
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl border">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                <p className="text-sm text-gray-600 mt-1">Last 10 successful payments</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://dashboard.stripe.com/payments', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>

            {recentPayments.length > 0 ? (
              <div className="divide-y">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-full">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            ${payment.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {payment.created.toLocaleDateString()} • {payment.paymentMethod}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                          Paid
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://dashboard.stripe.com/payments/${payment.id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
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
              <Button
                variant="outline"
                className="justify-start h-auto p-4 flex-col items-start bg-white"
                onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
              >
                <ExternalLink className="h-5 w-5 mb-2 text-blue-600" />
                <span className="font-semibold">Stripe Dashboard</span>
                <span className="text-sm opacity-80 mt-1">Manage payments & refunds</span>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto p-4 flex-col items-start bg-white"
                onClick={() => router.push('/dashboard/trainer/pending-accounts')}
              >
                <Clock className="h-5 w-5 mb-2 text-orange-600" />
                <span className="font-semibold">Pending Accounts</span>
                <span className="text-sm opacity-80 mt-1">Review unpaid accounts</span>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto p-4 flex-col items-start bg-white"
                onClick={() => window.open('https://dashboard.stripe.com/reports', '_blank')}
              >
                <Calendar className="h-5 w-5 mb-2 text-purple-600" />
                <span className="font-semibold">Financial Reports</span>
                <span className="text-sm opacity-80 mt-1">Export data & analytics</span>
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-gray-50 border rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-2">💡 About This Dashboard</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• <strong>MRR:</strong> Monthly Recurring Revenue from active subscriptions only</li>
              <li>• <strong>Refunds:</strong> Click "View in Stripe Dashboard" to process refunds securely</li>
              <li>• <strong>Failed Payments:</strong> Stripe automatically retries failed payments</li>
              <li>• <strong>Real-time Data:</strong> Synced automatically from Stripe via Firebase Extension</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
