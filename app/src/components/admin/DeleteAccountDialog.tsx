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
import { AlertCircle, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { deleteAccount, DeleteAccountResponse } from '@/lib/admin-api';

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

type DialogStep = 'warning' | 'validation' | 'confirm' | 'processing' | 'success' | 'error';

export default function DeleteAccountDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: DeleteAccountDialogProps) {
  const [step, setStep] = useState<DialogStep>('warning');
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
      // Reset after a delay to avoid UI flicker
      setTimeout(() => {
        setStep('warning');
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

  const handleContinue = () => {
    // Check if account has active subscription
    const hasActiveSubscription = 
      client?.subscriptionStatus === 'active' && 
      !client?.cancelAtPeriodEnd;

    if (hasActiveSubscription) {
      setValidationError('Active subscription detected');
      setStep('validation');
    } else {
      setStep('confirm');
    }
  };

  const handleDelete = async () => {
    if (!client) return;

    // Validate email confirmation
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

    setError(null);
    setStep('processing');

    try {
      const response = await deleteAccount({
        targetUserId: client.uid,
        adminOverride: adminOverride,
        reason: reason.trim(),
      });

      setResult(response);
      setStep('success');

      // Auto-close after 3 seconds and trigger success callback
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 3000);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {/* Step 1: Warning */}
        {step === 'warning' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Delete Client Account
              </DialogTitle>
              <DialogDescription>
                You are about to permanently delete this account
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

              {/* Warning List */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">This action will:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Delete all personal data</li>
                    <li>Remove progress photos, workouts, and surveys</li>
                    <li>Preserve payment history (legal requirement)</li>
                    <li><strong className="text-destructive">Cannot be undone</strong></li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleContinue}>
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
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
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
                Final Confirmation
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Email Confirmation */}
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

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for deletion (required):</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., User requested account deletion"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Confirmation Checkbox */}
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

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('warning')}>
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!emailConfirmation || !reason || !understood}
              >
                Delete Account Permanently
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4: Processing */}
        {step === 'processing' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Deleting Account...
              </DialogTitle>
              <DialogDescription>
                Please wait while we delete the account
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                This may take a few moments...
              </p>
            </div>
          </>
        )}

        {/* Step 5: Success */}
        {step === 'success' && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Account Deleted Successfully
              </DialogTitle>
              <DialogDescription>
                {client.name}'s account has been permanently deleted
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Firestore data: Deleted</li>
                    <li>Firebase Auth: Deleted</li>
                    <li>Stripe customer: Anonymized</li>
                    <li>Progress photos: {result.itemsDeleted.photos} deleted</li>
                    <li>Financial records: Preserved</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <p className="text-sm text-muted-foreground text-center">
                Closing automatically...
              </p>
            </div>
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
              <Button onClick={() => setStep('confirm')}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
