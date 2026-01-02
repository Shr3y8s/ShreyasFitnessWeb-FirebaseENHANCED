"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Footprints, Plus, X, Save, Loader2 } from 'lucide-react';
import { DEFAULT_STEP_TIPS, StepGoalData } from '@/types/plan';
import { useToast } from '@/hooks/use-toast';

interface StepGoalEditorProps {
  initialData: StepGoalData | null;
  onSave: (data: StepGoalData) => Promise<void>;
  isSaving: boolean;
}

export function StepGoalEditor({ initialData, onSave, isSaving }: StepGoalEditorProps) {
  const { toast } = useToast();
  const [target, setTarget] = useState<number>(10000);
  const [tips, setTips] = useState<string[]>(DEFAULT_STEP_TIPS);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from existing data
  useEffect(() => {
    if (initialData) {
      setTarget(initialData.target);
      setTips(initialData.tips.length > 0 ? initialData.tips : DEFAULT_STEP_TIPS);
    }
  }, [initialData]);

  const handleTargetChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setTarget(numValue);
    setHasChanges(true);
  };

  const handleTipChange = (index: number, value: string) => {
    const newTips = [...tips];
    newTips[index] = value;
    setTips(newTips);
    setHasChanges(true);
  };

  const handleAddTip = () => {
    if (tips.length < 5) {
      setTips([...tips, '']);
      setHasChanges(true);
    }
  };

  const handleRemoveTip = (index: number) => {
    if (tips.length > 1) {
      const newTips = tips.filter((_, i) => i !== index);
      setTips(newTips);
      setHasChanges(true);
    }
  };

  const handleResetToDefaults = () => {
    setTips(DEFAULT_STEP_TIPS);
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validate target
    if (target < 1000 || target > 30000) {
      toast({
        title: "Invalid Step Goal",
        description: "Step goal must be between 1,000 and 30,000 steps",
        variant: "destructive",
      });
      return;
    }

    // Filter out empty tips
    const validTips = tips.filter(t => t.trim() !== '');

    const stepGoalData: StepGoalData = {
      target,
      tips: validTips,
      lastUpdated: new Date()
    };

    await onSave(stepGoalData);
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Reset to initial data
    if (initialData) {
      setTarget(initialData.target);
      setTips(initialData.tips.length > 0 ? initialData.tips : DEFAULT_STEP_TIPS);
    } else {
      setTarget(10000);
      setTips(DEFAULT_STEP_TIPS);
    }
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Footprints className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle>Daily Step Goal</CardTitle>
            <CardDescription>
              Set your client's daily step target and provide tips to help them achieve it
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step Target */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Daily Step Target *
          </label>
          <div className="relative">
            <input
              type="number"
              value={target}
              onChange={(e) => handleTargetChange(e.target.value)}
              placeholder="10000"
              min="1000"
              max="30000"
              step="500"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-2xl font-bold text-center"
              disabled={isSaving}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
              steps/day
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Range: 1,000 - 30,000 steps per day
          </p>
        </div>

        {/* Common Targets for Reference */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => { setTarget(5000); setHasChanges(true); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            5,000
            <br />
            <span className="text-xs text-gray-600">Light</span>
          </button>
          <button
            type="button"
            onClick={() => { setTarget(10000); setHasChanges(true); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            10,000
            <br />
            <span className="text-xs text-gray-600">Standard</span>
          </button>
          <button
            type="button"
            onClick={() => { setTarget(15000); setHasChanges(true); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            15,000
            <br />
            <span className="text-xs text-gray-600">Active</span>
          </button>
        </div>

        {/* Tips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              Tips ({tips.length}/5)
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToDefaults}
              disabled={isSaving}
              className="text-xs"
            >
              Reset to defaults
            </Button>
          </div>
          
          <div className="space-y-2">
            {tips.map((tip, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={tip}
                    onChange={(e) => handleTipChange(index, e.target.value)}
                    placeholder={`Tip ${index + 1}`}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    disabled={isSaving}
                  />
                </div>
                {tips.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveTip(index)}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {tips.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTip}
              className="mt-2"
              disabled={isSaving}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Tip
            </Button>
          )}
        </div>

        {/* Helper Text */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <strong>💡 Tip:</strong> Tips should be practical and actionable. Focus on ways 
            your client can incorporate more steps throughout their day without requiring 
            dedicated workout time.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Step Goal
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={!hasChanges || isSaving}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
