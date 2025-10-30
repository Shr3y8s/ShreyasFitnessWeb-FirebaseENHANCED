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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LogWeightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { weight: number; bodyFat?: number; date: string }) => void;
}

export function LogWeightDialog({ open, onOpenChange, onSave }: LogWeightDialogProps) {
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<{ weight?: string }>({});

  const handleSave = () => {
    // Validation
    const newErrors: { weight?: string } = {};
    
    if (!weight || isNaN(parseFloat(weight))) {
      newErrors.weight = 'Weight is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save data
    onSave({
      weight: parseFloat(weight),
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      date,
    });

    // Reset form
    setWeight('');
    setBodyFat('');
    setDate(new Date().toISOString().split('T')[0]);
    setErrors({});
    onOpenChange(false);
  };

  const handleCancel = () => {
    setWeight('');
    setBodyFat('');
    setDate(new Date().toISOString().split('T')[0]);
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Weight</DialogTitle>
          <DialogDescription>
            Track your weight and body composition progress.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weight">
              Weight (lbs) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="188.5"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                setErrors({ ...errors, weight: undefined });
              }}
              className={errors.weight ? 'border-red-500' : ''}
            />
            {errors.weight && (
              <p className="text-sm text-red-500">{errors.weight}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bodyFat">Body Fat % (Optional)</Label>
            <Input
              id="bodyFat"
              type="number"
              step="0.1"
              placeholder="20.9"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Only if you have a smart scale or other measurement device
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
