"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartPulse, Save, Loader2 } from 'lucide-react';
import { CARDIO_FREQUENCY_OPTIONS, CARDIO_TIMING_OPTIONS, LissCardioData } from '@/types/plan';

interface LissCardioEditorProps {
  initialData: LissCardioData | null;
  onSave: (data: LissCardioData) => Promise<void>;
  isSaving: boolean;
}

export function LissCardioEditor({ initialData, onSave, isSaving }: LissCardioEditorProps) {
  const [frequency, setFrequency] = useState<string>('3x per week');
  const [duration, setDuration] = useState<string>('20-30 min');
  const [targetHeartRate, setTargetHeartRate] = useState<string>('120-130 BPM');
  const [timing, setTiming] = useState<string>('Post-workout');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from existing data
  useEffect(() => {
    if (initialData) {
      setFrequency(initialData.frequency || '3x per week');
      setDuration(initialData.duration || '20-30 min');
      setTargetHeartRate(initialData.targetHeartRate || '120-130 BPM');
      setTiming(initialData.timing || 'Post-workout');
    }
  }, [initialData]);

  const handleFrequencyChange = (value: string) => {
    setFrequency(value);
    setHasChanges(true);
  };

  const handleDurationChange = (value: string) => {
    setDuration(value);
    setHasChanges(true);
  };

  const handleTargetHRChange = (value: string) => {
    setTargetHeartRate(value);
    setHasChanges(true);
  };

  const handleTimingChange = (value: string) => {
    setTiming(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validate inputs
    if (!frequency || !duration || !targetHeartRate || !timing) {
      alert('Please fill in all fields');
      return;
    }

    const lissCardioData: LissCardioData = {
      frequency,
      duration,
      targetHeartRate,
      timing,
      lastUpdated: new Date()
    };

    await onSave(lissCardioData);
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Reset to initial data
    if (initialData) {
      setFrequency(initialData.frequency || '3x per week');
      setDuration(initialData.duration || '20-30 min');
      setTargetHeartRate(initialData.targetHeartRate || '120-130 BPM');
      setTiming(initialData.timing || 'Post-workout');
    } else {
      setFrequency('3x per week');
      setDuration('20-30 min');
      setTargetHeartRate('120-130 BPM');
      setTiming('Post-workout');
    }
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <HeartPulse className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <CardTitle>LISS Cardio Protocol</CardTitle>
            <CardDescription>
              Configure Low Intensity Steady State cardio prescription for your client
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Frequency */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Frequency *
          </label>
          <select
            value={frequency}
            onChange={(e) => handleFrequencyChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSaving}
          >
            {CARDIO_FREQUENCY_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600 mt-1">
            How many cardio sessions per week
          </p>
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Duration *
          </label>
          <input
            type="text"
            value={duration}
            onChange={(e) => handleDurationChange(e.target.value)}
            placeholder="e.g., 20-30 min, 30 min, 45 min"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSaving}
          />
          <p className="text-xs text-gray-600 mt-1">
            Length of each cardio session
          </p>
        </div>

        {/* Common Duration Presets */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => { setDuration('15-20 min'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            15-20 min
          </button>
          <button
            type="button"
            onClick={() => { setDuration('20-30 min'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            20-30 min
          </button>
          <button
            type="button"
            onClick={() => { setDuration('30-40 min'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            30-40 min
          </button>
          <button
            type="button"
            onClick={() => { setDuration('45 min'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            45 min
          </button>
        </div>

        {/* Target Heart Rate */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Target Heart Rate *
          </label>
          <input
            type="text"
            value={targetHeartRate}
            onChange={(e) => handleTargetHRChange(e.target.value)}
            placeholder="e.g., 120-130 BPM, 130 BPM, Zone 2"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSaving}
          />
          <p className="text-xs text-gray-600 mt-1">
            Target heart rate or zone (LISS typically 50-65% of max HR)
          </p>
        </div>

        {/* Target HR Presets */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => { setTargetHeartRate('110-120 BPM'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            110-120 BPM
            <br />
            <span className="text-xs text-gray-600">Light</span>
          </button>
          <button
            type="button"
            onClick={() => { setTargetHeartRate('120-130 BPM'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            120-130 BPM
            <br />
            <span className="text-xs text-gray-600">Moderate</span>
          </button>
          <button
            type="button"
            onClick={() => { setTargetHeartRate('Zone 2'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            Zone 2
            <br />
            <span className="text-xs text-gray-600">Standard</span>
          </button>
        </div>

        {/* Timing */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Timing *
          </label>
          <select
            value={timing}
            onChange={(e) => handleTimingChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSaving}
          >
            {CARDIO_TIMING_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600 mt-1">
            When should the client perform cardio
          </p>
        </div>

        {/* Helper Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-2">
            <strong>💡 What is LISS Cardio?</strong>
          </p>
          <p className="text-sm text-blue-800">
            Low Intensity Steady State cardio is performed at a consistent, moderate pace 
            for an extended period. Examples: brisk walking, light cycling, swimming. 
            It's great for fat burning, recovery, and building aerobic base.
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
                Save LISS Cardio
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
