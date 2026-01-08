'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, Trash2, Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { deleteAccount, DeletionMode, DeletionStep, DeleteAccountResponse } from '@/lib/admin-api';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Client {
  uid: string;
  name: string;
  email: string;
  createdAt: any;
  subscriptionStatus?: string;
  subscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
}

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

type DialogStep = 'mode-selection' | 'validation' | 'confirm' | 'processing' | 'success' | 'error';

const MODE_DESCRIPTIONS: Record<DeletionMode, { title: string; description: string; warning: string }> = {
  'mock': {
    title: 'Mock (Preview Only)',
    description: 'Preview what would be deleted without making any changes. Perfect for testing and verification.',
    warning: 'No actual deletion occurs. This is a dry run to show what would happen.'
  },
  'no-traces': {
    title: 'No-Traces (Complete Removal)',
    description: 'Completely remove ALL traces from database. Deletes Stripe customer, all Firestore records, and Firebase Auth.',
    warning: '⚠️ DANGEROUS: Use only for test accounts. Removes everything including financial records.'
  },
  'gdpr-clean': {
    title: 'GDPR-Clean (Preserve Financials)',
    description: 'GDPR-compliant deletion. Removes personal data but preserves financial records and anonymizes Stripe customer.',
    warning: 'Financial records preserved for legal compliance. Stripe customer anonymized, not deleted.'
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
      return <Info className="w-4 h-4 text-gray-400" />;
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
  }
}

