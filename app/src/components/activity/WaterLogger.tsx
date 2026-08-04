"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Droplets, Save, Loader2, Plus, Minus, Check } from 'lucide-react';
import { CircularProgress } from '@/components/ui/circular-progress';
import { DailyWaterLog } from '@/types/activity';
import { useToast } from '@/hooks/use-toast';

interface WaterLoggerProps {
  currentLog?: DailyWaterLog;
  goal: number;
  unit: 'oz' | 'liters' | 'cups';
  onSave: (amount: number) => Promise<void>;
}

export function WaterLogger({ currentLog, goal, unit, onSave }: WaterLoggerProps) {
  const { toast } = useToast();
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
      toast({
        title: "Invalid Amount",
        description: "Water intake cannot be negative",
        variant: "destructive",
      });
      return;
    }

    // Set max based on unit
    const maxAmount = unit === 'oz' ? 300 : unit === 'liters' ? 10 : 30;
    if (amountValue > maxAmount) {
      toast({
        title: "Amount Too High",
        description: `Please enter a realistic amount (max ${maxAmount} ${unit})`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await onSave(amountValue);
      setHasChanges(false);
      toast({
        title: "💧 Water Logged",
        description: `Successfully logged ${amountValue} ${unit}`,
      });
    } catch (error) {
      console.error('Error saving water:', error);
      toast({
        title: "Error",
        description: "Failed to save water intake. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteGoal = async () => {
    setSaving(true);
    try {
      setAmount(goal.toString());
      await onSave(goal);
      setHasChanges(false);
      toast({
        title: "🎉 Goal Complete!",
        description: `Great job! You hit your ${goal} ${unit} goal`,
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

  const currentAmount = parseFloat(amount) || 0;
  const percentage = goal > 0 ? Math.min((currentAmount / goal) * 100, 100) : 0;

  // Quick add amounts based on unit
  const quickAddAmounts = unit === 'oz' 
    ? [8, 16, 24] // Common bottle sizes
    : unit === 'liters' 
    ? [0.25, 0.5, 1] // Quarter, half, full liter
    : [1, 2, 3]; // Cups

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Droplets className="h-5 w-5 text-blue-500" />
          Water Intake
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
              {currentAmount}
            </p>
            <p className="text-sm text-muted-foreground">
              of {goal} {unit}
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

        {/* Quick Add Buttons */}
        <div className="space-y-2 pt-2 border-t">
          <label className="text-sm font-medium text-muted-foreground">Quick Add</label>
          <div className="grid grid-cols-3 gap-2">
            {quickAddAmounts.map((addAmount) => (
              <Button
                key={addAmount}
                variant="outline"
                onClick={() => handleQuickAdd(addAmount)}
                disabled={saving}
                className="min-h-11 text-sm transition-transform active:scale-95"
              >
                <Plus className="h-3 w-3 mr-1" />
                {addAmount} {unit}
              </Button>
            ))}
          </div>
        </div>

        {/* Manual Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Or Enter Custom Amount
          </label>
          {/* Stepper gets its own full-width row on mobile so the −/+ targets stay
              a comfortable size; Save sits beside it from sm+ upward. */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center flex-1 border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                onClick={() => handleQuickAdd(-quickAddAmounts[0])}
                disabled={saving || currentAmount <= 0}
                className="min-h-11 rounded-none px-4 transition-transform active:scale-95"
                aria-label={`Decrease by ${quickAddAmounts[0]} ${unit}`}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="flex-1 min-w-0 min-h-11 px-2 py-2 text-center border-0 focus:ring-0 text-lg font-semibold tabular-nums"
                disabled={saving}
                aria-label={`Water amount in ${unit}`}
              />
              <Button
                variant="ghost"
                onClick={() => handleQuickAdd(quickAddAmounts[0])}
                disabled={saving}
                className="min-h-11 rounded-none px-4 transition-transform active:scale-95"
                aria-label={`Increase by ${quickAddAmounts[0]} ${unit}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="min-h-11 sm:w-auto transition-transform active:scale-95"
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
