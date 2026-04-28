"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HeartPulse, Save, Loader2, Trash2, Info } from 'lucide-react';
import { CARDIO_FREQUENCY_OPTIONS, CARDIO_TIMING_OPTIONS, CARDIO_EQUIPMENT_OPTIONS, LissCardioData } from '@/types/plan';
import { useToast } from '@/hooks/use-toast';

interface LissCardioEditorProps {
  initialData: LissCardioData | null;
  onSave: (data: LissCardioData) => Promise<void>;
  onRemove?: () => Promise<void>;
  isSaving: boolean;
}

export function LissCardioEditor({ initialData, onSave, onRemove, isSaving }: LissCardioEditorProps) {
  const { toast } = useToast();
  const [frequency, setFrequency] = useState<string>('3x per week');
  const [duration, setDuration] = useState<string>('20-30 min');
  const [targetHeartRate, setTargetHeartRate] = useState<string>('120-130 BPM');
  const [timing, setTiming] = useState<string>('Post-workout');
  // equipment: either a preset from CARDIO_EQUIPMENT_OPTIONS or a free-form string
  // equipmentSelect: the dropdown selection ('Other / Activity' triggers text input)
  const [equipmentSelect, setEquipmentSelect] = useState<string>('');
  const [equipmentCustom, setEquipmentCustom] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Initialize from existing data
  useEffect(() => {
    if (initialData) {
      setFrequency(initialData.frequency || '3x per week');
      setDuration(initialData.duration || '20-30 min');
      setTargetHeartRate(initialData.targetHeartRate || '120-130 BPM');
      setTiming(initialData.timing || 'Post-workout');
      // Restore equipment state
      if (initialData.equipment) {
        if (CARDIO_EQUIPMENT_OPTIONS.includes(initialData.equipment) && initialData.equipment !== 'Other / Activity') {
          setEquipmentSelect(initialData.equipment);
          setEquipmentCustom('');
        } else {
          // It was free-form
          setEquipmentSelect('Other / Activity');
          setEquipmentCustom(initialData.equipment);
        }
      } else {
        setEquipmentSelect('');
        setEquipmentCustom('');
      }
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
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Resolve final equipment value
    const resolvedEquipment =
      equipmentSelect === 'Other / Activity'
        ? equipmentCustom.trim()
        : equipmentSelect || undefined;

    const lissCardioData: LissCardioData = {
      frequency,
      duration,
      targetHeartRate,
      timing,
      equipment: resolvedEquipment || undefined,
      lastUpdated: new Date()
    };

    await onSave(lissCardioData);
    setHasChanges(false);
  };

  const resetEquipmentFromData = (data: LissCardioData | null) => {
    if (data?.equipment) {
      if (CARDIO_EQUIPMENT_OPTIONS.includes(data.equipment) && data.equipment !== 'Other / Activity') {
        setEquipmentSelect(data.equipment);
        setEquipmentCustom('');
      } else {
        setEquipmentSelect('Other / Activity');
        setEquipmentCustom(data.equipment);
      }
    } else {
      setEquipmentSelect('');
      setEquipmentCustom('');
    }
  };

  const handleCancel = () => {
    // Reset to initial data
    if (initialData) {
      setFrequency(initialData.frequency || '3x per week');
      setDuration(initialData.duration || '20-30 min');
      setTargetHeartRate(initialData.targetHeartRate || '120-130 BPM');
      setTiming(initialData.timing || 'Post-workout');
      resetEquipmentFromData(initialData);
    } else {
      setFrequency('3x per week');
      setDuration('20-30 min');
      setTargetHeartRate('120-130 BPM');
      setTiming('Post-workout');
      setEquipmentSelect('');
      setEquipmentCustom('');
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
        {/* Assignment Status Banner - Only show if already configured */}
        {initialData && onRemove && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 mb-3">
                  LISS Cardio is currently assigned to this client
                </p>
                {showRemoveConfirm ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-amber-900">
                      Are you sure you want to remove this assignment? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          await onRemove();
                          setShowRemoveConfirm(false);
                        }}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 mr-1" />
                            Yes, Remove
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRemoveConfirm(false)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRemoveConfirm(true)}
                    disabled={isSaving}
                    className="border-amber-300 text-amber-900 hover:bg-amber-100 hover:border-amber-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove Assignment
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* What is LISS Cardio Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-blue-900 font-semibold mb-2">
            💡 What is LISS Cardio?
          </p>
          <p className="text-sm text-blue-800 leading-relaxed">
            Low Intensity Steady State cardio is performed at a consistent, moderate pace 
            for an extended period. Examples: brisk walking, light cycling, swimming. 
            Great for fat burning, recovery, and building aerobic base.
          </p>
        </div>

        {/* Frequency */}
        <div>
          <label className="text-sm font-medium mb-2 block text-gray-700">
            Frequency *
          </label>
          <select
            value={frequency}
            onChange={(e) => handleFrequencyChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 hover:shadow-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {CARDIO_FREQUENCY_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600 mt-1.5">
            How many cardio sessions per week
          </p>
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-medium mb-2 block text-gray-700">
            Duration *
          </label>
          <input
            type="text"
            value={duration}
            onChange={(e) => handleDurationChange(e.target.value)}
            placeholder="e.g., 20-30 min, 30 min, 45 min"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 hover:shadow-sm disabled:bg-gray-50 disabled:cursor-not-allowed placeholder:text-gray-400"
            disabled={isSaving}
          />
          <p className="text-xs text-gray-600 mt-1.5">
            Length of each cardio session
          </p>
        </div>

        {/* Common Duration Presets */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => { setDuration('15-20 min'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={isSaving}
          >
            15-20 min
          </button>
          <button
            type="button"
            onClick={() => { setDuration('20-30 min'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={isSaving}
          >
            20-30 min
          </button>
          <button
            type="button"
            onClick={() => { setDuration('30-40 min'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={isSaving}
          >
            30-40 min
          </button>
          <button
            type="button"
            onClick={() => { setDuration('45 min'); setHasChanges(true); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={isSaving}
          >
            45 min
          </button>
        </div>

        {/* Target Heart Rate */}
        <div>
          <label className="text-sm font-medium mb-2 block text-gray-700">
            Target Heart Rate *
          </label>
          <input
            type="text"
            value={targetHeartRate}
            onChange={(e) => handleTargetHRChange(e.target.value)}
            placeholder="e.g., 120-130 BPM, 130 BPM, Zone 2"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 hover:shadow-sm disabled:bg-gray-50 disabled:cursor-not-allowed placeholder:text-gray-400"
            disabled={isSaving}
          />
          <p className="text-xs text-gray-600 mt-1.5">
            Target heart rate or zone (LISS typically 50-65% of max HR)
          </p>
        </div>

        {/* Target HR Presets */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => { setTargetHeartRate('110-120 BPM'); setHasChanges(true); }}
            className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={isSaving}
          >
            <div>110-120 BPM</div>
            <div className="text-xs text-gray-600 mt-0.5">Light</div>
          </button>
          <button
            type="button"
            onClick={() => { setTargetHeartRate('120-130 BPM'); setHasChanges(true); }}
            className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={isSaving}
          >
            <div>120-130 BPM</div>
            <div className="text-xs text-gray-600 mt-0.5">Moderate</div>
          </button>
          <button
            type="button"
            onClick={() => { setTargetHeartRate('Zone 2'); setHasChanges(true); }}
            className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={isSaving}
          >
            <div>Zone 2</div>
            <div className="text-xs text-gray-600 mt-0.5">Standard</div>
          </button>
        </div>

        {/* Timing */}
        <div>
          <label className="text-sm font-medium mb-2 block text-gray-700">
            Timing *
          </label>
          <select
            value={timing}
            onChange={(e) => handleTimingChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 hover:shadow-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {CARDIO_TIMING_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-600 mt-1.5">
            When should the client perform cardio
          </p>
        </div>

        {/* Equipment / Activity (optional) */}
        <div>
          <label className="text-sm font-medium mb-2 block text-gray-700">
            Equipment / Activity <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            value={equipmentSelect}
            onChange={(e) => { setEquipmentSelect(e.target.value); setEquipmentCustom(''); setHasChanges(true); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400 hover:shadow-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            <option value="">-- None specified --</option>
            {CARDIO_EQUIPMENT_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {equipmentSelect === 'Other / Activity' && (
            <input
              type="text"
              value={equipmentCustom}
              onChange={(e) => { setEquipmentCustom(e.target.value); setHasChanges(true); }}
              placeholder="e.g., Tennis, Basketball, Swimming..."
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 placeholder:text-gray-400"
              disabled={isSaving}
            />
          )}
          <p className="text-xs text-gray-600 mt-1.5">
            Specify the machine or activity — shown to the client in their plan and activity tracker
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1 transition-all duration-200 hover:shadow-md"
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
            className="transition-all duration-200 hover:shadow-md"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
