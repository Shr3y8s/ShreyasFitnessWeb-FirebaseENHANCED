'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  CreditCard, 
  Receipt, 
  Download, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertCircle
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: any;
  description?: string;
  payment_method_details?: {
    type: string;
    card?: {
      brand: string;
      last4: string;
    };
  };
  charges?: {
    data: Array<{
      receipt_url?: string;
    }>;
  };
}

interface Invoice {
  id: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  created: any;
  invoice_pdf?: string;
  hosted_invoice_url?: string;
  description?: string;
  period_start?: any;
  period_end?: any;
}

export default function BillingPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!userData) {
      console.log('[Billing] No user data, redirecting to login');
      router.push('/login');
      return;
    }

    // Only clients should access billing
    if (userData.role !== 'client') {
      console.log('[Billing] User is not a client, redirecting');
      if (userData.role === 'trainer' || userData.role === 'admin') {
        router.push('/dashboard/trainer');
      } else {
        router.push('/dashboard');
      }
      return;
    }

    // Check payment status
    if (userData.paymentStatus !== 'active') {
      console.log('[Billing] Payment not complete, redirecting to payment');
      router.push('/payment');
      return;
    }

    setLoading(false);
  }, [userData, authLoading, router]);

  // Fetch payment and invoice data
  useEffect(() => {
    if (!user || loading) return;

    const fetchBillingData = async () => {
      try {
        // Get Stripe customer ID
        const customerDoc = await getDocs(
          query(collection(db, 'stripe_customers'), where('__name__', '==', user.uid))
        );

        if (customerDoc.empty) {
          console.log('[Billing] No Stripe customer found');
          return;
        }

        // Get the stripeId field from the document data, not the document ID
        const customerData = customerDoc.docs[0].data();
        const customerId = customerData.stripeId;
        
        if (!customerId) {
          console.error('[Billing] No stripeId found in customer document');
          setError('Stripe customer ID not found. Please contact support.');
          return;
        }
        
        setStripeCustomerId(customerId);
        console.log('[Billing] Stripe customer ID loaded:', customerId);

        // Fetch payments (one-time charges) - only succeeded payments
        const paymentsQuery = query(
          collection(db, `stripe_customers/${user.uid}/payments`),
          where('status', '==', 'succeeded'),
          orderBy('created', 'desc'),
          limit(50)
        );

        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsData = paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Payment[];

        setPayments(paymentsData);

        // Fetch invoices (from subscriptions)
        const subscriptionsSnapshot = await getDocs(
          collection(db, `stripe_customers/${user.uid}/subscriptions`)
        );

        const allInvoices: Invoice[] = [];

        for (const subDoc of subscriptionsSnapshot.docs) {
          const invoicesQuery = query(
            collection(db, `stripe_customers/${user.uid}/subscriptions/${subDoc.id}/invoices`),
            orderBy('created', 'desc'),
            limit(50)
          );

          const invoicesSnapshot = await getDocs(invoicesQuery);
          const invoicesData = invoicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Invoice[];

          allInvoices.push(...invoicesData);
        }

        // Sort all invoices by date
        allInvoices.sort((a, b) => {
          const aTime = a.created?.seconds || 0;
          const bTime = b.created?.seconds || 0;
          return bTime - aTime;
        });

        setInvoices(allInvoices);
      } catch (error) {
        console.error('[Billing] Error fetching billing data:', error);
        setError('Failed to load billing information. Please try again.');
      }
    };

    fetchBillingData();
  }, [user, loading]);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleManagePaymentMethods = async () => {
    if (!stripeCustomerId) {
      setError('Unable to load payment portal. Please try again.');
      return;
    }

    setLoadingPortal(true);
    setError(null);

    try {
      const createPortalSession = httpsCallable(functions, 'createPortalSession');
      const result = await createPortalSession({
        customerId: stripeCustomerId,
        return_url: `${window.location.origin}/dashboard/client/billing`,
      });

      const data = result.data as { success: boolean; url: string };

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create portal session');
      }
    } catch (error) {
      console.error('[Billing] Error opening customer portal:', error);
      setError('Failed to open payment portal. Please try again.');
    } finally {
      setLoadingPortal(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    // Handle different timestamp formats
    let date: Date;
    if (typeof timestamp === 'number') {
      // Plain number: assume Unix timestamp in seconds (from Stripe webhooks)
      date = new Date(timestamp * 1000);
    } else if (timestamp?.seconds) {
      // Firestore Timestamp object
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Fallback: try to convert directly
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'paid':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
      case 'canceled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'paid':
        return `${baseClasses} bg-green-100 text-green-700`;
      case 'pending':
      case 'processing':
        return `${baseClasses} bg-yellow-100 text-yellow-700`;
      case 'failed':
      case 'canceled':
        return `${baseClasses} bg-red-100 text-red-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
    }
  };

  const getPaymentMethodDisplay = (payment: Payment) => {
    if (payment.payment_method_details?.card) {
      const { brand, last4 } = payment.payment_method_details.card;
      return `${brand.charAt(0).toUpperCase() + brand.slice(1)} •••• ${last4}`;
    }
    return payment.payment_method_details?.type || 'Card';
  };

  const getReceiptUrl = (payment: Payment) => {
    // Try to get receipt URL from charges
    if (payment.charges?.data && payment.charges.data.length > 0) {
      return payment.charges.data[0].receipt_url || null;
    }
    return null;
  };

  // Combine payments and invoices for a unified history
  const allTransactions = [
    ...payments.map(p => ({
      id: p.id,
      date: p.created,
      description: p.description || 'One-time payment',
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      type: 'payment' as const,
      paymentMethod: getPaymentMethodDisplay(p),
      receiptUrl: getReceiptUrl(p),
    })),
    ...invoices.map(i => ({
      id: i.id,
      date: i.created,
      description: i.description || 'Subscription payment',
      amount: i.amount_paid,
      currency: i.currency,
      status: i.status,
      type: 'invoice' as const,
      paymentMethod: 'Card',
      receiptUrl: i.hosted_invoice_url || i.invoice_pdf || null,
    })),
  ].sort((a, b) => {
    const aTime = a.date?.seconds || 0;
    const bTime = b.date?.seconds || 0;
    return bTime - aTime;
  });

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading billing information...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Billing & Payment History</h1>
              <p className="text-muted-foreground mt-2">
                Manage your payment methods and view transaction history
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Payment Methods Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Manage your payment methods and billing information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Stripe Customer Portal</p>
                      <p className="text-sm text-muted-foreground">
                        Update payment methods, view invoices, and manage billing
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleManagePaymentMethods}
                    disabled={loadingPortal || !stripeCustomerId}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    {loadingPortal ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening...</span>
                      </>
                    ) : (
                      <>
                        <span>Manage</span>
                        <ExternalLink className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-3 px-4">
                  You'll be redirected to Stripe's secure portal to manage your payment information
                </p>
              </CardContent>
            </Card>

            {/* Payment History Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Payment History
                </CardTitle>
                <CardDescription>
                  View all your payments and download invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No payment history yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Your payment transactions will appear here
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Date</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Description</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Amount</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Payment Method</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="pb-3 text-sm font-medium text-muted-foreground">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {allTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="py-4 pr-4 text-sm text-foreground">
                              {formatDate(transaction.date)}
                            </td>
                            <td className="py-4 pr-4 text-sm text-foreground">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(transaction.status)}
                                <span>{transaction.description}</span>
                              </div>
                            </td>
                            <td className="py-4 pr-4 text-sm font-medium text-foreground">
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </td>
                            <td className="py-4 pr-4 text-sm text-muted-foreground">
                              {transaction.paymentMethod}
                            </td>
                            <td className="py-4 pr-4">
                              <span className={getStatusBadge(transaction.status)}>
                                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-4">
                              {transaction.receiptUrl ? (
                                <a
                                  href={transaction.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>View</span>
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Banner */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Need help with billing?</p>
                    <p>
                      Contact your coach through the{' '}
                      <a href="/dashboard/client/messages" className="font-medium underline hover:text-blue-700">
                        Coach Inbox
                      </a>
                      {' '}or email us at{' '}
                      <a href="mailto:shreyas.annapureddy@gmail.com" className="font-medium underline hover:text-blue-700">
                        shreyas.annapureddy@gmail.com
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
