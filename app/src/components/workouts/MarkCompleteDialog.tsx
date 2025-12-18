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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, Loader2 } from 'lucide-react';

interface MarkCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard', notes?: string) => Promise<void>;
  workoutName: string;
  completionPercentage: number;
}

/**
 * MarkCompleteDialog - Dialog for marking workout complete
 * Asks for difficulty rating and optional notes
 */
export function MarkCompleteDialog({
  open,
  onOpenChange,
  onComplete,
  workoutName,
  completionPercentage,
}: MarkCompleteDialogProps) {
  const [difficulty, setDifficulty] = useState<'easy' | 'moderate' | 'hard' | 'very_hard'>('moderate');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onComplete(difficulty, notes || undefined);
      // Reset form
      setDifficulty('moderate');
      setNotes('');
    } finally {
      setIsSaving(false);
    }
  };

  const difficultyOptions = [
    { value: 'easy', label: 'Easy', emoji: '😊', description: 'Felt comfortable throughout' },
    { value: 'moderate', label: 'Moderate', emoji: '💪', description: 'Challenging but manageable' },
    { value: 'hard', label: 'Hard', emoji: '😅', description: 'Very challenging, pushed limits' },
    { value: 'very_hard', label: 'Very Hard', emoji: '🔥', description: 'Extremely difficult, maxed out' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Mark Workout Complete
          </DialogTitle>
          <DialogDescription>
            You've completed <strong>{completionPercentage}%</strong> of <strong>{workoutName}</strong>.
            <br />
            How did it go?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Difficulty Rating */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">How difficult was this workout?</Label>
            <RadioGroup
              value={difficulty}
              onValueChange={(value) => setDifficulty(value as any)}
              className="space-y-2"
            >
              {difficultyOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                    difficulty === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                  }`}
                  onClick={() => setDifficulty(option.value as any)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className="flex-1 cursor-pointer flex items-center gap-2"
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="How did you feel? Any thoughts on the workout?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Share your thoughts, progress, or anything you want your trainer to know.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Workout
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
