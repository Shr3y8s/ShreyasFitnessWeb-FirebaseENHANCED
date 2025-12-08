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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, MinusCircle, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ExerciseConfigurationMode = 'display' | 'configure' | 'track' | 'input';

// Sortable Set Row Component
function SortableSetRow({
  set,
  setIndex,
  setId,
  mode,
  readOnly,
  exIndex,
  performanceData,
  onInputChange,
  onConfigureChange,
  onRemoveSet,
  setsLength,
}: {
  set: any;
  setIndex: number;
  setId: string;
  mode: ExerciseConfigurationMode;
  readOnly: boolean;
  exIndex: number;
  performanceData: { [key: string]: any };
  onInputChange: (setId: string, field: 'weight' | 'reps', value: string) => void;
  onConfigureChange: (setIndex: number, field: 'weight' | 'targetReps' | 'restSeconds' | 'setType', value: number | string) => void;
  onRemoveSet: (setIndex: number) => void;
  setsLength: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `set-${setIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const setData = performanceData[setId] || {};

  return (
    <TableRow ref={setNodeRef} style={style} className="border-primary/20">
      {/* Drag Handle (only in configure mode, not readOnly) */}
      {mode === 'configure' && !readOnly && (
        <TableCell className="text-center">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        </TableCell>
      )}
      
      {/* Set Number */}
      <TableCell className="text-center font-medium">
        <div className="flex justify-center">
          <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
            {set.setNumber}
          </Badge>
        </div>
      </TableCell>
      
      {mode === 'configure' && (
        <>
          {/* Type Dropdown */}
          <TableCell className="text-center">
            <select
              value={set.setType || 'working'}
              onChange={(e) => onConfigureChange(setIndex, 'setType', e.target.value)}
              disabled={readOnly}
              className="w-full px-2 py-1.5 border rounded text-sm capitalize"
            >
              <option value="warm_up">Warm-up</option>
              <option value="working">Working</option>
              <option value="drop_set">Drop Set</option>
              <option value="to_failure">To Failure</option>
            </select>
          </TableCell>

          {/* Smart Reps Input */}
          <TableCell className="text-center">
            {(() => {
              const presetValues = ['8-12', '6-8', '10-15', '12-15', '15-20', 'AMRAP'];
              const isCustom = set.targetReps && !presetValues.includes(set.targetReps);
              
              if (isCustom) {
                return (
                  <Input
                    type="text"
                    value={set.targetReps}
                    onChange={(e) => onConfigureChange(setIndex, 'targetReps', e.target.value)}
                    placeholder="e.g., 10, 5-7, AMRAP"
                    className="text-center border-primary/20"
                    disabled={readOnly}
                  />
                );
              }
              
              return (
                <select
                  value={set.targetReps || '8-12'}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      onConfigureChange(setIndex, 'targetReps', ' ');
                    } else {
                      onConfigureChange(setIndex, 'targetReps', e.target.value);
                    }
                  }}
                  disabled={readOnly}
                  className="w-full px-2 py-1.5 border rounded text-sm text-center border-primary/20"
                >
                  <option value="8-12">8-12 reps (Hypertrophy)</option>
                  <option value="6-8">6-8 reps (Strength)</option>
                  <option value="10-15">10-15 reps (Endurance)</option>
                  <option value="12-15">12-15 reps (Toning)</option>
                  <option value="15-20">15-20 reps (High Volume)</option>
                  <option value="AMRAP">AMRAP (As Many As Possible)</option>
                  <option value="custom">Other (enter custom)...</option>
                </select>
              );
            })()}
          </TableCell>

          {/* Weight Input */}
          <TableCell className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Input
                type="number"
                value={set.weight || 0}
                onChange={(e) => onConfigureChange(setIndex, 'weight', parseInt(e.target.value) || 0)}
                className="text-center border-primary/20 w-16"
                disabled={readOnly}
              />
              <span className="text-xs text-muted-foreground">{set.weightUnit}</span>
            </div>
          </TableCell>

          {/* Rest Input */}
          <TableCell className="text-center">
            <Input
              type="number"
              value={set.restSeconds}
              onChange={(e) => onConfigureChange(setIndex, 'restSeconds', parseInt(e.target.value) || 0)}
              className="text-center border-primary/20"
              disabled={readOnly}
            />
          </TableCell>
          
          {/* Delete Button */}
          {!readOnly && setsLength > 1 && (
            <TableCell className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveSet(setIndex)}
                className="h-8 w-8 p-0 hover:bg-destructive/10"
              >
                <MinusCircle className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          )}
        </>
      )}
      
      {mode !== 'configure' && (
        <TableCell className="text-center">
          <div className="flex flex-col items-center gap-1">
            {set.weight && (
              <span className="text-xs font-semibold text-primary">
                {set.weight} {set.weightUnit}
              </span>
            )}
            <Badge variant="outline" className="border-primary text-primary">
              {set.targetReps} reps
            </Badge>
          </div>
        </TableCell>
      )}
      
      {mode === 'input' && (
        <>
          <TableCell>
            <Input
              type="number"
              placeholder={set.weight?.toString() || "0"}
              className="text-center border-primary/20"
              value={setData.weight || ''}
              onChange={(e) => onInputChange(setId, 'weight', e.target.value)}
              disabled={readOnly}
            />
          </TableCell>
          <TableCell>
            <Input
              type="number"
              placeholder="0"
              className="text-center border-primary/20"
              value={setData.reps || ''}
              onChange={(e) => onInputChange(setId, 'reps', e.target.value)}
              disabled={readOnly}
            />
          </TableCell>
        </>
      )}
      
      {mode === 'display' && (
        <TableCell className="text-center text-sm">
          {set.weight} {set.weightUnit} × {set.targetReps} reps ({set.restSeconds}s rest)
        </TableCell>
      )}
    </TableRow>
  );
}

interface StrengthExerciseViewProps {
  exercise: WorkoutAssignmentExercise;
  exIndex: number;
  mode: ExerciseConfigurationMode;
  readOnly: boolean;
  performanceData: { [key: string]: any };
  onPerformanceChange: (data: { [key: string]: any }) => void;
  onExerciseUpdate?: (exerciseIndex: number, updatedConfig: ExerciseConfigurationType) => void;
}

export function StrengthExerciseView({
  exercise,
  exIndex,
  mode,
  readOnly,
  performanceData,
  onPerformanceChange,
  onExerciseUpdate,
}: StrengthExerciseViewProps) {
  const config = exercise.configuration as any;
  const sets = config.sets || [];

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle set reordering
  const handleDragEnd = (event: DragEndEvent) => {
    if (!onExerciseUpdate) return;
    
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sets.findIndex((_: any, idx: number) => `set-${idx}` === active.id);
      const newIndex = sets.findIndex((_: any, idx: number) => `set-${idx}` === over.id);
      
      const reorderedSets = arrayMove(sets, oldIndex, newIndex);
      const renumberedSets = reorderedSets.map((set: any, idx: number) => ({
        ...set,
        setNumber: idx + 1,
      }));
      
      const updatedConfig = {
        ...config,
        sets: renumberedSets,
      };
      
      onExerciseUpdate(exIndex, updatedConfig);
    }
  };

  const handleInputChange = (setId: string, field: 'weight' | 'reps', value: string) => {
    onPerformanceChange({
      ...performanceData,
      [setId]: {
        ...(performanceData[setId] || {}),
        [field]: value,
      },
    });
  };

  const handleConfigureChange = (setIndex: number, field: 'weight' | 'targetReps' | 'restSeconds' | 'setType', value: number | string) => {
    if (!onExerciseUpdate) return;
    
    const updatedSets = sets.map((set: any, idx: number) => 
      idx === setIndex ? { ...set, [field]: value } : set
    );
    
    const updatedConfig = {
      ...config,
      sets: updatedSets,
    };
    
    onExerciseUpdate(exIndex, updatedConfig);
  };

  const handleAddSet = () => {
    if (!onExerciseUpdate) return;
    
    const lastSet = sets[sets.length - 1] || {
      weight: 135,
      weightUnit: 'lbs',
      targetReps: '8-12',
      restSeconds: 120,
      setType: 'working',
    };
    
    const newSet = {
      setNumber: sets.length + 1,
      weight: lastSet.weight,
      weightUnit: lastSet.weightUnit,
      targetReps: lastSet.targetReps,
      restSeconds: lastSet.restSeconds,
      setType: 'working',
    };
    
    const updatedConfig = {
      ...config,
      sets: [...sets, newSet],
    };
    
    onExerciseUpdate(exIndex, updatedConfig);
  };

  const handleRemoveSet = (setIndex: number) => {
    if (!onExerciseUpdate || sets.length <= 1) return;
    
    const updatedSets = sets
      .filter((_: any, idx: number) => idx !== setIndex)
      .map((set: any, idx: number) => ({
        ...set,
        setNumber: idx + 1,
      }));
    
    const updatedConfig = {
      ...config,
      sets: updatedSets,
    };
    
    onExerciseUpdate(exIndex, updatedConfig);
  };


  const handleArmLegTypeChange = (newType: 'single' | 'double' | 'alternate') => {
    if (!onExerciseUpdate) return;
    
    const updatedConfig = {
      ...config,
      armLegType: newType,
    };
    
    onExerciseUpdate(exIndex, updatedConfig);
  };

  return (
    <>
      {/* Arm/Leg Type Selector - Only in Configure Mode */}
      {mode === 'configure' && !readOnly && (
        <div className="mb-4 space-y-2">
          <label className="text-sm font-medium">Arm/Leg Type</label>
          <select
            value={config.armLegType || 'double'}
            onChange={(e) => handleArmLegTypeChange(e.target.value as 'single' | 'double' | 'alternate')}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="double">Double Arm/Leg</option>
            <option value="single">Single Arm/Leg</option>
            <option value="alternate">Alternate Arm/Leg</option>
          </select>
        </div>
      )}

      {/* Display Arm/Leg Type in Display Mode */}
      {mode === 'display' && config.armLegType && (
        <div className="mb-3">
          <Badge variant="outline" className="text-xs">
            {config.armLegType === 'double' && 'Double Arm/Leg'}
            {config.armLegType === 'single' && 'Single Arm/Leg'}
            {config.armLegType === 'alternate' && 'Alternate Arm/Leg'}
          </Badge>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sets.map((_: any, idx: number) => `set-${idx}`)} strategy={verticalListSortingStrategy}>
          <Table>
            <TableHeader>
            <TableRow className="border-primary/20">
              {mode === 'configure' && !readOnly && (
                <TableHead className="w-8"></TableHead>
              )}
              <TableHead className="w-16 text-center">Set</TableHead>
              {mode === 'configure' && (
                <>
                  <TableHead className="w-32 text-center">Type</TableHead>
                  <TableHead className="w-48 text-center">Reps</TableHead>
                  <TableHead className="w-24 text-center">Weight</TableHead>
                  <TableHead className="w-24 text-center">Rest (s)</TableHead>
                  {!readOnly && sets.length > 1 && (
                    <TableHead className="w-8"></TableHead>
                  )}
                </>
              )}
              {mode !== 'configure' && <TableHead className="text-center">Target</TableHead>}
              {mode === 'input' && (
                <>
                  <TableHead className="w-32 text-center">Weight (lbs)</TableHead>
                  <TableHead className="w-32 text-center">Actual Reps</TableHead>
                </>
              )}
              {mode === 'display' && (
                <TableHead className="text-center">Parameters</TableHead>
              )}
            </TableRow>
          </TableHeader>
            <TableBody>
              {sets.map((set: any, setIndex: number) => {
                const setId = `${exIndex}-${setIndex}`;

                return (
                  <SortableSetRow
                    key={`set-${setIndex}`}
                    set={set}
                    setIndex={setIndex}
                    setId={setId}
                    mode={mode}
                    readOnly={readOnly}
                    exIndex={exIndex}
                    performanceData={performanceData}
                    onInputChange={handleInputChange}
                    onConfigureChange={handleConfigureChange}
                    onRemoveSet={handleRemoveSet}
                    setsLength={sets.length}
                  />
                );
              })}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
    
    {/* Add Set Button (configure mode only) */}
    {mode === 'configure' && !readOnly && (
      <div className="mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSet}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Set
        </Button>
      </div>
    )}
  </>
  );
}
