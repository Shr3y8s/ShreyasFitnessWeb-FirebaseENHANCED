'use client';

import React from 'react';
import { WorkoutAssignmentExercise, ExerciseConfigurationType } from '@/types/workout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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

interface CoreExerciseViewProps {
  exercise: WorkoutAssignmentExercise;
  exIndex: number;
  mode: ExerciseConfigurationMode;
  readOnly?: boolean;
  onExerciseUpdate?: (exerciseIndex: number, updatedConfig: ExerciseConfigurationType) => void;
}

// Sortable Row Component
function SortableRow({
  item,
  itemIndex,
  mode,
  readOnly,
  isRepBased,
  onItemChange,
  onRemoveItem,
  itemsLength,
}: {
  item: any;
  itemIndex: number;
  mode: ExerciseConfigurationMode;
  readOnly: boolean;
  isRepBased: boolean;
  onItemChange: (index: number, field: string, value: number) => void;
  onRemoveItem: (index: number) => void;
  itemsLength: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `item-${itemIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="border-primary/20">
      {/* Drag Handle */}
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
      
      {/* Number */}
      <TableCell className="text-center font-medium">
        <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
          {isRepBased ? item.setNumber : item.roundNumber}
        </Badge>
      </TableCell>
      
      {/* Target Reps OR Duration */}
      <TableCell className="text-center">
        {mode === 'configure' ? (
          <Input
            type="number"
            value={isRepBased ? item.targetReps : item.durationSeconds}
            onChange={(e) => onItemChange(itemIndex, isRepBased ? 'targetReps' : 'durationSeconds', parseInt(e.target.value) || 0)}
            className="text-center border-primary/20"
            disabled={readOnly}
            min="1"
          />
        ) : (
          <span className="font-medium">
            {isRepBased ? `${item.targetReps} reps` : `${item.durationSeconds}s`}
          </span>
        )}
      </TableCell>
      
      {/* Rest Seconds */}
      <TableCell className="text-center">
        {mode === 'configure' ? (
          <Input
            type="number"
            value={item.restSeconds}
            onChange={(e) => onItemChange(itemIndex, 'restSeconds', parseInt(e.target.value) || 0)}
            className="text-center border-primary/20"
            disabled={readOnly}
            min="0"
          />
        ) : (
          <span>{item.restSeconds}s</span>
        )}
      </TableCell>
      
      {/* Delete Button */}
      {mode === 'configure' && !readOnly && itemsLength > 1 && (
        <TableCell className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveItem(itemIndex)}
            className="h-8 w-8 p-0 hover:bg-destructive/10"
          >
            <MinusCircle className="h-4 w-4 text-destructive" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

export function CoreExerciseView({
  exercise,
  exIndex,
  mode,
  readOnly = false,
  onExerciseUpdate,
}: CoreExerciseViewProps) {
  const config = exercise.configuration as any;
  const isRepBased = config.coreSubType === 'rep_based';
  const items = isRepBased ? (config.sets || []) : (config.rounds || []);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSubtypeChange = (newSubtype: string) => {
    if (!onExerciseUpdate) return;
    
    let updatedConfig: any = {
      ...config,
      coreSubType: newSubtype,
    };

    if (newSubtype === 'rep_based') {
      updatedConfig.sets = [{
        setNumber: 1,
        targetReps: 15,
        restSeconds: 60,
      }];
      delete updatedConfig.rounds;
    } else {
      updatedConfig.rounds = [{
        roundNumber: 1,
        durationSeconds: 30,
        restSeconds: 60,
      }];
      delete updatedConfig.sets;
    }
    
    onExerciseUpdate(exIndex, updatedConfig);
  };

  const handleItemChange = (itemIndex: number, field: string, value: number) => {
    if (!onExerciseUpdate) return;
    
    const itemKey = isRepBased ? 'sets' : 'rounds';
    const updatedItems = [...items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: value,
    };
    
    const updatedConfig = {
      ...config,
      [itemKey]: updatedItems,
    };
    
    onExerciseUpdate(exIndex, updatedConfig);
  };

  const handleAddItem = () => {
    if (!onExerciseUpdate) return;
    
    const lastItem = items[items.length - 1];
    const itemKey = isRepBased ? 'sets' : 'rounds';
    const numberKey = isRepBased ? 'setNumber' : 'roundNumber';
    
    const newItem = isRepBased ? {
      setNumber: items.length + 1,
      targetReps: lastItem?.targetReps || 15,
      restSeconds: lastItem?.restSeconds || 60,
    } : {
      roundNumber: items.length + 1,
      durationSeconds: lastItem?.durationSeconds || 30,
      restSeconds: lastItem?.restSeconds || 60,
    };
    
    const updatedConfig = {
      ...config,
      [itemKey]: [...items, newItem],
    };
    
    onExerciseUpdate(exIndex, updatedConfig);
  };

  const handleRemoveItem = (itemIndex: number) => {
    if (!onExerciseUpdate || items.length <= 1) return;
    
    const itemKey = isRepBased ? 'sets' : 'rounds';
    const numberKey = isRepBased ? 'setNumber' : 'roundNumber';
    
    const updatedItems = items
      .filter((_: any, idx: number) => idx !== itemIndex)
      .map((item: any, idx: number) => ({
        ...item,
        [numberKey]: idx + 1,
      }));
    
    const updatedConfig = {
      ...config,
      [itemKey]: updatedItems,
    };
    
    onExerciseUpdate(exIndex, updatedConfig);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onExerciseUpdate) return;
    
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((_: any, idx: number) => `item-${idx}` === active.id);
      const newIndex = items.findIndex((_: any, idx: number) => `item-${idx}` === over.id);
      
      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      const numberKey = isRepBased ? 'setNumber' : 'roundNumber';
      const renumberedItems = reorderedItems.map((item: any, idx: number) => ({
        ...item,
        [numberKey]: idx + 1,
      }));
      
      const itemKey = isRepBased ? 'sets' : 'rounds';
      const updatedConfig = {
        ...config,
        [itemKey]: renumberedItems,
      };
      
      onExerciseUpdate(exIndex, updatedConfig);
    }
  };

  return (
    <div className="space-y-4">
      {/* Subtype Selector */}
      {mode === 'configure' && !readOnly && (
        <div className="space-y-2">
          <Label>Core Exercise Type</Label>
          <select
            value={config.coreSubType || 'rep_based'}
            onChange={(e) => handleSubtypeChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="rep_based">Rep Based (Crunches, Sit-ups)</option>
            <option value="duration_based">Duration Based (Planks, Holds)</option>
          </select>
        </div>
      )}

      {/* Table */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((_: any, idx: number) => `item-${idx}`)} strategy={verticalListSortingStrategy}>
          <Table>
            <TableHeader>
              <TableRow className="border-primary/20">
                {mode === 'configure' && !readOnly && (
                  <TableHead className="w-8"></TableHead>
                )}
                <TableHead className="w-16 text-center">
                  {isRepBased ? 'Set' : 'Round'}
                </TableHead>
                <TableHead className="text-center">
                  {isRepBased ? 'Target Reps' : 'Hold Duration (s)'}
                </TableHead>
                <TableHead className="w-32 text-center">Rest (s)</TableHead>
                {mode === 'configure' && !readOnly && items.length > 1 && (
                  <TableHead className="w-8"></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any, itemIndex: number) => (
                <SortableRow
                  key={`item-${itemIndex}`}
                  item={item}
                  itemIndex={itemIndex}
                  mode={mode}
                  readOnly={readOnly}
                  isRepBased={isRepBased}
                  onItemChange={handleItemChange}
                  onRemoveItem={handleRemoveItem}
                  itemsLength={items.length}
                />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>

      {/* Add Set/Round Button */}
      {mode === 'configure' && !readOnly && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {isRepBased ? 'Set' : 'Round'}
          </Button>
        </div>
      )}
    </div>
  );
}
