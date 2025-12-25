"use client";

import { useState, useEffect } from 'react';
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

interface UpdateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: {
    id: number;
    title: string;
    current: number;
    target: number;
    unit: string;
  } | null;
  onSave: (goalId: number, currentValue: number) => void;
}

export function UpdateGoalDialog({ open, onOpenChange, goal, onSave }: UpdateGoalDialogProps) {
  const [currentValue, setCurrentValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (goal) {
      setCurrentValue(goal.current.toString());
    }
  }, [goal]);

  const handleSave = () => {
    if (!goal) return;

    // Validation
    if (!currentValue || isNaN(parseFloat(currentValue))) {
      setError('Please enter a valid number');
      return;
    }

    onSave(goal.id, parseFloat(currentValue));

    // Reset
    setCurrentValue('');
    setError('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setCurrentValue('');
    setError('');
    onOpenChange(false);
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Goal Progress</DialogTitle>
          <DialogDescription>
            Update your current progress toward: <strong>{goal.title}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Goal</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{goal.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Target: {goal.target} {goal.unit}
              </p>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="current">
              Current Progress <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="current"
                type="number"
                step="0.1"
                placeholder={goal.current.toString()}
                value={currentValue}
                onChange={(e) => {
                  setCurrentValue(e.target.value);
                  setError('');
                }}
                className={error ? 'border-red-500' : ''}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {goal.unit}
              </span>
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 <strong>Tip:</strong> Update this regularly to track your progress over time
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Update Progress</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
