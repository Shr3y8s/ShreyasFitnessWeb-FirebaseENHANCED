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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type WorkoutDifficulty = 'too-easy' | 'just-right' | 'challenging' | 'too-hard';

interface WorkoutCompleteDialogProps {
  isOpen: boolean;
  workoutTitle: string;
  onClose: () => void;
  onComplete: (difficulty: WorkoutDifficulty, notes: string) => void;
}

export function WorkoutCompleteDialog({
  isOpen,
  workoutTitle,
  onClose,
  onComplete,
}: WorkoutCompleteDialogProps) {
  const [difficulty, setDifficulty] = useState<WorkoutDifficulty>('just-right');
  const [notes, setNotes] = useState('');

  const handleComplete = () => {
    onComplete(difficulty, notes.trim());
    // Reset state
    setDifficulty('just-right');
    setNotes('');
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 50) {
      setNotes(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Workout?</DialogTitle>
          <DialogDescription>{workoutTitle}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Difficulty Rating */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">How did this workout feel?</Label>
            <RadioGroup value={difficulty} onValueChange={(v: string) => setDifficulty(v as WorkoutDifficulty)}>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent transition-colors">
                <RadioGroupItem value="too-easy" id="too-easy" />
                <Label htmlFor="too-easy" className="flex-1 cursor-pointer font-normal">
                  😊 Too Easy
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent transition-colors">
                <RadioGroupItem value="just-right" id="just-right" />
                <Label htmlFor="just-right" className="flex-1 cursor-pointer font-normal">
                  ⭐ Just Right
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent transition-colors">
                <RadioGroupItem value="challenging" id="challenging" />
                <Label htmlFor="challenging" className="flex-1 cursor-pointer font-normal">
                  💪 Challenging
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent transition-colors">
                <RadioGroupItem value="too-hard" id="too-hard" />
                <Label htmlFor="too-hard" className="flex-1 cursor-pointer font-normal">
                  😓 Too Hard
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Quick Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g., Felt great! or Shoulder a bit tight"
              value={notes}
              onChange={handleNotesChange}
              className="resize-none h-20"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/50 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleComplete}>
            Complete Workout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
