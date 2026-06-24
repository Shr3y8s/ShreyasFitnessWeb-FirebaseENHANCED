'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { redirectToCheckoutForTier } from '@/lib/constants';
import { signOutUser, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { getPaymentProvider } from '@/lib/payments';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  CreditCard, 
  Receipt, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertCircle,
  Calendar
} from 'lucide-react';

interface PaymentMethodDetails {
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  link?: {
    email?: string;
  };
}

interface Transaction {
  id: string;
  date: number;
  productName: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  receiptUrl: string | null;
}

export default function BillingPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<PaymentMethodDetails | null>(null);
  const [nextPaymentDate, setNextPaymentDate] = useState<Date | null>(null);
  const [nextPaymentAmount, setNextPaymentAmount] = useState<number | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Capability-driven rendering (design §5). Stripe → hosted portal + stored card;
  // PayPal → neutral history store, no card block, in-app cancel (no portal link).
  const provider = getPaymentProvider();
  const caps = provider.capabilities;


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

    // Check account activation
    if (!userData.accountActivated) {
      console.log('[Billing] Account not activated, redirecting to checkout');
      redirectToCheckoutForTier(router, userData.tier, '/dashboard/client/billing');
      return;
    }

    setLoading(false);
  }, [userData, authLoading, router]);

  // Fetch billing data from Stripe API
  useEffect(() => {
    if (!user || loading) return;

    const fetchBillingData = async () => {
      try {
        setError(null);

        // PayPal (no hosted portal): read neutral billing history from our store.
        if (!caps.hostedPortal) {
          setBillingData({ paypal: true });
          try {
            const history = await provider.getBillingHistory(user.uid);
            const txns: Transaction[] = history.map((t) => ({
              id: t.id,
              date: t.date,
              productName: t.productName || 'Payment',
              description: t.productName || 'Payment',
              amount: t.amount,
              currency: t.currency,
              status: t.status,
              paymentMethod: 'PayPal',
              receiptUrl: t.receiptUrl ?? null,
            }));
            txns.sort((a, b) => b.date - a.date);
            setTransactions(txns);
          } catch (e) {
            console.error('[Billing] PayPal history fetch failed', e);
          }
          return;
        }

        // Get Stripe customer ID from Firestore
        const customerDocRef = doc(db, 'stripe_customers', user.uid);

        const customerDoc = await getDoc(customerDocRef);

        if (!customerDoc.exists()) {
          console.log('[Billing] No Stripe customer found');
          setError('Stripe customer not found. Please contact support.');
          return;
        }

        const customerData = customerDoc.data();
        const customerId = customerData.stripeId;
        
        if (!customerId) {
          console.error('[Billing] No stripeId found in customer document');
          setError('Stripe customer ID not found. Please contact support.');
          return;
        }
        
        setStripeCustomerId(customerId);
        console.log('[Billing] Fetching billing history from Stripe API...');

        // Call the new Cloud Function to get complete billing data
        const getBillingHistory = httpsCallable(functions, 'getBillingHistory');
        const result = await getBillingHistory({ customerId });

        const data = result.data as any;
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch billing history');
        }

        console.log('[Billing] Billing data fetched successfully', {
          invoices: data.invoices?.length || 0,
          subscriptions: data.subscriptions?.length || 0,
        });

        // Debug: Log first invoice payment_intent structure
        if (data.invoices?.[0]) {
          console.log('[Billing] First invoice payment_intent structure:', {
            id: data.invoices[0].id,
            payment_intent: data.invoices[0].payment_intent,
            latest_charge: data.invoices[0].payment_intent?.latest_charge,
            payment_method_details: data.invoices[0].payment_intent?.latest_charge?.payment_method_details,
          });
        }

        setBillingData(data);

        // Extract current payment method - handle different payment method types
        let paymentMethod = null;
        if (data.currentPaymentMethod) {
          paymentMethod = data.currentPaymentMethod;
        } else if (data.subscriptions?.[0]?.default_payment_method) {
          paymentMethod = data.subscriptions[0].default_payment_method;
        }
        
        // Set payment method regardless of type (card, link, etc.)
        if (paymentMethod) {
          setCurrentPaymentMethod(paymentMethod);
        }

        // Extract next payment info from active subscription
        if (data.subscriptions?.[0]) {
          const sub = data.subscriptions[0];
          if (sub.current_period_end) {
            setNextPaymentDate(new Date(sub.current_period_end * 1000));
          }
          // Calculate next payment amount from subscription items
          const amount = sub.items?.data?.reduce((sum: number, item: any) => {
            return sum + (item.price?.unit_amount || 0);
          }, 0);
          setNextPaymentAmount(amount);
        }

        // Process transactions - invoices contain all payment data
        const allTransactions: Transaction[] = [];

        // Process invoices only (they contain complete payment information)
        if (data.invoices) {
          data.invoices.forEach((invoice: any) => {
            // Get payment method details from payment_intent.latest_charge
            const paymentMethodDetails = invoice.payment_intent?.latest_charge?.payment_method_details;
            let pmDisplay = 'Payment method';
            
            // Handle different payment method types
            if (paymentMethodDetails?.card) {
              const brand = paymentMethodDetails.card.brand;
              const last4 = paymentMethodDetails.card.last4;
              pmDisplay = `${brand.charAt(0).toUpperCase() + brand.slice(1)} •••• ${last4}`;
            } else if (paymentMethodDetails?.link) {
              // Link payment - show country since email isn't available in charge details
              const country = paymentMethodDetails.link.country;
              pmDisplay = country ? `Link (${country})` : 'Link';
            } else if (paymentMethodDetails?.type) {
              pmDisplay = paymentMethodDetails.type.charAt(0).toUpperCase() + 
                          paymentMethodDetails.type.slice(1);
            }

            // Extract product name from metadata (preferred) or description
            let productName = 'Subscription';
            if (invoice.lines?.data && invoice.lines.data.length > 0) {
              const lineItem = invoice.lines.data[0];
              productName = lineItem.metadata?.tierName || lineItem.description || 'Subscription';
            }

            // Determine activity type
            let activity = 'Subscription Payment';
            if (invoice.billing_reason === 'subscription_create') {
              activity = 'Subscription Created';
            } else if (invoice.billing_reason === 'subscription_cycle') {
              activity = 'Subscription Payment';
            } else if (invoice.billing_reason === 'subscription_update') {
              activity = 'Subscription Updated';
            } else if (invoice.description) {
              activity = invoice.description;
            }

            allTransactions.push({
              id: invoice.id,
              date: invoice.created,
              productName: productName,
              description: activity,
              amount: invoice.amount_paid,
              currency: invoice.currency,
              status: invoice.status,
              paymentMethod: pmDisplay,
              receiptUrl: invoice.hosted_invoice_url || invoice.invoice_pdf,
            });
          });
        }

        // Sort by date (newest first)
        allTransactions.sort((a, b) => b.date - a.date);
        
        setTransactions(allTransactions);
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

  const handleUpdatePaymentMethod = async () => {
    if (!stripeCustomerId) {
      setError('Unable to load payment portal. Please try again.');
      return;
    }

    setLoadingPortal(true);
    setError(null);

    try {
      const provider = getPaymentProvider();
      if (!provider.openBillingPortal) {
        throw new Error('Billing portal is not available for this provider');
      }
      const url = await provider.openBillingPortal({
        customerId: stripeCustomerId,
        returnUrl: `${window.location.origin}/dashboard/client/billing`,
        restricted: true,
      });

      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Failed to create portal session');
      }
    } catch (error) {
      console.error('[Billing] Error opening payment method portal:', error);
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateTime = (timestamp: number) => {
    const date = formatDate(timestamp);
    const time = formatTime(timestamp);
    return { date, time };
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
      case 'paid':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'pending':
      case 'processing':
        return <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />;
      case 'failed':
      case 'canceled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
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
        userProfilePhoto={userData?.profilePhotoSmall ?? undefined}

        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Billing & Payment</h1>
              <p className="text-muted-foreground mt-2">
                Manage your payment method and view transaction history
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

            {/* Current Payment Method Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Current Payment Method
                </CardTitle>
                <CardDescription>
                  This payment method will be used for upcoming charges
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!caps.showsStoredCard ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                      <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <CreditCard className="w-8 h-8 text-gray-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg text-foreground">Paid with PayPal</p>
                        <p className="text-sm text-muted-foreground">
                          Your PayPal account funds your purchases. Manage your funding source in PayPal.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : currentPaymentMethod ? (

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <CreditCard className="w-8 h-8 text-gray-700" />
                        </div>
                        <div>
                          {currentPaymentMethod.type === 'card' && currentPaymentMethod.card ? (
                            <>
                              <p className="font-semibold text-lg text-foreground">
                                {currentPaymentMethod.card.brand.charAt(0).toUpperCase() + 
                                 currentPaymentMethod.card.brand.slice(1)} •••• {currentPaymentMethod.card.last4}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Expires {currentPaymentMethod.card.exp_month.toString().padStart(2, '0')}/
                                {currentPaymentMethod.card.exp_year}
                              </p>
                            </>
                          ) : currentPaymentMethod.type === 'link' && currentPaymentMethod.link ? (
                            <>
                              <p className="font-semibold text-lg text-foreground">Link</p>
                              <p className="text-sm text-muted-foreground">
                                {currentPaymentMethod.link.email || 'Email-based payment'}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-lg text-foreground">
                                {currentPaymentMethod.type ? 
                                  currentPaymentMethod.type.charAt(0).toUpperCase() + currentPaymentMethod.type.slice(1) : 
                                  'Payment Method'}
                              </p>
                              <p className="text-sm text-muted-foreground">Active payment method</p>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleUpdatePaymentMethod}
                        disabled={loadingPortal || !stripeCustomerId}
                        className="px-6 py-2.5 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors font-medium"
                      >
                        {loadingPortal ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Opening...</span>
                          </>
                        ) : (
                          <>
                            <span>Update Payment Method</span>
                            <ExternalLink className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                    
                    {nextPaymentDate && nextPaymentAmount && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <p className="text-sm text-blue-900">
                          <span className="font-medium">Next payment:</span>{' '}
                          {formatCurrency(nextPaymentAmount)} on {formatDate(Math.floor(nextPaymentDate.getTime() / 1000))}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No payment method on file</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Add a payment method to ensure uninterrupted service
                    </p>
                  </div>
                )}
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
                  Complete history of all your transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!billingData ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600 font-medium">Loading payment history...</p>
                  </div>
                ) : transactions.length === 0 ? (
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
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Date & Time</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Product</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Activity</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Amount</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Payment Method</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="pb-3 text-sm font-medium text-muted-foreground">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transactions.map((transaction) => {
                          const { date, time } = formatDateTime(transaction.date);
                          return (
                            <tr key={transaction.id} className="hover:bg-gray-50">
                              <td className="py-4 pr-4 text-sm text-foreground">
                                <div className="font-medium">{date}</div>
                                <div className="text-xs text-muted-foreground">{time}</div>
                              </td>
                              <td className="py-4 pr-4 text-sm text-foreground font-medium">
                                {transaction.productName}
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help Banner */}
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
                      <a href="mailto:billing@shrey.fit" className="font-medium underline hover:text-blue-700">
                        billing@shrey.fit
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
