"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, Plus, X, Save, Loader2 } from 'lucide-react';
import { DEFAULT_WATER_TIPS, WaterGoalData } from '@/types/plan';

interface WaterGoalEditorProps {
  initialData: WaterGoalData | null;
  onSave: (data: WaterGoalData) => Promise<void>;
  isSaving: boolean;
}

export function WaterGoalEditor({ initialData, onSave, isSaving }: WaterGoalEditorProps) {
  const [target, setTarget] = useState<number>(100);
  const [unit, setUnit] = useState<'oz' | 'liters' | 'cups'>('oz');
  const [tips, setTips] = useState<string[]>(DEFAULT_WATER_TIPS);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from existing data
  useEffect(() => {
    if (initialData) {
      setTarget(initialData.target);
      setUnit(initialData.unit);
      setTips(initialData.tips.length > 0 ? initialData.tips : DEFAULT_WATER_TIPS);
    }
  }, [initialData]);

  const handleTargetChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setTarget(numValue);
    setHasChanges(true);
  };

  const handleUnitChange = (newUnit: 'oz' | 'liters' | 'cups') => {
    setUnit(newUnit);
    
    // Set appropriate default target for the new unit
    switch (newUnit) {
      case 'oz':
        setTarget(100);
        break;
      case 'liters':
        setTarget(3);
        break;
      case 'cups':
        setTarget(8);
        break;
    }
    
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
    setTips(DEFAULT_WATER_TIPS);
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validate target based on unit
    let minValue = 0;
    let maxValue = 0;
    
    switch (unit) {
      case 'oz':
        minValue = 30;
        maxValue = 200;
        break;
      case 'liters':
        minValue = 1;
        maxValue = 6;
        break;
      case 'cups':
        minValue = 4;
        maxValue = 16;
        break;
    }

    if (target < minValue || target > maxValue) {
      alert(`Water goal must be between ${minValue} and ${maxValue} ${unit}`);
      return;
    }

    // Filter out empty tips
    const validTips = tips.filter(t => t.trim() !== '');

    const waterGoalData: WaterGoalData = {
      target,
      unit,
      tips: validTips,
      lastUpdated: new Date()
    };

    await onSave(waterGoalData);
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Reset to initial data
    if (initialData) {
      setTarget(initialData.target);
      setUnit(initialData.unit);
      setTips(initialData.tips.length > 0 ? initialData.tips : DEFAULT_WATER_TIPS);
    } else {
      setTarget(100);
      setUnit('oz');
      setTips(DEFAULT_WATER_TIPS);
    }
    setHasChanges(false);
  };

  // Preset options based on current unit
  const getPresets = () => {
    switch (unit) {
      case 'oz':
        return [
          { value: 64, label: '64 oz', desc: 'Standard' },
          { value: 100, label: '100 oz', desc: 'Active' },
          { value: 128, label: '128 oz', desc: 'Very Active' }
        ];
      case 'liters':
        return [
          { value: 2, label: '2 L', desc: 'Standard' },
          { value: 3, label: '3 L', desc: 'Active' },
          { value: 4, label: '4 L', desc: 'Very Active' }
        ];
      case 'cups':
        return [
          { value: 8, label: '8 cups', desc: 'Standard' },
          { value: 10, label: '10 cups', desc: 'Active' },
          { value: 12, label: '12 cups', desc: 'Very Active' }
        ];
    }
  };

  const presets = getPresets();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Droplets className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Daily Water Goal</CardTitle>
            <CardDescription>
              Set your client's daily hydration target and provide tips to help them stay hydrated
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unit Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Measurement Unit
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleUnitChange('oz')}
              className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                unit === 'oz'
                  ? 'bg-primary text-white border-primary'
                  : 'hover:bg-gray-50'
              }`}
              disabled={isSaving}
            >
              Ounces (oz)
            </button>
            <button
              type="button"
              onClick={() => handleUnitChange('liters')}
              className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                unit === 'liters'
                  ? 'bg-primary text-white border-primary'
                  : 'hover:bg-gray-50'
              }`}
              disabled={isSaving}
            >
              Liters (L)
            </button>
            <button
              type="button"
              onClick={() => handleUnitChange('cups')}
              className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                unit === 'cups'
                  ? 'bg-primary text-white border-primary'
                  : 'hover:bg-gray-50'
              }`}
              disabled={isSaving}
            >
              Cups
            </button>
          </div>
        </div>

        {/* Water Target */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Daily Water Target *
          </label>
          <div className="relative">
            <input
              type="number"
              value={target}
              onChange={(e) => handleTargetChange(e.target.value)}
              placeholder={unit === 'oz' ? '100' : unit === 'liters' ? '3' : '8'}
              min={unit === 'oz' ? 30 : unit === 'liters' ? 1 : 4}
              max={unit === 'oz' ? 200 : unit === 'liters' ? 6 : 16}
              step={unit === 'oz' ? 8 : unit === 'liters' ? 0.5 : 1}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-2xl font-bold text-center"
              disabled={isSaving}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
              {unit}/day
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {unit === 'oz' && 'Range: 30-200 oz per day'}
            {unit === 'liters' && 'Range: 1-6 L per day'}
            {unit === 'cups' && 'Range: 4-16 cups per day'}
          </p>
        </div>

        {/* Common Targets for Reference */}
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => { setTarget(preset.value); setHasChanges(true); }}
              className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSaving}
            >
              {preset.label}
              <br />
              <span className="text-xs text-gray-600">{preset.desc}</span>
            </button>
          ))}
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Tips should focus on practical ways to increase water 
            intake throughout the day. Consider timing (before meals, upon waking), using 
            a reusable bottle, and setting reminders.
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
                Save Water Goal
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
