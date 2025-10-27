"use client";

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Check, Dumbbell } from 'lucide-react';

interface Exercise {
  name: string;
  videoUrl: string;
  instructions: string[];
}

interface ExerciseInfoDialogProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExerciseInfoDialog({ exercise, isOpen, onClose }: ExerciseInfoDialogProps) {
  if (!exercise) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Dumbbell className="h-6 w-6 text-primary" />
            {exercise.name}
          </DialogTitle>
          <DialogDescription>
            Review the instructions and video to ensure proper form.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <h4 className="font-semibold text-primary">Key Tips for Proper Form</h4>
            <ul className="space-y-3">
              {exercise.instructions.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-video rounded-lg overflow-hidden border">
            <Image
              src={exercise.videoUrl}
              alt={`${exercise.name} demonstration`}
              fill={true}
              style={{ objectFit: 'cover' }}
              unoptimized // for GIFs
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
