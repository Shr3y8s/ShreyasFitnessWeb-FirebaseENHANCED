"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scale, Save, Loader2, TrendingDown, TrendingUp, Info, ChevronDown } from 'lucide-react';
import { WeightLog } from '@/types/activity';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

/**
 * Tap-friendly replacement for a hover-only tooltip.
 *
 * The old implementation put helper text behind a hover Tooltip on a 12px Info
 * icon — unreachable on a touch device. A Popover works for both mouse hover
 * users (click) and touch users (tap), and the trigger is a real 32px button.
 */
function FieldHelp({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`More information about ${label}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-[16rem] text-sm" side="top">
        {children}
      </PopoverContent>
    </Popover>
  );
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

  // Progressive disclosure: body fat / height / notes are optional or set-once,
  // so they're collapsed by default to keep the daily action (weight + save) at
  // the top on a phone. Auto-expanded for clients who already use those fields.
  const [detailsOpen, setDetailsOpen] = useState(
    !!(currentLog?.bodyFat || currentLog?.height || currentLog?.notes)
  );

  useEffect(() => {
    if (currentLog) {
      setWeight(currentLog.weight.toString());
      setUnit(currentLog.unit);
      setBodyFat(currentLog.bodyFat?.toString() || '');
      setHeight(currentLog.height?.toString() || '');
      setHeightUnit(currentLog.heightUnit || 'in');
      setNotes(currentLog.notes || '');
      setHasChanges(false);
      if (currentLog.bodyFat || currentLog.height || currentLog.notes) {
        setDetailsOpen(true);
      }
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
    const weightKg = unit === 'lbs' ? weightValue * 0.453592 : weightValue;
    const heightM = heightUnit === 'in' ? heightValue * 0.0254 : heightValue / 100;

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
      setDetailsOpen(true); // reveal the offending field
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
        setDetailsOpen(true); // reveal the offending field
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

  // Shared input styling — min-h-11 for a comfortable touch target and text-base
  // (16px) so iOS Safari doesn't zoom the page when the field receives focus.
  const inputClass =
    'flex-1 min-w-0 min-h-11 px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-primary focus:border-transparent';

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
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4">
            <p className="text-sm text-muted-foreground">Current Stats</p>

            {/* Metrics wrap freely; the trend badge drops to its own line on
                narrow screens instead of squeezing the numbers. */}
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-2xl font-bold text-primary tabular-nums">
                {currentLog.weight} <span className="text-lg">{currentLog.unit}</span>
              </p>
              {currentLog.bodyFat && (
                <>
                  <span className="text-muted-foreground" aria-hidden="true">|</span>
                  <p className="text-base sm:text-lg font-semibold text-primary tabular-nums">
                    BF: {currentLog.bodyFat}%
                  </p>
                </>
              )}
              {currentLog.bmi && (
                <>
                  <span className="text-muted-foreground" aria-hidden="true">|</span>
                  <p className="text-base sm:text-lg font-semibold text-primary tabular-nums">
                    BMI: {currentLog.bmi.toFixed(1)}
                  </p>
                </>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Logged {new Date(currentLog.date).toLocaleDateString()}
              </p>
              {trend && (
                <div
                  className={cn(
                    'flex items-center gap-1',
                    trend.direction === 'down'
                      ? 'text-green-600'
                      : trend.direction === 'up'
                        ? 'text-orange-600'
                        : 'text-muted-foreground'
                  )}
                >
                  {trend.direction === 'down' && <TrendingDown className="h-4 w-4" />}
                  {trend.direction === 'up' && <TrendingUp className="h-4 w-4" />}
                  <span className="text-sm font-medium tabular-nums">
                    {trend.direction === 'same' ? 'No change' : `${trend.amount.toFixed(1)} ${trend.unit}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- Primary action: weight + unit + save ----
            Kept always-visible and near the top so logging a weigh-in on a phone
            is a two-tap job. Everything optional lives in the collapsible below. */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm">Today&apos;s Weigh-In</h4>

            {/* Unit toggle sits inline with the heading to save vertical space */}
            <div className="inline-flex rounded-lg border border-border p-1 bg-muted/50">
              <button
                type="button"
                onClick={() => handleUnitChange('lbs')}
                className={cn(
                  'min-h-9 px-4 text-sm font-medium rounded-md transition-all',
                  unit === 'lbs'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                disabled={saving}
                aria-pressed={unit === 'lbs'}
              >
                lbs
              </button>
              <button
                type="button"
                onClick={() => handleUnitChange('kg')}
                className={cn(
                  'min-h-9 px-4 text-sm font-medium rounded-md transition-all',
                  unit === 'kg'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                disabled={saving}
                aria-pressed={unit === 'kg'}
              >
                kg
              </button>
            </div>
          </div>

          {/* Weight Input */}
          <div className="space-y-2">
            <label htmlFor="weight-input" className="text-sm font-medium">Weight *</label>
            <div className="flex gap-2">
              <input
                id="weight-input"
                type="text"
                inputMode="decimal"
                value={weight}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder={unit === 'lbs' ? '150.0' : '68.0'}
                className={cn(inputClass, 'text-lg font-semibold tabular-nums')}
                disabled={saving}
              />
              <span className="flex shrink-0 items-center px-3 border rounded-lg bg-muted text-muted-foreground font-medium">
                {unit}
              </span>
            </div>
          </div>

          {/* Save Button — right under the weight field, the only required input */}
          <Button
            onClick={handleSave}
            disabled={saving || !weight || parseFloat(weight) <= 0}
            className="w-full min-h-11 transition-transform active:scale-95"
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

          {/* ---- Optional details, collapsed by default ---- */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full min-h-11 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform duration-200', detailsOpen && 'rotate-180')}
                />
                {detailsOpen ? 'Hide extra details' : 'Add body fat, height & notes'}
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 pt-4">
              {/* Body Fat Input */}
              <div className="space-y-2">
                <label htmlFor="bodyfat-input" className="flex items-center gap-1 text-sm font-medium">
                  Body Fat % (optional)
                  <FieldHelp label="body fat percentage">
                    Requires a body composition scale. Track over time to monitor muscle gain and fat loss.
                  </FieldHelp>
                </label>
                <div className="flex gap-2">
                  <input
                    id="bodyfat-input"
                    type="text"
                    inputMode="decimal"
                    value={bodyFat}
                    onChange={(e) => handleBodyFatChange(e.target.value)}
                    placeholder="18.5"
                    className={cn(inputClass, 'tabular-nums')}
                    disabled={saving}
                  />
                  <span className="flex shrink-0 items-center px-3 border rounded-lg bg-muted text-muted-foreground font-medium">
                    %
                  </span>
                </div>
              </div>

              {/* Height Input */}
              <div className="space-y-2">
                <label htmlFor="height-input" className="flex items-center gap-1 text-sm font-medium">
                  Height
                  <FieldHelp label="height">
                    Set this once and it&apos;s remembered — it&apos;s only used to calculate your BMI.
                  </FieldHelp>
                </label>
                <div className="flex gap-2">
                  <input
                    id="height-input"
                    type="text"
                    inputMode="decimal"
                    value={height}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    placeholder={heightUnit === 'in' ? '70' : '178'}
                    className={cn(inputClass, 'tabular-nums')}
                    disabled={saving}
                  />
                  <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleHeightUnitChange('in')}
                      className={cn(
                        'min-h-11 px-3 text-sm font-medium transition-all',
                        heightUnit === 'in'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      disabled={saving}
                      aria-pressed={heightUnit === 'in'}
                    >
                      in
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHeightUnitChange('cm')}
                      className={cn(
                        'min-h-11 px-3 text-sm font-medium transition-all',
                        heightUnit === 'cm'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      disabled={saving}
                      aria-pressed={heightUnit === 'cm'}
                    >
                      cm
                    </button>
                  </div>
                </div>
              </div>

              {/* BMI Display */}
              {bmi && (
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">Calculated BMI:</span>
                    <div className="text-right">
                      <span className="text-xl font-bold tabular-nums">{bmi.toFixed(1)}</span>
                      <span className={cn('ml-2 text-sm font-medium', bmiCategory?.color)}>
                        ({bmiCategory?.label})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <label htmlFor="weight-notes" className="text-sm font-medium">Notes (optional)</label>
                <textarea
                  id="weight-notes"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setHasChanges(true); }}
                  placeholder="Any observations about your progress..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  disabled={saving}
                />
              </div>

              {/* Unsaved-changes nudge, since Save lives above this section */}
              {hasChanges && (
                <p className="text-xs text-muted-foreground text-center">
                  Tap <span className="font-medium text-foreground">
                    {currentLog ? 'Update Weigh-In' : 'Log Weigh-In'}
                  </span> above to save these details.
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Recent History */}
        {recentLogs.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Recent Weigh-Ins</h4>
            <div className="space-y-1">
              {recentLogs.slice(0, 5).map((log) => (
                <div
                  key={log.date}
                  className="flex flex-wrap justify-between items-center gap-x-2 gap-y-0.5 text-sm py-2 border-b last:border-0"
                >
                  <span className="text-muted-foreground">
                    {new Date(log.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  {/* Wraps rather than overflowing when BF% and BMI are both set */}
                  <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
                    <span className="font-medium tabular-nums">
                      {log.weight} {log.unit}
                    </span>
                    {log.bodyFat && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {log.bodyFat}% BF
                      </span>
                    )}
                    {log.bmi && (
                      <span className="text-xs text-muted-foreground tabular-nums">
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
