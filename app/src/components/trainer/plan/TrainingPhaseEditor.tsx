"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Loader2, Calendar, Clock } from 'lucide-react';
import { updateTrainingPhase } from '@/lib/plan-api';
import { useToast } from '@/hooks/use-toast';
import { TrainingPhase, TrainingFocus, CardioType } from '@/types/plan';

interface TrainingPhaseEditorProps {
  clientId: string;
  trainerId: string;
  currentData?: {
    trainingPhase?: TrainingPhase;
    trainingFocus?: TrainingFocus;
    assignedDate?: string;
    planDurationWeeks?: number;
    workoutFrequency?: number;
    cardioType?: CardioType;
    cardioFrequency?: string;
    stepsPerDay?: string;
  };
  onUpdate: () => void;
}

const TRAINING_PHASE_OPTIONS: { value: TrainingPhase; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'muscle_building', label: 'Muscle Building' },
  { value: 'maintenance', label: 'Maintenance' },
];

const TRAINING_FOCUS_OPTIONS: { value: TrainingFocus; label: string }[] = [
  { value: 'full_body', label: 'Full Body' },
  { value: 'weekly_split', label: 'Weekly Split (Push / Pull / Legs)' },
  { value: 'upper_lower', label: 'Upper / Lower Split' },
  { value: 'daily_split', label: 'Daily Split' },
];

// Today's date in YYYY-MM-DD format (local timezone) for max constraint
const getTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Compute elapsed weeks from an ISO date string to today
const computeElapsedWeeks = (assignedDate: string): number => {
  const start = new Date(assignedDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
};

export function TrainingPhaseEditor({
  clientId,
  trainerId,
  currentData,
  onUpdate,
}: TrainingPhaseEditorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [trainingPhase, setTrainingPhase] = useState<TrainingPhase | ''>(
    currentData?.trainingPhase || ''
  );
  const [trainingFocus, setTrainingFocus] = useState<TrainingFocus | ''>(
    currentData?.trainingFocus || ''
  );
  const [assignedDate, setAssignedDate] = useState(currentData?.assignedDate || '');
  const [planDurationWeeks, setPlanDurationWeeks] = useState(
    currentData?.planDurationWeeks ? String(currentData.planDurationWeeks) : ''
  );
  const [workoutFrequency, setWorkoutFrequency] = useState(
    currentData?.workoutFrequency ? String(currentData.workoutFrequency) : ''
  );
  const [cardioType, setCardioType] = useState<CardioType | ''>(
    currentData?.cardioType || ''
  );
  const [cardioFrequency, setCardioFrequency] = useState(currentData?.cardioFrequency || '');
  const [stepsPerDay, setStepsPerDay] = useState(currentData?.stepsPerDay || '');

  // Sync when currentData changes
  useEffect(() => {
    setTrainingPhase(currentData?.trainingPhase || '');
    setTrainingFocus(currentData?.trainingFocus || '');
    setAssignedDate(currentData?.assignedDate || '');
    setPlanDurationWeeks(
      currentData?.planDurationWeeks ? String(currentData.planDurationWeeks) : ''
    );
    setWorkoutFrequency(
      currentData?.workoutFrequency ? String(currentData.workoutFrequency) : ''
    );
    setCardioType(currentData?.cardioType || '');
    setCardioFrequency(currentData?.cardioFrequency || '');
    setStepsPerDay(currentData?.stepsPerDay || '');
  }, [currentData]);

  // Compute elapsed weeks (derived — not stored)
  const elapsedWeeks = useMemo(() => {
    if (!assignedDate) return null;
    const weeks = computeElapsedWeeks(assignedDate);
    return weeks >= 0 ? weeks : 0;
  }, [assignedDate]);

  const elapsedLabel = useMemo(() => {
    if (elapsedWeeks === null) return null;
    if (planDurationWeeks) {
      return `Week ${elapsedWeeks + 1} of ${planDurationWeeks}`;
    }
    return `${elapsedWeeks} week${elapsedWeeks !== 1 ? 's' : ''} elapsed`;
  }, [elapsedWeeks, planDurationWeeks]);

  const handleSave = async () => {
    // Validate: if cardio type is selected, the corresponding value must be filled
    if (cardioType === 'cardio' && !cardioFrequency.trim()) {
      toast({
        title: 'Missing Cardio Value',
        description: 'Please enter the number of times per week for Cardio.',
        variant: 'destructive',
      });
      return;
    }
    if (cardioType === 'steps' && !stepsPerDay.trim()) {
      toast({
        title: 'Missing Steps Value',
        description: 'Please enter the number of steps per day.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const result = await updateTrainingPhase(clientId, trainerId, {
        trainingPhase: trainingPhase as TrainingPhase || undefined,
        trainingFocus: trainingFocus as TrainingFocus || undefined,
        assignedDate: assignedDate || undefined,
        planDurationWeeks: planDurationWeeks ? Number(planDurationWeeks) : undefined,
        workoutFrequency: workoutFrequency ? Number(workoutFrequency) : undefined,
        cardioType: cardioType as CardioType || undefined,
        cardioFrequency: cardioType === 'cardio' ? cardioFrequency || undefined : undefined,
        stepsPerDay: cardioType === 'steps' ? stepsPerDay || undefined : undefined,
      });

      if (result.success) {
        await onUpdate();
        toast({
          title: 'Training Phase Saved',
          description: 'Training phase details updated successfully.',
        });
      } else {
        toast({
          title: 'Save Failed',
          description: 'Failed to save. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving training phase:', error);
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Training Phase
        </CardTitle>
        <CardDescription>
          Configure your client&apos;s current training phase, frequency, and extra activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Row 1: Training Phase + Training Focus */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Training Phase</label>
            <Select
              value={trainingPhase}
              onValueChange={(val) => setTrainingPhase(val as TrainingPhase)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select phase..." />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_PHASE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Training Focus</label>
            <Select
              value={trainingFocus}
              onValueChange={(val) => setTrainingFocus(val as TrainingFocus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select focus..." />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_FOCUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Assigned Date | Plan Duration | Workout Frequency | Extra Activities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Assigned Date
            </label>
            <Input
              type="date"
              value={assignedDate}
              max={getTodayISO()}
              onChange={(e) => setAssignedDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Plan Duration</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={52}
                value={planDurationWeeks}
                onChange={(e) => setPlanDurationWeeks(e.target.value)}
                placeholder="12"
                className="w-20"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">weeks</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Workout Frequency</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={7}
                value={workoutFrequency}
                onChange={(e) => setWorkoutFrequency(e.target.value)}
                placeholder="4"
                className="w-16"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">/ week</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Extra Activities</label>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={cardioType}
                onValueChange={(val) => {
                  setCardioType(val as CardioType);
                  if (val === 'cardio') setStepsPerDay('');
                  if (val === 'steps') setCardioFrequency('');
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="steps">Steps</SelectItem>
                </SelectContent>
              </Select>

              {cardioType === 'cardio' && (
                <>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={cardioFrequency}
                    onChange={(e) => setCardioFrequency(e.target.value)}
                    placeholder="3"
                    className="w-14"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">×/wk</span>
                </>
              )}

              {cardioType === 'steps' && (
                <>
                  <Input
                    type="number"
                    min={0}
                    value={stepsPerDay}
                    onChange={(e) => setStepsPerDay(e.target.value)}
                    placeholder="10000"
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">/day</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Elapsed Time (read-only, computed) */}
        {elapsedLabel !== null && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
            <Clock className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-primary">{elapsedLabel}</span>
          </div>
        )}

        {/* Save button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Training Phase'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
