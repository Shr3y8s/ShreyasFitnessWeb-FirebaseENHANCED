"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Save, Loader2 } from 'lucide-react';
import { DailyStepsLog } from '@/types/activity';

interface StepsLoggerProps {
  currentLog?: DailyStepsLog;
  goal: number;
  onSave: (steps: number) => Promise<void>;
}

export function StepsLogger({ currentLog, goal, onSave }: StepsLoggerProps) {
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
      alert('Steps cannot be negative');
      return;
    }

    if (stepsValue > 100000) {
      alert('Please enter a realistic step count (max 100,000)');
      return;
    }

    setSaving(true);
    try {
      await onSave(stepsValue);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving steps:', error);
      alert('Failed to save steps. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentSteps = parseInt(steps) || 0;
  const percentage = goal > 0 ? Math.min((currentSteps / goal) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Daily Steps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {currentSteps.toLocaleString()} / {goal.toLocaleString()} steps
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentage >= 100 ? 'bg-green-500' : 'bg-primary'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {percentage.toFixed(0)}% of goal
          </p>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Log Today's Steps
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={steps}
              onChange={(e) => handleStepsChange(e.target.value)}
              placeholder="Enter steps"
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-semibold"
              disabled={saving}
            />
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving || !steps}
              size="lg"
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
