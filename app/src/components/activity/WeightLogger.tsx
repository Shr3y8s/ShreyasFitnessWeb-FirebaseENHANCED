"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scale, Save, Loader2, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { WeightLog } from '@/types/activity';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface WeightLoggerProps {
  currentLog?: WeightLog;
  recentLogs: WeightLog[];
  onSave: (
    weight: number,
    unit: 'lbs' | 'kg',
    bodyFat?: number,
    height?: number,
    heightUnit?: 'in' | 'cm',
    notes?: string
  ) => Promise<void>;
}

export function WeightLogger({ currentLog, recentLogs, onSave }: WeightLoggerProps) {
  const { toast } = useToast();
  const [weight, setWeight] = useState<string>(currentLog?.weight.toString() || '');
  const [unit, setUnit] = useState<'lbs' | 'kg'>(currentLog?.unit || 'lbs');
  const [bodyFat, setBodyFat] = useState<string>(currentLog?.bodyFat?.toString() || '');
  const [height, setHeight] = useState<string>(currentLog?.height?.toString() || '');
  const [heightUnit, setHeightUnit] = useState<'in' | 'cm'>(currentLog?.heightUnit || 'in');
  const [notes, setNotes] = useState<string>(currentLog?.notes || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (currentLog) {
      setWeight(currentLog.weight.toString());
      setUnit(currentLog.unit);
      setBodyFat(currentLog.bodyFat?.toString() || '');
      setHeight(currentLog.height?.toString() || '');
      setHeightUnit(currentLog.heightUnit || 'in');
      setNotes(currentLog.notes || '');
      setHasChanges(false);
    }
  }, [currentLog]);

  // Calculate BMI
  const calculateBMI = (): number | null => {
    const weightValue = parseFloat(weight);
    const heightValue = parseFloat(height);
    
    if (!weightValue || !heightValue || weightValue <= 0 || heightValue <= 0) {
      return null;
    }

    // Convert to kg and meters
    let weightKg = unit === 'lbs' ? weightValue * 0.453592 : weightValue;
    let heightM = heightUnit === 'in' ? heightValue * 0.0254 : heightValue / 100;

    return weightKg / (heightM * heightM);
  };

  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600' };
    return { label: 'Obese', color: 'text-red-600' };
  };

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  const handleWeightChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWeight(value);
      setHasChanges(true);
    }
  };

  const handleBodyFatChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      if (value === '' || (numValue >= 0 && numValue <= 100)) {
        setBodyFat(value);
        setHasChanges(true);
      }
    }
  };

  const handleHeightChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setHeight(value);
      setHasChanges(true);
    }
  };

  const handleUnitChange = (newUnit: 'lbs' | 'kg') => {
    setUnit(newUnit);
    setHasChanges(true);
  };

  const handleHeightUnitChange = (newUnit: 'in' | 'cm') => {
    setHeightUnit(newUnit);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const weightValue = parseFloat(weight);
    
    if (!weightValue || weightValue <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid weight",
        variant: "destructive",
      });
      return;
    }

    // Reasonable ranges
    const minWeight = unit === 'lbs' ? 50 : 20;
    const maxWeight = unit === 'lbs' ? 500 : 250;
    
    if (weightValue < minWeight || weightValue > maxWeight) {
      toast({
        title: "Invalid Weight",
        description: `Please enter a weight between ${minWeight} and ${maxWeight} ${unit}`,
        variant: "destructive",
      });
      return;
    }

    // Validate body fat if provided
    const bodyFatValue = bodyFat ? parseFloat(bodyFat) : undefined;
    if (bodyFatValue !== undefined && (bodyFatValue < 1 || bodyFatValue > 60)) {
      toast({
        title: "Invalid Body Fat %",
        description: "Body fat percentage should be between 1% and 60%",
        variant: "destructive",
      });
      return;
    }

    // Validate height if provided
    const heightValue = height ? parseFloat(height) : undefined;
    if (heightValue !== undefined) {
      const minHeight = heightUnit === 'in' ? 36 : 90; // 3 feet or 90cm
      const maxHeight = heightUnit === 'in' ? 96 : 240; // 8 feet or 240cm
      if (heightValue < minHeight || heightValue > maxHeight) {
        toast({
          title: "Invalid Height",
          description: `Please enter a height between ${minHeight} and ${maxHeight} ${heightUnit}`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      await onSave(
        weightValue,
        unit,
        bodyFatValue,
        heightValue,
        heightValue ? heightUnit : undefined,
        notes.trim() || undefined
      );
      setHasChanges(false);
      toast({
        title: "✅ Weight Logged",
        description: `Successfully logged ${weightValue} ${unit}`,
      });
    } catch (error) {
      console.error('Error saving weight:', error);
      toast({
        title: "Error",
        description: "Failed to save weight. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculate trend from recent logs
  const getTrend = () => {
    if (recentLogs.length < 2) return null;
    
    const latest = recentLogs[0];
    const previous = recentLogs[1];
    
    let latestWeight = latest.weight;
    let previousWeight = previous.weight;
    
    if (latest.unit !== previous.unit) {
      if (latest.unit === 'kg') {
        latestWeight = latest.weight * 2.20462;
      }
      if (previous.unit === 'kg') {
        previousWeight = previous.weight * 2.20462;
      }
    }
    
    const diff = latestWeight - previousWeight;
    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
      amount: Math.abs(diff),
      unit: 'lbs'
    };
  };

  const trend = getTrend();

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary" />
          Weigh-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Stats Display */}
        {currentLog && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Stats</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-2xl font-bold text-primary">
                      {currentLog.weight} <span className="text-lg">{currentLog.unit}</span>
                    </p>
                    {currentLog.bodyFat && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <p className="text-lg font-semibold text-primary">
                          Body Fat: {currentLog.bodyFat}%
                        </p>
                      </>
                    )}
                    {currentLog.bmi && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <p className="text-lg font-semibold text-primary">
                          BMI: {currentLog.bmi.toFixed(1)}
                        </p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Logged {new Date(currentLog.date).toLocaleDateString()}
                  </p>
                </div>
                {trend && (
                  <div className={`flex items-center gap-1 ${
                    trend.direction === 'down' ? 'text-green-600' : 
                    trend.direction === 'up' ? 'text-orange-600' : 
                    'text-gray-600'
                  }`}>
                    {trend.direction === 'down' && <TrendingDown className="h-5 w-5" />}
                    {trend.direction === 'up' && <TrendingUp className="h-5 w-5" />}
                    <span className="text-sm font-medium">
                      {trend.direction === 'same' ? 'No change' : `${trend.amount.toFixed(1)} ${trend.unit}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Weight Input Section */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-sm">Today&apos;s Measurements</h4>

          {/* Unit Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Weight Unit</label>
            <div className="inline-flex rounded-lg border border-border p-1 bg-muted/50">
              <button
                type="button"
                onClick={() => handleUnitChange('lbs')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  unit === 'lbs'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                disabled={saving}
              >
                lbs
              </button>
              <button
                type="button"
                onClick={() => handleUnitChange('kg')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  unit === 'kg'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                disabled={saving}
              >
                kg
              </button>
            </div>
          </div>

          {/* Weight Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Weight *</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={weight}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder={unit === 'lbs' ? '150.0' : '68.0'}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-semibold"
                disabled={saving}
              />
              <span className="flex items-center px-3 py-2 border rounded-lg bg-muted text-muted-foreground font-medium">
                {unit}
              </span>
            </div>
          </div>

          {/* Body Fat Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              Body Fat % (optional)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Requires a body composition scale. Track over time to monitor muscle gain and fat loss.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={bodyFat}
                onChange={(e) => handleBodyFatChange(e.target.value)}
                placeholder="18.5"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={saving}
              />
              <span className="flex items-center px-3 py-2 border rounded-lg bg-muted text-muted-foreground font-medium">
                %
              </span>
            </div>
          </div>

          {/* Height Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              Height (for BMI calculation)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Set once or update anytime. Used to calculate your BMI.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={height}
                onChange={(e) => handleHeightChange(e.target.value)}
                placeholder={heightUnit === 'in' ? "70" : "178"}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={saving}
              />
              <div className="inline-flex rounded-lg border border-border bg-muted/50">
                <button
                  type="button"
                  onClick={() => handleHeightUnitChange('in')}
                  className={`px-3 py-2 text-sm font-medium rounded-l-lg transition-all ${
                    heightUnit === 'in'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  disabled={saving}
                >
                  in
                </button>
                <button
                  type="button"
                  onClick={() => handleHeightUnitChange('cm')}
                  className={`px-3 py-2 text-sm font-medium rounded-r-lg transition-all ${
                    heightUnit === 'cm'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  disabled={saving}
                >
                  cm
                </button>
              </div>
            </div>
          </div>

          {/* BMI Display */}
          {bmi && (
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Calculated BMI:</span>
                <div className="text-right">
                  <span className="text-xl font-bold">{bmi.toFixed(1)}</span>
                  <span className={`ml-2 text-sm font-medium ${bmiCategory?.color}`}>
                    ({bmiCategory?.label})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setHasChanges(true); }}
              placeholder="Any observations about your progress..."
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
              disabled={saving}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving || !weight || parseFloat(weight) <= 0}
            size="default"
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {currentLog ? 'Update Weigh-In' : 'Log Weigh-In'}
              </>
            )}
          </Button>
        </div>

        {/* Recent History */}
        {recentLogs.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Recent Weigh-Ins</h4>
            <div className="space-y-1">
              {recentLogs.slice(0, 5).map((log) => (
                <div key={log.date} className="flex justify-between items-center text-sm py-1.5 border-b last:border-0">
                  <span className="text-muted-foreground">
                    {new Date(log.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <div className="flex items-center gap-2 text-right">
                    <span className="font-medium">
                      {log.weight} {log.unit}
                    </span>
                    {log.bodyFat && (
                      <span className="text-xs text-muted-foreground">
                        {log.bodyFat}% BF
                      </span>
                    )}
                    {log.bmi && (
                      <span className="text-xs text-muted-foreground">
                        BMI {log.bmi.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
