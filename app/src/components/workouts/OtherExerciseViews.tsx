'use client';

import React, { useState } from 'react';
import { WorkoutAssignmentExercise, ExerciseConfigurationType } from '@/types/workout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, X } from 'lucide-react';

type ExerciseConfigurationMode = 'display' | 'configure' | 'track' | 'input';

// Common muscle groups for flexibility exercises
const FLEXIBILITY_MUSCLE_GROUPS = [
  'hamstrings', 'quadriceps', 'hip_flexors', 'glutes', 'calves',
  'chest', 'shoulders', 'back', 'triceps', 'biceps', 
  'neck', 'wrists', 'ankles', 'it_band', 'adductors'
];

// Flexibility Exercise View
export function FlexibilityExerciseView({
  exercise,
  exIndex,
  mode = 'display',
  readOnly = true,
  onExerciseUpdate,
}: {
  exercise: WorkoutAssignmentExercise;
  exIndex?: number;
  mode?: ExerciseConfigurationMode;
  readOnly?: boolean;
  onExerciseUpdate?: (exerciseIndex: number, updatedConfig: ExerciseConfigurationType) => void;
}) {
  const config = exercise.configuration as any;
  const [newTargetArea, setNewTargetArea] = useState('');
  
  const handleConfigChange = (field: string, value: any) => {
    if (!onExerciseUpdate || exIndex === undefined) return;
    
    const updatedConfig = {
      ...config,
      [field]: value,
    };
    
    // Auto-calculate total duration when stretches change
    if (field === 'stretches') {
      const totalDuration = value.reduce((sum: number, stretch: any) => 
        sum + (stretch.durationSeconds || 0), 0
      );
      updatedConfig.totalDurationSeconds = totalDuration;
    }
    
    onExerciseUpdate(exIndex, updatedConfig);
  };
  
  const handleStretchChange = (stretchIndex: number, field: string, value: any) => {
    const updatedStretches = [...(config.stretches || [])];
    updatedStretches[stretchIndex] = {
      ...updatedStretches[stretchIndex],
      [field]: value,
    };
    handleConfigChange('stretches', updatedStretches);
  };
  
  const addStretch = () => {
    const newStretch = {
      stretchNumber: (config.stretches?.length || 0) + 1,
      targetMuscles: ['hamstrings'], // Default to hamstrings in array
      primaryMuscle: 'hamstrings',
      durationSeconds: 30,
      notes: '',
    };
    handleConfigChange('stretches', [...(config.stretches || []), newStretch]);
  };
  
  const removeStretch = (stretchIndex: number) => {
    const updatedStretches = config.stretches.filter((_: any, idx: number) => idx !== stretchIndex);
    // Renumber stretches
    updatedStretches.forEach((stretch: any, idx: number) => {
      stretch.stretchNumber = idx + 1;
    });
    handleConfigChange('stretches', updatedStretches);
  };
  
  const toggleStretchMuscle = (stretchIndex: number, muscle: string) => {
    const stretch = config.stretches[stretchIndex];
    const currentMuscles = stretch.targetMuscles || [];
    const isSelected = currentMuscles.includes(muscle);
    
    let updatedMuscles;
    if (isSelected) {
      // Remove it
      updatedMuscles = currentMuscles.filter((m: string) => m !== muscle);
    } else {
      // Add it
      updatedMuscles = [...currentMuscles, muscle];
    }
    
    handleStretchChange(stretchIndex, 'targetMuscles', updatedMuscles);
  };
  
  // CONFIGURE MODE - Full editing interface
  if (mode === 'configure' && !readOnly) {
    return (
      <div className="space-y-6">
        {/* Flexibility Sub-Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Flexibility Type *</label>
          <select
            value={config.flexibilitySubType || 'static_stretch'}
            onChange={(e) => handleConfigChange('flexibilitySubType', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-white"
          >
            <option value="static_stretch">Static Stretch</option>
            <option value="dynamic_stretch">Dynamic Stretch</option>
            <option value="pnf">PNF (Proprioceptive Neuromuscular Facilitation)</option>
          </select>
          <p className="text-xs text-gray-500">
            Static: Hold stretches. Dynamic: Moving stretches. PNF: Contract-relax technique.
          </p>
        </div>
        
        {/* Arm/Leg Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Arm/Leg Type</label>
          <select
            value={config.armLegType || 'double'}
            onChange={(e) => handleConfigChange('armLegType', e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-white"
          >
            <option value="double">Double Arm/Leg (Both sides together)</option>
            <option value="single">Single Arm/Leg (One side at a time)</option>
            <option value="alternate">Alternate Arm/Leg (Switch sides)</option>
          </select>
        </div>
        
        
        {/* Individual Stretches Configuration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Individual Stretches</label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addStretch}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Stretch
            </Button>
          </div>
          
          <div className="space-y-3">
            {(config.stretches || []).map((stretch: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Stretch {stretch.stretchNumber}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeStretch(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {/* Target Muscles - Multi-Select Grid */}
                  <div>
                    <label className="text-xs text-gray-600 mb-2 block">
                      Target Muscles <span className="text-gray-500">(Click to select/deselect)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {FLEXIBILITY_MUSCLE_GROUPS.map(muscle => {
                        const isSelected = (stretch.targetMuscles || []).includes(muscle);
                        return (
                          <button
                            key={muscle}
                            type="button"
                            onClick={() => toggleStretchMuscle(index, muscle)}
                            className={`px-2 py-1.5 rounded text-xs font-medium transition-all capitalize border ${
                              isSelected
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-primary/50'
                            }`}
                          >
                            {muscle.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                    {stretch.targetMuscles && stretch.targetMuscles.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        Selected: {stretch.targetMuscles.length} muscle{stretch.targetMuscles.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  
                  {/* Duration */}
                  <div>
                    <label className="text-xs text-gray-600">Duration (seconds)</label>
                    <Input
                      type="number"
                      value={stretch.durationSeconds || 30}
                      onChange={(e) => handleStretchChange(index, 'durationSeconds', parseInt(e.target.value) || 0)}
                      min="0"
                      className="text-sm"
                    />
                  </div>
                </div>
                
                {config.flexibilitySubType === 'pnf' && (
                  <div>
                    <label className="text-xs text-gray-600">Reps (for PNF)</label>
                    <Input
                      type="number"
                      value={stretch.reps || 3}
                      onChange={(e) => handleStretchChange(index, 'reps', parseInt(e.target.value) || 0)}
                      min="1"
                      className="text-sm w-24"
                    />
                  </div>
                )}
                
                <div>
                  <label className="text-xs text-gray-600">Notes (optional)</label>
                  <Input
                    type="text"
                    value={stretch.notes || ''}
                    onChange={(e) => handleStretchChange(index, 'notes', e.target.value)}
                    placeholder="e.g., Hold until mild tension"
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
            
            {(!config.stretches || config.stretches.length === 0) && (
              <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed rounded-lg">
                No stretches added yet. Click "Add Stretch" to begin.
              </div>
            )}
          </div>
        </div>
        
        {/* Intensity Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Intensity</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="intensity"
                value="light"
                checked={config.intensity === 'light'}
                onChange={(e) => handleConfigChange('intensity', e.target.value)}
                className="cursor-pointer"
              />
              <span className="text-sm">Light</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="intensity"
                value="moderate"
                checked={config.intensity === 'moderate'}
                onChange={(e) => handleConfigChange('intensity', e.target.value)}
                className="cursor-pointer"
              />
              <span className="text-sm">Moderate</span>
            </label>
          </div>
        </div>
        
        {/* Total Duration (auto-calculated) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total Duration</span>
            <span className="text-lg font-bold text-blue-600">
              {config.totalDurationSeconds || 0}s ({Math.round((config.totalDurationSeconds || 0) / 60)} min)
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Auto-calculated from individual stretch durations
          </p>
        </div>
        
        {/* General Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">General Notes (optional)</label>
          <textarea
            value={config.notes || ''}
            onChange={(e) => handleConfigChange('notes', e.target.value)}
            placeholder="Add any general instructions or coaching cues..."
            rows={3}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
      </div>
    );
  }
  
  // DISPLAY MODE - Read-only view
  return (
    <>
      {/* Badges for metadata */}
      <div className="flex flex-wrap gap-2 mb-4">
        {config.armLegType && (
          <Badge variant="outline">
            {config.armLegType === 'double' && 'Double Arm/Leg'}
            {config.armLegType === 'single' && 'Single Arm/Leg'}
            {config.armLegType === 'alternate' && 'Alternate Arm/Leg'}
          </Badge>
        )}
        {config.intensity && (
          <Badge variant="secondary" className="capitalize">
            {config.intensity} Intensity
          </Badge>
        )}
      </div>
      
      
      {/* Stretches Table */}
      <Table>
        <TableHeader>
          <TableRow className="border-primary/20">
            <TableHead className="text-center">#</TableHead>
            <TableHead>Target Muscles</TableHead>
            <TableHead className="text-center">Duration</TableHead>
            {config.flexibilitySubType === 'pnf' && (
              <TableHead className="text-center">Reps</TableHead>
            )}
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(config.stretches || []).map((stretch: any, idx: number) => (
            <TableRow key={idx} className="border-primary/20">
              <TableCell className="text-center font-medium">{stretch.stretchNumber}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(stretch.targetMuscles || []).map((muscle: string, mIdx: number) => (
                    <Badge key={mIdx} variant="outline" className="capitalize text-xs">
                      {muscle.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-center">{stretch.durationSeconds}s</TableCell>
              {config.flexibilitySubType === 'pnf' && (
                <TableCell className="text-center">{stretch.reps || '-'}</TableCell>
              )}
              <TableCell className="text-sm text-gray-600">{stretch.notes || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Summary */}
      <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">
            {config.flexibilitySubType?.replace('_', ' ')} • {config.stretches?.length || 0} stretches
          </span>
          <span className="font-bold text-primary">
            Total: {config.totalDurationSeconds}s ({Math.round((config.totalDurationSeconds || 0) / 60)} min)
          </span>
        </div>
        {config.notes && (
          <div className="mt-2 pt-2 border-t text-gray-600">
            <strong>Notes:</strong> {config.notes}
          </div>
        )}
      </div>
    </>
  );
}

// Balance Exercise View
export function BalanceExerciseView({
  exercise,
}: {
  exercise: WorkoutAssignmentExercise;
}) {
  const config = exercise.configuration as any;
  
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-primary/20">
          <TableHead className="text-center">Round</TableHead>
          <TableHead className="text-center">Duration</TableHead>
          <TableHead className="text-center">Rest</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {config.rounds?.map((round: any, idx: number) => (
          <TableRow key={idx} className="border-primary/20">
            <TableCell className="text-center font-medium">{idx + 1}</TableCell>
            <TableCell className="text-center">{round.durationSeconds}s</TableCell>
            <TableCell className="text-center">{round.restSeconds}s</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Mobility Exercise View
export function MobilityExerciseView({
  exercise,
}: {
  exercise: WorkoutAssignmentExercise;
}) {
  const config = exercise.configuration as any;
  
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-primary/20">
          <TableHead className="text-center">Type</TableHead>
          <TableHead className="text-center">Total Duration</TableHead>
          {config.equipment && <TableHead className="text-center">Equipment</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="border-primary/20">
          <TableCell className="text-center capitalize font-medium">
            {config.mobilitySubType?.replace('_', ' ')}
          </TableCell>
          <TableCell className="text-center">
            {config.totalDurationSeconds}s
          </TableCell>
          {config.equipment && (
            <TableCell className="text-center capitalize">
              {config.equipment}
            </TableCell>
          )}
        </TableRow>
      </TableBody>
    </Table>
  );
}

// Plyometric Exercise View
export function PlyometricExerciseView({
  exercise,
}: {
  exercise: WorkoutAssignmentExercise;
}) {
  const config = exercise.configuration as any;
  
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-primary/20">
          <TableHead className="text-center">Set</TableHead>
          <TableHead className="text-center">Type</TableHead>
          <TableHead className="text-center">Target Reps</TableHead>
          <TableHead className="text-center">Rest</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {config.sets?.map((set: any, idx: number) => (
          <TableRow key={idx} className="border-primary/20">
            <TableCell className="text-center font-medium">{set.setNumber}</TableCell>
            <TableCell className="text-center capitalize">{set.setType?.replace('_', ' ')}</TableCell>
            <TableCell className="text-center">{set.targetReps} reps</TableCell>
            <TableCell className="text-center">{set.restSeconds}s</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Yoga/Pilates Exercise View
export function YogaPilatesExerciseView({
  exercise,
}: {
  exercise: WorkoutAssignmentExercise;
}) {
  const config = exercise.configuration as any;
  
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-primary/20">
          <TableHead className="text-center">Type</TableHead>
          <TableHead className="text-center">Duration</TableHead>
          <TableHead className="text-center">Intensity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="border-primary/20">
          <TableCell className="text-center capitalize font-medium">
            {config.yogaSubType?.replace('_', ' ')}
          </TableCell>
          <TableCell className="text-center">
            {Math.round(config.durationSeconds / 60)} min
          </TableCell>
          <TableCell className="text-center capitalize">
            {config.intensity}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
