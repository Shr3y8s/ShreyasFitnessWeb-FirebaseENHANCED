"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Droplets, Save, Loader2, Plus, Minus } from 'lucide-react';
import { DailyWaterLog } from '@/types/activity';

interface WaterLoggerProps {
  currentLog?: DailyWaterLog;
  goal: number;
  unit: 'oz' | 'liters' | 'cups';
  onSave: (amount: number) => Promise<void>;
}

export function WaterLogger({ currentLog, goal, unit, onSave }: WaterLoggerProps) {
  const [amount, setAmount] = useState<string>(currentLog?.amount.toString() || '0');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleAmountChange = (value: string) => {
    // Allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setHasChanges(true);
    }
  };

  const handleQuickAdd = (increment: number) => {
    const currentAmount = parseFloat(amount) || 0;
    const newAmount = Math.max(0, currentAmount + increment);
    setAmount(newAmount.toString());
    setHasChanges(true);
  };

  const handleSave = async () => {
    const amountValue = parseFloat(amount) || 0;
    
    if (amountValue < 0) {
      alert('Water intake cannot be negative');
      return;
    }

    // Set max based on unit
    const maxAmount = unit === 'oz' ? 300 : unit === 'liters' ? 10 : 30;
    if (amountValue > maxAmount) {
      alert(`Please enter a realistic amount (max ${maxAmount} ${unit})`);
      return;
    }

    setSaving(true);
    try {
      await onSave(amountValue);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving water:', error);
      alert('Failed to save water intake. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentAmount = parseFloat(amount) || 0;
  const percentage = goal > 0 ? Math.min((currentAmount / goal) * 100, 100) : 0;

  // Quick add amounts based on unit
  const quickAddAmounts = unit === 'oz' 
    ? [8, 16, 24] // Common bottle sizes
    : unit === 'liters' 
    ? [0.25, 0.5, 1] // Quarter, half, full liter
    : [1, 2, 3]; // Cups

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Droplets className="h-5 w-5 text-blue-500" />
          Water Intake
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {currentAmount} / {goal} {unit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {percentage.toFixed(0)}% of goal
          </p>
        </div>

        {/* Quick Add Buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Add</label>
          <div className="grid grid-cols-3 gap-2">
            {quickAddAmounts.map((addAmount) => (
              <Button
                key={addAmount}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(addAmount)}
                disabled={saving}
                className="text-sm"
              >
                <Plus className="h-3 w-3 mr-1" />
                {addAmount} {unit}
              </Button>
            ))}
          </div>
        </div>

        {/* Manual Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Total Today ({unit})
          </label>
          <div className="flex gap-2">
            <div className="flex items-center flex-1 border rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAdd(-quickAddAmounts[0])}
                disabled={saving || currentAmount <= 0}
                className="rounded-r-none"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="flex-1 px-3 py-2 text-center border-0 focus:ring-0 text-lg font-semibold"
                disabled={saving}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAdd(quickAddAmounts[0])}
                disabled={saving}
                className="rounded-l-none"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
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