function StepDetail({ step }: { step: DeletionStep }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
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
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground mt-1">
            <code className="bg-gray-100 px-1 py-0.5 rounded">{step.collection}</code>
            {step.queryFilter && (
              <span className="ml-2 text-xs">
                {step.queryFilter}
              </span>
            )}
          </div>
          
          {step.error && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription className="text-xs">{step.error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
      
      {step.sampleItems && step.sampleItems.length > 0 && (
        <CollapsibleContent>
          <div className="ml-11 mt-2 p-2 bg-gray-50 rounded text-xs">
            <p className="font-medium text-gray-700 mb-1">Sample items:</p>
            <ul className="space-y-1">
              {step.sampleItems.slice(0, 5).map((item, idx) => (
                <li key={idx} className="text-gray-600 font-mono">
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

export default function DeleteAccountDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: DeleteAccountDialogProps) {
  const [step, setStep] = useState<DialogStep>('mode-selection');
  const [deletionMode, setDeletionMode] = useState<DeletionMode>('gdpr-clean');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [adminOverride, setAdminOverride] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeleteAccountResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('mode-selection');
        setDeletionMode('gdpr-clean');
        setEmailConfirmation('');
        setReason('');
        setAdminOverride(false);
        setUnderstood(false);
        setError(null);
        setResult(null);
        setValidationError(null);
      }, 200);
    }
  }, [open]);

  const handleContinueFromMode = () => {
    // Check if account has active subscription
    const hasActiveSubscription = 
      client?.subscriptionStatus === 'active' && 
      !client?.cancelAtPeriodEnd;

    if (hasActiveSubscription && deletionMode !== 'mock') {
      setValidationError('Active subscription detected');
      setStep('validation');
    } else {
      setStep('confirm');
    }
  };

  const handleDelete = async () => {
    if (!client) return;

    // Validate email confirmation (not required for mock mode)
    if (deletionMode !== 'mock' && emailConfirmation !== client.email) {
      setError('Email does not match. Please type the exact email address.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for deletion.');
      return;
    }

    if (deletionMode !== 'mock' && !understood) {
      setError('You must confirm that you understand this action is permanent.');
      return;
    }

    setError(null);
    setStep('processing');

    try {
      const response = await deleteAccount({
        targetUserId: client.uid,
        mode: deletionMode,
        adminOverride: adminOverride,
        reason: reason.trim(),
      });

      setResult(response);
      setStep('success');

      // Auto-close after 5 seconds for mock mode, 3 seconds for others
      const delay = deletionMode === 'mock' ? 5000 : 3000;
      setTimeout(() => {
        onOpenChange(false);
        if (deletionMode !== 'mock') {
          onSuccess();
        }
      }, delay);
    } catch (err: any) {
      console.error('Delete account error:', err);
      setError(err.message || 'Failed to delete account');
      setStep('error');
    }
  };

  const handleOverrideAndDelete = () => {
    setAdminOverride(true);
    setValidationError(null);
    setStep('confirm');
  };

  if (!client) return null;

  const memberSince = client.createdAt?.toDate
    ? client.createdAt.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  const modeInfo = MODE_DESCRIPTIONS[deletionMode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {/* Step 1: Mode Selection */}
        {step === 'mode-selection' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete Client Account
              </DialogTitle>
              <DialogDescription>
                Select how you want to handle the deletion
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Client Info */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <p className="font-semibold">{client.name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <p className="font-semibold">{client.email}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Member since:</span>
                  <p className="font-semibold">{memberSince}</p>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Deletion Mode:</Label>
                <RadioGroup value={deletionMode} onValueChange={(value) => setDeletionMode(value as DeletionMode)}>
                  {(Object.keys(MODE_DESCRIPTIONS) as DeletionMode[]).map((mode) => {
                    const info = MODE_DESCRIPTIONS[mode];
                    return (
                      <div key={mode} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                        <RadioGroupItem value={mode} id={mode} className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor={mode} className="font-medium cursor-pointer">
                            {info.title}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {info.description}
                          </p>
                          <Alert className="mt-2 py-2">
                            <AlertDescription className="text-xs">
                              {info.warning}
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleContinueFromMode}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Validation (Active Subscription Warning) */}
        {step === 'validation' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-5 h-5" />
                Active Subscription Detected
              </DialogTitle>
              <DialogDescription>
                Client has an active subscription
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert className="border-amber-500 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <p className="font-semibold mb-2">Options:</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Option 1:</strong> Cancel subscription first, then delete account
                    </div>
                    <div>
                      <strong>Option 2:</strong> Override and auto-cancel subscription during deletion
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep('mode-selection')} className="w-full sm:w-auto">
                Go Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleOverrideAndDelete}
                className="w-full sm:w-auto"
              >
                Override & Auto-Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Final Confirmation */}
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Final Confirmation - {modeInfo.title}
              </DialogTitle>
              <DialogDescription>
                {deletionMode === 'mock' ? 'Preview what would be deleted' : 'This action cannot be undone'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Mode reminder */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Mode:</strong> {modeInfo.title}
                  <p className="text-sm mt-1">{modeInfo.warning}</p>
                </AlertDescription>
              </Alert>

              {/* Email Confirmation (skip for mock) */}
              {deletionMode !== 'mock' && (
                <div className="space-y-2">
                  <Label htmlFor="email-confirm">
                    Type the client's email to confirm deletion:
                  </Label>
                  <Input
                    id="email-confirm"
                    type="email"
                    placeholder={client.email}
                    value={emailConfirmation}
                    onChange={(e) => setEmailConfirmation(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for deletion (required):</Label>
                <Textarea
                  id="reason"
                  placeholder={deletionMode === 'mock' ? 'e.g., Testing deletion flow' : 'e.g., User requested account deletion'}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Confirmation Checkbox (skip for mock) */}
              {deletionMode !== 'mock' && (
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="understood"
                    checked={understood}
                    onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                  />
                  <Label
                    htmlFor="understood"
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
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
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mode-selection')}>
                Go Back
              </Button>
              <Button
                variant={deletionMode === 'mock' ? 'default' : 'destructive'}
                onClick={handleDelete}
                disabled={
                  !reason || 
                  (deletionMode !== 'mock' && (!emailConfirmation || !understood))
                }
              >
                {deletionMode === 'mock' ? 'Run Preview' : 'Delete Account Permanently'}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4: Processing */}
        {step === 'processing' && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {deletionMode === 'mock' ? 'Analyzing Account...' : 'Deleting Account...'}
              </DialogTitle>
              <DialogDescription>
                {deletionMode === 'mock' 
                  ? 'Scanning collections to show what would be deleted'
                  : 'Please wait while we delete the account'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
              {result.steps.map((stepData, idx) => (
                <StepDetail key={idx} step={stepData} />
              ))}
            </div>
          </>
        )}

        {/* Step 5: Success */}
        {step === 'success' && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                {deletionMode === 'mock' ? 'Preview Complete' : 'Account Deleted Successfully'}
              </DialogTitle>
              <DialogDescription>
                {deletionMode === 'mock'
                  ? 'Here is what would be deleted in a real deletion'
                  : `${client.name}'s account has been permanently deleted`
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
              {/* Summary */}
              <Alert className={deletionMode === 'mock' ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50'}>
                <Info className={`h-4 w-4 ${deletionMode === 'mock' ? 'text-blue-600' : 'text-green-600'}`} />
                <AlertDescription className={deletionMode === 'mock' ? 'text-blue-900' : 'text-green-900'}>
                  <p className="font-semibold mb-2">Summary:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Collections processed: {result.summary.totalCollectionsProcessed}</li>
                    <li>Items found: {result.summary.totalItemsFound}</li>
                    <li>Items {deletionMode === 'mock' ? 'that would be' : ''} deleted: {result.summary.totalItemsDeleted}</li>
                    <li>Stripe customer: {result.summary.stripeCustomerStatus}</li>
                    <li>Firebase Auth: {result.summary.firebaseAuthStatus}</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Detailed Steps */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Detailed Breakdown:</h4>
                {result.steps.map((stepData, idx) => (
                  <StepDetail key={idx} step={stepData} />
                ))}
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {deletionMode === 'mock' ? 'No changes were made.' : 'Closing automatically...'}
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 6: Error */}
        {step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                Deletion Failed
              </DialogTitle>
              <DialogDescription>
                Failed to delete account
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Error:</p>
                  <p className="text-sm">{error}</p>
                  <p className="text-sm mt-2">
                    Partial deletion may have occurred. Please contact support if needed.
                  </p>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setStep('mode-selection')}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
