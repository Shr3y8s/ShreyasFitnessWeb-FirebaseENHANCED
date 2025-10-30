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

interface LogLiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { exercise: string; weight: number; reps: number; sets?: number; date: string; notes?: string }) => void;
}

export function LogLiftDialog({ open, onOpenChange, onSave }: LogLiftDialogProps) {
  const [exercise, setExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ exercise?: string; weight?: string; reps?: string }>({});

  const handleSave = () => {
    // Validation
    const newErrors: { exercise?: string; weight?: string; reps?: string } = {};
    
    if (!exercise.trim()) {
      newErrors.exercise = 'Exercise name is required';
    }
    if (!weight || isNaN(parseFloat(weight))) {
      newErrors.weight = 'Weight is required';
    }
    if (!reps || isNaN(parseInt(reps))) {
      newErrors.reps = 'Reps is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save data
    onSave({
      exercise: exercise.trim(),
      weight: parseFloat(weight),
      reps: parseInt(reps),
      sets: sets ? parseInt(sets) : undefined,
      date,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setExercise('');
    setWeight('');
    setReps('');
    setSets('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setErrors({});
    onOpenChange(false);
  };

  const handleCancel = () => {
    setExercise('');
    setWeight('');
    setReps('');
    setSets('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Lift PR</DialogTitle>
          <DialogDescription>
            Record a new personal record for your lifts
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
            <Label htmlFor="exercise">
              Exercise <span className="text-red-500">*</span>
            </Label>
            <Input
              id="exercise"
              type="text"
              placeholder="e.g., Barbell Squat"
              value={exercise}
              onChange={(e) => {
                setExercise(e.target.value);
                setErrors({ ...errors, exercise: undefined });
              }}
              className={errors.exercise ? 'border-red-500' : ''}
            />
            {errors.exercise && (
              <p className="text-sm text-red-500">{errors.exercise}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="weight">
                Weight (lbs) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="weight"
                type="number"
                step="2.5"
                placeholder="295"
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
              <Label htmlFor="reps">
                Reps <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reps"
                type="number"
                placeholder="5"
                value={reps}
                onChange={(e) => {
                  setReps(e.target.value);
                  setErrors({ ...errors, reps: undefined });
                }}
                className={errors.reps ? 'border-red-500' : ''}
              />
              {errors.reps && (
                <p className="text-sm text-red-500">{errors.reps}</p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sets">Sets (Optional)</Label>
            <Input
              id="sets"
              type="number"
              placeholder="3"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Felt strong, good form"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save PR</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
