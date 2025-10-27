"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, X, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const onboardingSteps = [
  { id: 'schedule', label: 'Schedule your 30-minute planning consultation' },
  { id: 'complete', label: 'Complete your consultation' },
  { id: 'receive', label: 'Receive your personalized fitness plan' },
];

interface OnboardingChecklistProps {
  onDismiss?: () => void;
  onSchedule?: () => void;
}

export function OnboardingChecklist({ onDismiss, onSchedule }: OnboardingChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const handleCheckedChange = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  return (
    <div className="rounded-xl border text-card-foreground shadow-sm relative bg-primary/10 border-primary/50 hover:shadow-glow">
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:bg-primary/10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      )}
      <div className="flex p-6 flex-row gap-4 items-start pb-4">
        <div className="bg-primary/10 p-3 rounded-full mt-1">
          <ClipboardList className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold leading-none tracking-tight">
            Welcome to Your Fitness Journey!
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            The next step is to schedule your 30-minute planning consultation. During this session,
            we&apos;ll create your personalized fitness plan and set you up for success.
          </p>
          <Button
            onClick={onSchedule}
            className="mt-4 transition-transform hover:-translate-y-1 hover:shadow-lg"
          >
            Schedule Your Consultation
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="space-y-3">
          {onboardingSteps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={step.id}
                checked={!!checkedItems[step.id]}
                onChange={() => handleCheckedChange(step.id)}
                className="sr-only"
              />
              <label
                htmlFor={step.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                    checkedItems[step.id]
                      ? "bg-primary border-primary"
                      : "border-primary bg-transparent"
                  )}
                >
                  {checkedItems[step.id] && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium transition-colors select-text",
                    checkedItems[step.id] ? "text-muted-foreground line-through" : "text-foreground"
                  )}
                >
                  {step.label}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
