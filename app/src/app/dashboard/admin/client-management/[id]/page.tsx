'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2,
  Trash2, 
  UserCog, 
  Info as InfoIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/Breadcrumb';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { deleteAccount, DeletionMode, DeletionStep, DeleteAccountResponse } from '@/lib/admin-api';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Link from 'next/link';

interface Client {
  uid: string;
  name: string;
  email: string;
  createdAt: any;
  subscriptionStatus?: string;
  subscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
}

const MODE_DESCRIPTIONS: Record<DeletionMode, { title: string; description: string; warning: string }> = {
  'mock': {
    title: 'Mock (Preview Only)',
    description: 'Preview what would be deleted without making any changes.',
    warning: 'No actual deletion occurs. Safe for testing.'
  },
  'no-traces': {
    title: 'No-Traces (Complete Removal)',
    description: 'Completely remove ALL traces including financial records.',
    warning: '⚠️ DANGEROUS: Use only for test accounts.'
  },
  'gdpr-clean': {
    title: 'GDPR-Clean (Preserve Financials)',
    description: 'Remove personal data but preserve financial records.',
    warning: 'Financial records preserved for legal compliance.'
  }
};

function StepStatusIcon({ status }: { status: DeletionStep['status'] }) {
  switch (status) {
    case 'complete':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'skipped':
      return <InfoIcon className="w-4 h-4 text-gray-400" />;
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
  }
}

