"use client";

import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayCompleteButtonProps {
  isComplete: boolean;
  onToggle: () => void;
}

export function DayCompleteButton({ isComplete, onToggle }: DayCompleteButtonProps) {
  return (
    <Button
      onClick={onToggle}
      size="sm"
      className={cn(
        "text-sm font-medium transition-all duration-200",
        isComplete
          ? "bg-green-500 hover:bg-green-600 text-white"
          : "bg-white hover:bg-primary/5 text-foreground border border-primary/30 hover:border-primary/50"
      )}
    >
      {isComplete ? (
        <>
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          Day Complete
        </>
      ) : (
        <>
          <Circle className="w-4 h-4 mr-1.5" />
          Mark Complete
        </>
      )}
    </Button>
  );
}
