"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scale, Save, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { WeightLog } from '@/types/activity';

interface WeightLoggerProps {
  currentLog?: WeightLog;
  recentLogs: WeightLog[];
  onSave: (weight: number, unit: 'lbs' | 'kg', notes?: string) => Promise<void>;
}

export function WeightLogger({ currentLog, recentLogs, onSave }: WeightLoggerProps) {
  const [weight, setWeight] = useState<string>(currentLog?.weight.toString() || '');
  const [unit, setUnit] = useState<'lbs' | 'kg'>(currentLog?.unit || 'lbs');
  const [notes, setNotes] = useState<string>(currentLog?.notes || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (currentLog) {
      setWeight(currentLog.weight.toString());
      setUnit(currentLog.unit);
      setNotes(currentLog.notes || '');
      setHasChanges(false); // Reset hasChanges when loading existing data
    }
  }, [currentLog]);

  const handleWeightChange = (value: string) => {
    // Allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWeight(value);
      setHasChanges(true);
    }
  };

  const handleUnitChange = (newUnit: 'lbs' | 'kg') => {
    setUnit(newUnit);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const weightValue = parseFloat(weight);
    
    if (!weightValue || weightValue <= 0) {
      alert('Please enter a valid weight');
      return;
    }

    // Reasonable ranges
    const minWeight = unit === 'lbs' ? 50 : 20;
    const maxWeight = unit === 'lbs' ? 500 : 250;
    
    if (weightValue < minWeight || weightValue > maxWeight) {
      alert(`Please enter a weight between ${minWeight} and ${maxWeight} ${unit}`);
      return;
    }

    setSaving(true);
    try {
      await onSave(weightValue, unit, notes.trim() || undefined);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving weight:', error);
      alert('Failed to save weight. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate trend from recent logs
  const getTrend = () => {
    if (recentLogs.length < 2) return null;
    
    const latest = recentLogs[0];
    const previous = recentLogs[1];
    
    // Convert to same unit for comparison
    let latestWeight = latest.weight;
    let previousWeight = previous.weight;
    
    if (latest.unit !== previous.unit) {
      // Convert to lbs for comparison
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
          Weekly Weigh-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Weight Display */}
        {currentLog && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Weight</p>
                <p className="text-3xl font-bold text-primary">
                  {currentLog.weight} <span className="text-xl">{currentLog.unit}</span>
                </p>
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
        )}

        {/* Unit Selector - Compact Segmented Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Unit</label>
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

        {/* Weight Input with Inline Button */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Today's Weight *
          </label>
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
            <span className="flex items-center px-3 py-2 border rounded-lg bg-gray-50 text-muted-foreground font-medium">
              {unit}
            </span>
            <Button
              onClick={handleSave}
              disabled={saving || !weight || parseFloat(weight) <= 0}
              size="default"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {currentLog ? 'Update' : 'Log'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setHasChanges(true); }}
            placeholder="Any observations about your progress..."
            rows={2}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
            disabled={saving}
          />
        </div>

        {/* Recent History */}
        {recentLogs.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Recent Weigh-Ins</h4>
            <div className="space-y-1">
              {recentLogs.slice(0, 5).map((log, index) => (
                <div key={log.date} className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground">
                    {new Date(log.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span className="font-medium">
                    {log.weight} {log.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