function StepDetail({ step }: { step: DeletionStep }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
        <StepStatusIcon status={step.status} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <h4 className="font-medium text-sm">{step.name}</h4>
              <span className="text-xs text-muted-foreground">
                ({step.itemsFound} found{step.status === 'complete' ? `, ${step.itemsDeleted} deleted` : ''})
              </span>
            </div>
            
            {step.sampleItems && step.sampleItems.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <ChevronRight className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground mt-0.5">
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{step.collection}</code>
          </div>
          
          {step.error && (
            <Alert variant="destructive" className="mt-1">
              <AlertDescription className="text-xs">{step.error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
      
      {step.sampleItems && step.sampleItems.length > 0 && (
        <CollapsibleContent>
          <div className="ml-9 mt-1 p-2 bg-gray-50 rounded text-xs">
            <p className="font-medium text-gray-700 mb-1">Sample items:</p>
            <ul className="space-y-0.5">
              {step.sampleItems.slice(0, 5).map((item, idx) => (
                <li key={idx} className="text-gray-600 font-mono text-xs truncate">
                  • {item}
                </li>
              ))}
              {step.sampleItems.length > 5 && (
                <li className="text-gray-500">... and {step.sampleItems.length - 5} more</li>
              )}
            </ul>
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default function ClientManagementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('delete');
  
  // Delete tab state
  const [deletionMode, setDeletionMode] = useState<DeletionMode>('mock');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeleteAccountResponse | null>(null);

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const clientDoc = await getDoc(doc(db, 'users', clientId));
      
      if (clientDoc.exists()) {
        setClient({
          uid: clientDoc.id,
          ...clientDoc.data(),
        } as Client);
      } else {
        setError('Client not found');
      }
    } catch (err) {
      console.error('Error fetching client:', err);
      setError('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;

    // Validations only for real deletions (not mock mode)
    if (deletionMode !== 'mock') {
      if (emailConfirmation !== client.email) {
        setError('Email does not match. Please type the exact email address.');
        return;
      }

      if (!reason.trim()) {
        setError('Please provide a reason for deletion.');
        return;
      }

      if (!understood) {
        setError('You must confirm that you understand this action is permanent.');
        return;
      }
    }

    setError(null);
    setIsProcessing(true);

    try {
      const response = await deleteAccount({
        targetUserId: client.uid,
        mode: deletionMode,
        adminOverride: false,
        reason: reason.trim(),
      });

      setResult(response);
      setIsProcessing(false);
      
      // No auto-redirect - let user manually navigate back via "Back to Client List" button
      // This allows reviewing deletion results for all modes
    } catch (err: any) {
      console.error('Delete account error:', err);
      setError(err.message || 'Failed to delete account');
      setIsProcessing(false);
    }
  };

  const breadcrumbItems = [
    { label: 'Admin', href: '/dashboard/admin' },
    { label: 'Client Management', href: '/dashboard/admin/client-management' },
    { label: client?.name || 'Loading...' },
  ];

  if (loading) {
    return (
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!client) {
    return (
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || 'Client not found'}</AlertDescription>
            </Alert>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="mb-6">
            <Breadcrumb items={breadcrumbItems} />
          </div>

          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Manage Client</h1>
              <p className="text-muted-foreground mt-2">{client.name} • {client.email}</p>
            </div>

            {/* Management Tabs */}
            <Card className="bg-white rounded-xl border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5" />
                  Client Management
                </CardTitle>
                <CardDescription>
                  Perform administrative actions on this client account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="delete">Delete Account</TabsTrigger>
                    <TabsTrigger value="reassign" disabled>Reassign Trainer</TabsTrigger>
                    <TabsTrigger value="details" disabled>View Details</TabsTrigger>
                  </TabsList>
                  
                  {/* DELETE TAB */}
                  <TabsContent value="delete" className="space-y-4 mt-6">
                    {result ? (
                      <div className="space-y-4">
                        <div className="max-h-[32rem] overflow-y-auto space-y-4 pr-2">
                          <Alert className={deletionMode === 'mock' ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50'}>
                            <InfoIcon className={`h-4 w-4 ${deletionMode === 'mock' ? 'text-blue-600' : 'text-green-600'}`} />
                            <AlertDescription className={deletionMode === 'mock' ? 'text-blue-900' : 'text-green-900'}>
                              <p className="font-semibold mb-2">
                                {deletionMode === 'mock' ? 'Preview Complete' : 'Account Deleted Successfully'}
                              </p>
                              <ul className="list-disc list-inside space-y-1">
                                <li>Collections: {result.summary.totalCollectionsProcessed}</li>
                                <li>Items found: {result.summary.totalItemsFound}</li>
                                <li>Items {deletionMode === 'mock' ? 'would be' : ''} deleted: {result.summary.totalItemsDeleted}</li>
                                <li>Stripe: {result.summary.stripeCustomerStatus}</li>
                                <li>Auth: {result.summary.firebaseAuthStatus}</li>
                              </ul>
                            </AlertDescription>
                          </Alert>

                          <div className="space-y-2">
                            <h3 className="font-semibold">Detailed Breakdown:</h3>
                            {result.steps.map((step, idx) => (
                              <StepDetail key={idx} step={step} />
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Link href="/dashboard/admin/client-management" className="flex-1">
                            <Button className="w-full">Back to Client List</Button>
                          </Link>
                          <Button onClick={() => setResult(null)} variant="outline">
                            {deletionMode === 'mock' ? 'Run Another Preview' : 'Reset'}
                          </Button>
                        </div>
                      </div>
                    ) : isProcessing ? (
                      <div className="flex items-center gap-3 py-8 justify-center">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="font-medium">
                          {deletionMode === 'mock' ? 'Analyzing account...' : 'Deleting account...'}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Mode Selection */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Deletion Mode:</Label>
                          <RadioGroup value={deletionMode} onValueChange={(v) => setDeletionMode(v as DeletionMode)}>
                            {(Object.keys(MODE_DESCRIPTIONS) as DeletionMode[]).map((mode) => {
                              const info = MODE_DESCRIPTIONS[mode];
                              return (
                                <div key={mode} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent">
                                  <RadioGroupItem value={mode} id={mode} className="mt-1" />
                                  <div className="flex-1">
                                    <Label htmlFor={mode} className="font-medium cursor-pointer">
                                      {info.title}
                                    </Label>
                                    <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
                                    <p className="text-sm text-amber-700 mt-1">{info.warning}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </RadioGroup>
                        </div>

                        {/* Email Confirmation */}
                        {deletionMode !== 'mock' && (
                          <div className="space-y-2">
                            <Label htmlFor="email">Type client's email to confirm:</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder={client.email}
                              value={emailConfirmation}
                              onChange={(e) => setEmailConfirmation(e.target.value)}
                            />
                          </div>
                        )}

                        {/* Reason */}
                        <div className="space-y-2">
                          <Label htmlFor="reason">
                            Reason {deletionMode === 'mock' ? '(optional)' : '(required)'}:
                          </Label>
                          <Textarea
                            id="reason"
                            placeholder={deletionMode === 'mock' ? 'e.g., Testing deletion flow (optional)' : 'e.g., User requested account deletion'}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                          />
                        </div>

                        {/* Confirmation Checkbox */}
                        {deletionMode !== 'mock' && (
                          <div className="flex items-start space-x-2">
                            <Checkbox
                              id="understood"
                              checked={understood}
                              onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                            />
                            <Label htmlFor="understood" className="font-normal leading-tight">
                              I understand this is permanent and cannot be undone
                            </Label>
                          </div>
                        )}

                        {/* Error Display */}
                        {error && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                          <Button
                            variant={deletionMode === 'mock' ? 'default' : 'destructive'}
                            onClick={handleDelete}
                            disabled={
                              deletionMode === 'mock' 
                                ? false  // Mock mode: always enabled
                                : (!reason || !emailConfirmation || !understood)  // Real modes: require all validations
                            }
                            className="flex-1"
                            size="lg"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deletionMode === 'mock' ? 'Run Preview' : 'Delete Account Permanently'}
                          </Button>
                          <Link href="/dashboard/admin/client-management">
                            <Button variant="outline" size="lg">
                              Cancel
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* REASSIGN TAB (Placeholder) */}
                  <TabsContent value="reassign" className="space-y-4 mt-6">
                    <Alert>
                      <InfoIcon className="h-4 w-4" />
                      <AlertDescription>
                        Trainer reassignment feature coming soon.
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                  
                  {/* DETAILS TAB (Placeholder) */}
                  <TabsContent value="details" className="space-y-4 mt-6">
                    <Alert>
                      <InfoIcon className="h-4 w-4" />
                      <AlertDescription>
                        Client details view coming soon.
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
