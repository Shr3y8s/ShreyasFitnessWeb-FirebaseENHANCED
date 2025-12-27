// app/src/components/membership/CancelSubscriptionDialog.tsx

"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, XCircle } from 'lucide-react';
import { cancelSubscription } from '@/lib/subscription-api';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (accessUntil: string) => void;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CancelSubscriptionDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await cancelSubscription({ reason });

      if (result.success && result.data) {
        onSuccess(result.data.accessUntil);
        onOpenChange(false);
        setReason('');
      } else {
        setError(result.error || 'Failed to cancel subscription');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-900">
            <XCircle className="w-5 h-5" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Your subscription will be canceled, but you'll keep access until the end of your current billing period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Important:</strong> Once canceled, you'll lose access to:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Unlimited workout programs</li>
                <li>Custom nutrition plans</li>
                <li>Weekly coach check-ins</li>
                <li>Priority scheduling</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Mind telling us why? <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Your feedback helps us improve..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? 'Canceling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
