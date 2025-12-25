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

interface UpdateMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    date: string;
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
    calves?: number;
  }) => void;
}

export function UpdateMeasurementDialog({ open, onOpenChange, onSave }: UpdateMeasurementDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [measurements, setMeasurements] = useState({
    chest: '',
    waist: '',
    hips: '',
    arms: '',
    thighs: '',
    calves: '',
  });

  const handleSave = () => {
    // Build data object with only filled fields
    const data: {
      date: string;
      chest?: number;
      waist?: number;
      hips?: number;
      arms?: number;
      thighs?: number;
      calves?: number;
    } = { date };
    
    if (measurements.chest) data.chest = parseFloat(measurements.chest);
    if (measurements.waist) data.waist = parseFloat(measurements.waist);
    if (measurements.hips) data.hips = parseFloat(measurements.hips);
    if (measurements.arms) data.arms = parseFloat(measurements.arms);
    if (measurements.thighs) data.thighs = parseFloat(measurements.thighs);
    if (measurements.calves) data.calves = parseFloat(measurements.calves);

    onSave(data);

    // Reset form
    setDate(new Date().toISOString().split('T')[0]);
    setMeasurements({
      chest: '',
      waist: '',
      hips: '',
      arms: '',
      thighs: '',
      calves: '',
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setMeasurements({
      chest: '',
      waist: '',
      hips: '',
      arms: '',
      thighs: '',
      calves: '',
    });
    onOpenChange(false);
  };

  const handleMeasurementChange = (key: string, value: string) => {
    setMeasurements({ ...measurements, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Measurements</DialogTitle>
          <DialogDescription>
            Track your body measurements. All fields are optional.
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="chest">Chest (inches)</Label>
              <Input
                id="chest"
                type="number"
                step="0.1"
                placeholder="42.0"
                value={measurements.chest}
                onChange={(e) => handleMeasurementChange('chest', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="waist">Waist (inches)</Label>
              <Input
                id="waist"
                type="number"
                step="0.1"
                placeholder="34.0"
                value={measurements.waist}
                onChange={(e) => handleMeasurementChange('waist', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="hips">Hips (inches)</Label>
              <Input
                id="hips"
                type="number"
                step="0.1"
                placeholder="38.0"
                value={measurements.hips}
                onChange={(e) => handleMeasurementChange('hips', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arms">Arms (inches)</Label>
              <Input
                id="arms"
                type="number"
                step="0.1"
                placeholder="15.5"
                value={measurements.arms}
                onChange={(e) => handleMeasurementChange('arms', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="thighs">Thighs (inches)</Label>
              <Input
                id="thighs"
                type="number"
                step="0.1"
                placeholder="24.0"
                value={measurements.thighs}
                onChange={(e) => handleMeasurementChange('thighs', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="calves">Calves (inches)</Label>
              <Input
                id="calves"
                type="number"
                step="0.1"
                placeholder="15.0"
                value={measurements.calves}
                onChange={(e) => handleMeasurementChange('calves', e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Tip: Measure at the same time of day for consistency
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
