"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LogActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    date: string;
    steps?: number;
    caloriesBurned?: number;
    activeMinutes?: number;
    sleepHours?: number;
  }) => void;
}

export function LogActivityDialog({ open, onOpenChange, onSave }: LogActivityDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activity, setActivity] = useState({
    steps: '',
    caloriesBurned: '',
    activeMinutes: '',
    sleepHours: '',
  });

  const handleSave = () => {
    const data: {
      date: string;
      steps?: number;
      caloriesBurned?: number;
      activeMinutes?: number;
      sleepHours?: number;
    } = { date };
    
    if (activity.steps) data.steps = parseInt(activity.steps);
    if (activity.caloriesBurned) data.caloriesBurned = parseInt(activity.caloriesBurned);
    if (activity.activeMinutes) data.activeMinutes = parseInt(activity.activeMinutes);
    if (activity.sleepHours) data.sleepHours = parseFloat(activity.sleepHours);

    onSave(data);

    // Reset form
    setDate(new Date().toISOString().split('T')[0]);
    setActivity({
      steps: '',
      caloriesBurned: '',
      activeMinutes: '',
      sleepHours: '',
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setActivity({
      steps: '',
      caloriesBurned: '',
      activeMinutes: '',
      sleepHours: '',
    });
    onOpenChange(false);
  };

  const handleActivityChange = (key: string, value: string) => {
    setActivity({ ...activity, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>
            Manually track your daily activity. All fields are optional.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date">
              Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="steps">Steps</Label>
            <Input
              id="steps"
              type="number"
              placeholder="10,000"
              value={activity.steps}
              onChange={(e) => handleActivityChange('steps', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Only if you tracked this manually
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="calories">Calories Burned</Label>
            <Input
              id="calories"
              type="number"
              placeholder="2,500"
              value={activity.caloriesBurned}
              onChange={(e) => handleActivityChange('caloriesBurned', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="activeMinutes">Active Minutes</Label>
            <Input
              id="activeMinutes"
              type="number"
              placeholder="60"
              value={activity.activeMinutes}
              onChange={(e) => handleActivityChange('activeMinutes', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Exercise or elevated heart rate time
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sleep">Sleep Hours</Label>
            <Input
              id="sleep"
              type="number"
              step="0.5"
              placeholder="7.5"
              value={activity.sleepHours}
              onChange={(e) => handleActivityChange('sleepHours', e.target.value)}
            />
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 <strong>Tip:</strong> Connect an Apple Watch or Fitbit to automatically track these metrics!
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Activity</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
