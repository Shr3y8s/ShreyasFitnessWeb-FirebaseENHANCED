"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Footprints, Save, Loader2, Check } from 'lucide-react';
import { CircularProgress } from '@/components/ui/circular-progress';
import { DailyStepsLog } from '@/types/activity';
import { useToast } from '@/hooks/use-toast';

interface StepsLoggerProps {
  currentLog?: DailyStepsLog;
  goal: number;
  onSave: (steps: number) => Promise<void>;
}

export function StepsLogger({ currentLog, goal, onSave }: StepsLoggerProps) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<string>(currentLog?.steps.toString() || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleStepsChange = (value: string) => {
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setSteps(value);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    const stepsValue = parseInt(steps) || 0;
    
    if (stepsValue < 0) {
      toast({
        title: "Invalid Input",
        description: "Steps cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (stepsValue > 100000) {
      toast({
        title: "Count Too High",
        description: "Please enter a realistic step count (max 100,000)",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await onSave(stepsValue);
      setHasChanges(false);
      toast({
        title: "👟 Steps Logged",
        description: `Successfully logged ${stepsValue.toLocaleString()} steps`,
      });
    } catch (error) {
      console.error('Error saving steps:', error);
      toast({
        title: "Error",
        description: "Failed to save steps. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteGoal = async () => {
    setSaving(true);
    try {
      setSteps(goal.toString());
      await onSave(goal);
      setHasChanges(false);
      toast({
        title: "🎉 Goal Complete!",
        description: `Amazing! You hit your ${goal.toLocaleString()} step goal`,
      });
    } catch (error) {
      console.error('Error completing goal:', error);
      toast({
        title: "Error",
        description: "Failed to complete goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const currentSteps = parseInt(steps) || 0;
  const percentage = goal > 0 ? Math.min((currentSteps / goal) * 100, 100) : 0;

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Footprints className="h-5 w-5 text-primary" />
          Daily Steps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Ring with Stats and Complete Button.
            flex-wrap + w-full lets the button drop to its own full-width row on
            phones, while staying inline on sm+ where there's room. */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Circular Progress Ring */}
          <CircularProgress 
            percentage={percentage} 
            size={72}
            strokeWidth={8}
          />
          
          {/* Stats */}
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {currentSteps.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              of {goal.toLocaleString()} steps
            </p>
          </div>

          {/* Complete Goal Button */}
          <Button
            onClick={handleCompleteGoal}
            disabled={saving}
            className="w-full sm:w-auto min-h-11 bg-green-600 hover:bg-green-700 text-white transition-transform active:scale-95"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Complete
              </>
            )}
          </Button>
        </div>

        {/* Input Section */}
        <div className="space-y-2 pt-2 border-t">
          <label className="text-sm font-medium text-muted-foreground">
            Or Enter Custom Amount
          </label>
          {/* text-base (16px) on the input prevents iOS Safari auto-zoom on focus */}
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={steps}
              onChange={(e) => handleStepsChange(e.target.value)}
              placeholder="Enter steps"
              className="flex-1 min-w-0 min-h-11 px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={saving}
            />
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving || !steps}
              className="min-h-11 shrink-0 transition-transform active:scale-95"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        {currentLog && (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(currentLog.timestamp).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
