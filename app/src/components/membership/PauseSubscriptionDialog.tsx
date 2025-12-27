// app/src/components/membership/PauseSubscriptionDialog.tsx

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Pause } from 'lucide-react';
import { pauseSubscription } from '@/lib/subscription-api';

interface PauseSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (resumeDate: string) => void;
}

export function PauseSubscriptionDialog({
  open,
  onOpenChange,
  onSuccess,
}: PauseSubscriptionDialogProps) {
  const [duration, setDuration] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePause = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await pauseSubscription({ duration, reason });

      if (result.success && result.data) {
        onSuccess(result.data.resumeDate);
        onOpenChange(false);
        setDuration(1);
        setReason('');
      } else {
        setError(result.error || 'Failed to pause subscription');
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
          <DialogTitle className="flex items-center gap-2">
            <Pause className="w-5 h-5 text-blue-600" />
            Pause Subscription
          </DialogTitle>
          <DialogDescription>
            Take a break and resume when you're ready. Your billing will pause and automatically resume on the selected date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              During the pause, you won't be charged, but you'll also lose access to your subscription benefits.
            </AlertDescription>
          </Alert>

          {/* Duration Selection */}
          <div className="space-y-3">
            <Label>How long do you want to pause?</Label>
            <RadioGroup
              value={duration.toString()}
              onValueChange={(value) => setDuration(parseInt(value) as 1 | 2 | 3)}
              disabled={loading}
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="1" id="duration-1" />
                <Label htmlFor="duration-1" className="flex-1 cursor-pointer">
                  <div className="font-semibold">1 Month</div>
                  <div className="text-sm text-muted-foreground">
                    Resumes on the 1st of next month
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="2" id="duration-2" />
                <Label htmlFor="duration-2" className="flex-1 cursor-pointer">
                  <div className="font-semibold">2 Months</div>
                  <div className="text-sm text-muted-foreground">
                    Perfect for a short break
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="3" id="duration-3" />
                <Label htmlFor="duration-3" className="flex-1 cursor-pointer">
                  <div className="font-semibold">3 Months</div>
                  <div className="text-sm text-muted-foreground">
                    Extended break or travel
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Why are you pausing? <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Taking a break, traveling, injury recovery..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
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
            Cancel
          </Button>
          <Button
            onClick={handlePause}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Pausing...' : `Pause for ${duration} Month${duration > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
