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
import { formatDateISO, getTodayLocal, getDaysAgo } from '@/lib/date-utils';

interface MarkCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard', completionDate: Date, durationMinutes: number, notes?: string) => Promise<void>;
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
  const [completionDate, setCompletionDate] = useState(new Date());
  const [completionTime, setCompletionTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [durationMinutes, setDurationMinutes] = useState(45); // Default 45 minutes
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      // Combine date and time into a single Date object
      const [hours, minutes] = completionTime.split(':').map(Number);
      const completedAt = new Date(completionDate);
      completedAt.setHours(hours, minutes, 0, 0);
      
      await onComplete(difficulty, completedAt, durationMinutes, notes || undefined);
      // Reset form
      setDifficulty('moderate');
      setCompletionDate(new Date());
      const now = new Date();
      setCompletionTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      setDurationMinutes(45);
      setNotes('');
    } finally {
      setIsSaving(false);
    }
  };

  // Use local-timezone date formatting (avoids UTC bug where evening PST shows next day)
  const today = getTodayLocal();
  const minDate = getDaysAgo(30);

  const difficultyOptions = [
    { value: 'easy', label: 'Easy', emoji: '😊', description: 'Felt comfortable throughout' },
    { value: 'moderate', label: 'Moderate', emoji: '💪', description: 'Challenging but manageable' },
    { value: 'hard', label: 'Hard', emoji: '😅', description: 'Very challenging, pushed limits' },
    { value: 'very_hard', label: 'Very Hard', emoji: '🔥', description: 'Extremely difficult, maxed out' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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

          {/* Completion Date & Time */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">When did you complete this workout?</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="completion-date" className="text-sm text-muted-foreground">Date</Label>
                <input
                  type="date"
                  id="completion-date"
                  value={formatDateISO(completionDate)}
                  onChange={(e) => setCompletionDate(new Date(e.target.value + 'T00:00:00'))}
                  min={minDate}
                  max={today}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <Label htmlFor="completion-time" className="text-sm text-muted-foreground">Time</Label>
                <input
                  type="time"
                  id="completion-time"
                  value={completionTime}
                  onChange={(e) => setCompletionTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Can backdate up to 30 days. Time helps calculate when you started.
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-base font-semibold">Workout Duration</Label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(1, Math.min(300, parseInt(e.target.value) || 45)))}
                min="1"
                max="300"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="text-sm font-medium text-muted-foreground">minutes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              How long did this workout take? (approximately)
            </p>
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
