/**
 * WORKOUT UTILITY FUNCTIONS
 * Helper functions for working with polymorphic workout configurations
 */

import type {
  ExerciseConfiguration,
  ExerciseConfigurationType,
  StrengthConfiguration,
  CardioSteadyStateConfiguration,
  CardioIntervalsConfiguration,
} from '@/types/workout';

import {
  isStrengthConfiguration,
  isSteadyStateCardio,
  isIntervalCardio,
} from '@/types/workout';

// ============================================================================
// CONFIGURATION FORMATTING
// ============================================================================

/**
 * Format a configuration for display (summary view)
 * Returns a human-readable string describing the configuration
 */
export function formatConfiguration(config: ExerciseConfigurationType): string {
  if (isStrengthConfiguration(config)) {
    const sets = config.sets.length;
    const workingSets = config.sets.filter(s => s.setType === 'working').length;
    return `${sets} sets (${workingSets} working)`;
  } else if (isSteadyStateCardio(config)) {
    const minutes = Math.round(config.durationSeconds / 60);
    return `${minutes} min @ ${config.targetPace}`;
  } else if (isIntervalCardio(config)) {
    return `${config.totalRounds} rounds × ${config.intervals.length} intervals`;
  }
  return 'Unknown configuration';
}

/**
 * Format a detailed configuration description
 * Returns a more detailed string for full configuration views
 */
export function formatConfigurationDetailed(config: ExerciseConfigurationType): string {
  if (isStrengthConfiguration(config)) {
    const workingSets = config.sets.filter(s => s.setType === 'working');
    if (workingSets.length === 0) return formatConfiguration(config);
    
    const firstSet = workingSets[0];
    return `${workingSets.length}×${firstSet.targetReps} @ ${firstSet.weight} ${firstSet.weightUnit}`;
  } else if (isSteadyStateCardio(config)) {
    return `${formatDuration(config.durationSeconds)} @ ${config.targetPace}`;
  } else if (isIntervalCardio(config)) {
    const workInterval = config.intervals.find(i => i.type === 'work');
    const restInterval = config.intervals.find(i => i.type === 'rest');
    if (workInterval && restInterval) {
      return `${config.totalRounds} rounds: ${workInterval.durationSeconds}s work / ${restInterval.durationSeconds}s rest`;
    }
    return formatConfiguration(config);
  }
  return 'Unknown configuration';
}

/**
 * Get a user-friendly exercise type label
 */
export function getExerciseTypeLabel(exerciseType: string): string {
  const labels: Record<string, string> = {
    strength: 'Strength',
    cardio: 'Cardio',
    core: 'Core',
    flexibility: 'Flexibility',
    balance: 'Balance',
    mobility: 'Mobility',
    plyometric: 'Plyometric',
    yoga_pilates: 'Yoga/Pilates',
  };
  return labels[exerciseType] || exerciseType;
}

/**
 * Get color for exercise type (for badges/tags)
 */
export function getExerciseTypeColor(exerciseType: string): string {
  const colors: Record<string, string> = {
    strength: 'blue',
    cardio: 'red',
    core: 'purple',
    flexibility: 'green',
    balance: 'orange',
    mobility: 'cyan',
    plyometric: 'yellow',
    yoga_pilates: 'pink',
  };
  return colors[exerciseType] || 'gray';
}

// ============================================================================
// DURATION FORMATTING
// ============================================================================

/**
 * Format duration in seconds to human-readable string
 * @example formatDuration(90) => "1:30"
 * @example formatDuration(60) => "1 min"
 * @example formatDuration(30) => "30 sec"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec`;
  } else if (seconds % 60 === 0) {
    return `${seconds / 60} min`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Parse duration string to seconds
 * Handles formats like "1:30", "90", "1.5 min", "30 sec"
 */
export function parseDuration(durationStr: string): number {
  // Handle MM:SS format
  if (durationStr.includes(':')) {
    const [minutes, seconds] = durationStr.split(':').map(Number);
    return minutes * 60 + seconds;
  }
  
  // Handle "X min" or "X sec" format
  const match = durationStr.match(/^(\d+(?:\.\d+)?)\s*(min|sec)?$/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();
    
    if (unit === 'min') {
      return Math.round(value * 60);
    } else if (unit === 'sec') {
      return Math.round(value);
    }
    // No unit - assume seconds
    return Math.round(value);
  }
  
  return 0;
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validate strength configuration
 * Returns array of validation errors (empty if valid)
 */
export function validateStrengthConfiguration(config: StrengthConfiguration): string[] {
  const errors: string[] = [];
  
  if (!config.sets || config.sets.length === 0) {
    errors.push('At least one set is required');
  }
  
  config.sets.forEach((set, index) => {
    // Validate reps - skip validation for string values like "AMRAP" or "8-12"
    if (typeof set.targetReps === 'number' && set.targetReps <= 0) {
      errors.push(`Set ${index + 1}: Reps must be greater than 0`);
    }
    if (set.weight < 0) {
      errors.push(`Set ${index + 1}: Weight cannot be negative`);
    }
    if (set.restSeconds < 0) {
      errors.push(`Set ${index + 1}: Rest time cannot be negative`);
    }
    if (set.rpeTarget && (set.rpeTarget < 1 || set.rpeTarget > 10)) {
      errors.push(`Set ${index + 1}: RPE must be between 1 and 10`);
    }
  });
  
  return errors;
}

/**
 * Validate cardio steady state configuration
 */
export function validateCardioSteadyStateConfiguration(config: CardioSteadyStateConfiguration): string[] {
  const errors: string[] = [];
  
  if (config.durationSeconds <= 0) {
    errors.push('Duration must be greater than 0');
  }
  
  if (!config.targetPace || config.targetPace.trim().length === 0) {
    errors.push('Target pace is required');
  }
  
  if (config.targetHeartRate && (config.targetHeartRate < 40 || config.targetHeartRate > 220)) {
    errors.push('Target heart rate must be between 40 and 220 bpm');
  }
  
  return errors;
}

/**
 * Validate cardio intervals configuration
 */
export function validateCardioIntervalsConfiguration(config: CardioIntervalsConfiguration): string[] {
  const errors: string[] = [];
  
  if (!config.intervals || config.intervals.length === 0) {
    errors.push('At least one interval is required');
  }
  
  if (config.totalRounds <= 0) {
    errors.push('Total rounds must be greater than 0');
  }
  
  config.intervals.forEach((interval, index) => {
    if (interval.durationSeconds <= 0) {
      errors.push(`Interval ${index + 1}: Duration must be greater than 0`);
    }
    if (interval.targetHeartRate && (interval.targetHeartRate < 40 || interval.targetHeartRate > 220)) {
      errors.push(`Interval ${index + 1}: Target heart rate must be between 40 and 220 bpm`);
    }
  });
  
  return errors;
}

/**
 * Validate any exercise configuration
 * Returns array of validation errors (empty if valid)
 */
export function validateExerciseConfiguration(config: ExerciseConfigurationType): string[] {
  if (isStrengthConfiguration(config)) {
    return validateStrengthConfiguration(config);
  } else if (isSteadyStateCardio(config)) {
    return validateCardioSteadyStateConfiguration(config);
  } else if (isIntervalCardio(config)) {
    return validateCardioIntervalsConfiguration(config);
  }
  
  return ['Unknown configuration type'];
}

// ============================================================================
// CONFIGURATION COMPARISON (Planned vs Actual)
// ============================================================================

/**
 * Calculate the difference percentage between planned and actual for strength
 * Positive means exceeded plan, negative means fell short
 */
export function calculateStrengthDeviation(
  planned: StrengthConfiguration,
  actual: StrengthConfiguration
): { repsDeviation: number; weightDeviation: number } {
  let totalPlannedReps = 0;
  let totalActualReps = 0;
  let totalPlannedWeight = 0;
  let totalActualWeight = 0;
  
  // Calculate working sets only
  const plannedWorkingSets = planned.sets.filter(s => s.setType === 'working');
  const actualWorkingSets = actual.sets.filter(s => s.setType === 'working');
  
  plannedWorkingSets.forEach(set => {
    // Skip AMRAP sets in calculations
    if (typeof set.targetReps === 'number') {
      totalPlannedReps += set.targetReps;
      totalPlannedWeight += set.weight;
    }
  });
  
  actualWorkingSets.forEach(set => {
    // Skip AMRAP sets in calculations
    if (typeof set.targetReps === 'number') {
      totalActualReps += set.targetReps;
      totalActualWeight += set.weight;
    }
  });
  
  const repsDeviation = totalPlannedReps > 0 
    ? Math.round(((totalActualReps - totalPlannedReps) / totalPlannedReps) * 100)
    : 0;
    
  const weightDeviation = totalPlannedWeight > 0
    ? Math.round(((totalActualWeight - totalPlannedWeight) / totalPlannedWeight) * 100)
    : 0;
  
  return { repsDeviation, weightDeviation };
}

/**
 * Calculate completion percentage for an exercise
 * Based on how much of the planned configuration was completed
 */
export function calculateExerciseCompletion(
  planned: ExerciseConfigurationType,
  actual: ExerciseConfigurationType | null
): number {
  if (!actual) return 0;
  
  if (isStrengthConfiguration(planned) && isStrengthConfiguration(actual)) {
    const plannedSets = planned.sets.length;
    const actualSets = actual.sets.length;
    return Math.min(Math.round((actualSets / plannedSets) * 100), 100);
  } else if (isSteadyStateCardio(planned) && isSteadyStateCardio(actual)) {
    return Math.min(Math.round((actual.durationSeconds / planned.durationSeconds) * 100), 100);
  } else if (isIntervalCardio(planned) && isIntervalCardio(actual)) {
    return Math.min(Math.round((actual.totalRounds / planned.totalRounds) * 100), 100);
  }
  
  return 0;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Create a default strength configuration
 * Useful for initializing forms
 */
export function createDefaultStrengthConfiguration(): StrengthConfiguration {
  return {
    exerciseType: 'strength',
    strengthSubType: 'free_weight',
    sets: [
      {
        setNumber: 1,
        setType: 'warm_up',
        targetReps: '8-12',  // Most common default value
        repsRange: { min: 8, max: 12 },
        weight: 135,
        weightUnit: 'lbs',
        restSeconds: 90,
      },
      {
        setNumber: 2,
        setType: 'working',
        targetReps: '8-12',  // Most common default value
        repsRange: { min: 8, max: 12 },
        weight: 150,
        weightUnit: 'lbs',
        restSeconds: 120,
      },
      {
        setNumber: 3,
        setType: 'working',
        targetReps: '8-12',  // Most common default value
        repsRange: { min: 8, max: 12 },
        weight: 150,
        weightUnit: 'lbs',
        restSeconds: 120,
      },
    ],
    trackableFields: ['weight', 'reps', 'rest_time', 'rpe'],
  };
}

/**
 * Create a default cardio steady state configuration
 */
export function createDefaultCardioSteadyStateConfiguration(): CardioSteadyStateConfiguration {
  return {
    exerciseType: 'cardio',
    cardioSubType: 'steady_state',
    machineType: 'treadmill',
    durationSeconds: 1800, // 30 minutes
    targetPace: '6.0 mph',
  };
}

/**
 * Create a default cardio intervals configuration
 */
export function createDefaultCardioIntervalsConfiguration(): CardioIntervalsConfiguration {
  return {
    exerciseType: 'cardio',
    cardioSubType: 'intervals',
    machineType: 'treadmill',
    intervals: [
      {
        intervalNumber: 1,
        type: 'work',
        durationSeconds: 30,
        intensity: 'high',
      },
      {
        intervalNumber: 2,
        type: 'rest',
        durationSeconds: 30,
        intensity: 'light',
      },
    ],
    totalRounds: 8,
  };
}

/**
 * Create a default core rep-based configuration
 */
export function createDefaultCoreRepBasedConfiguration() {
  return {
    exerciseType: 'core' as const,
    coreSubType: 'rep_based' as const,
    sets: [
      { setNumber: 1, targetReps: 15, restSeconds: 60 },
      { setNumber: 2, targetReps: 15, restSeconds: 60 },
      { setNumber: 3, targetReps: 15, restSeconds: 60 },
    ],
    trackableFields: ['reps', 'rest_time'],
  };
}

/**
 * Create a default core duration-based configuration
 */
export function createDefaultCoreDurationBasedConfiguration() {
  return {
    exerciseType: 'core' as const,
    coreSubType: 'duration_based' as const,
    rounds: [
      { roundNumber: 1, durationSeconds: 60, restSeconds: 60 },
      { roundNumber: 2, durationSeconds: 60, restSeconds: 60 },
      { roundNumber: 3, durationSeconds: 60 },
    ],
    trackableFields: ['duration'],
  };
}

/**
 * Create a default cardio activity-based configuration
 */
export function createDefaultCardioActivityBasedConfiguration() {
  return {
    exerciseType: 'cardio' as const,
    cardioSubType: 'activity_based' as const,
    activity: 'running' as const,
    durationSeconds: 1800, // 30 minutes
    intensity: 'moderate' as const,
  };
}

/**
 * Create a default cardio steps-based configuration
 */
export function createDefaultCardioStepsBasedConfiguration() {
  return {
    exerciseType: 'cardio' as const,
    cardioSubType: 'steps_based' as const,
    machineType: 'none' as const,  // Default to 'none' for walking
    targetSteps: 500,
    pace: 'moderate' as const,
  };
}

/**
 * Create a default flexibility configuration
 */
export function createDefaultFlexibilityConfiguration() {
  return {
    exerciseType: 'flexibility' as const,
    flexibilitySubType: 'static_stretch' as const,
    targetAreas: ['hamstrings', 'quadriceps', 'hip_flexors'],
    stretches: [
      { stretchNumber: 1, muscleGroup: 'hamstrings', durationSeconds: 30 },
      { stretchNumber: 2, muscleGroup: 'quadriceps', durationSeconds: 30 },
      { stretchNumber: 3, muscleGroup: 'hip_flexors', durationSeconds: 30 },
    ],
    totalDurationSeconds: 180,
    intensity: 'light' as const,
  };
}

/**
 * Create a default balance configuration
 */
export function createDefaultBalanceConfiguration() {
  return {
    exerciseType: 'balance' as const,
    balanceSubType: 'bodyweight' as const,
    rounds: [
      { roundNumber: 1, durationSeconds: 30, restSeconds: 30 },
      { roundNumber: 2, durationSeconds: 30, restSeconds: 30 },
      { roundNumber: 3, durationSeconds: 30 },
    ],
    trackableFields: ['duration'],
  };
}

/**
 * Create a default mobility configuration
 */
export function createDefaultMobilityConfiguration() {
  return {
    exerciseType: 'mobility' as const,
    mobilitySubType: 'foam_roll' as const,
    equipment: 'foam_roller',
    targetAreas: ['quads', 'hamstrings', 'back'],
    areas: [
      { areaNumber: 1, muscleGroup: 'quads', durationSeconds: 60 },
      { areaNumber: 2, muscleGroup: 'hamstrings', durationSeconds: 60 },
      { areaNumber: 3, muscleGroup: 'back', durationSeconds: 60 },
    ],
    totalDurationSeconds: 180,
  };
}

/**
 * Create a default plyometric configuration
 */
export function createDefaultPlyometricConfiguration() {
  return {
    exerciseType: 'plyometric' as const,
    plyometricSubType: 'jumping' as const,
    sets: [
      { setNumber: 1, setType: 'warm_up' as const, targetReps: 5, restSeconds: 120 },
      { setNumber: 2, setType: 'working' as const, targetReps: 10, restSeconds: 180 },
      { setNumber: 3, setType: 'working' as const, targetReps: 10, restSeconds: 180 },
    ],
    trackableFields: ['reps', 'rest_time'],
  };
}

/**
 * Create a default yoga/pilates configuration
 */
export function createDefaultYogaPilatesConfiguration() {
  return {
    exerciseType: 'yoga_pilates' as const,
    yogaSubType: 'yoga_flow' as const,
    durationSeconds: 1800, // 30 minutes
    intensity: 'moderate' as const,
    focusAreas: ['flexibility', 'balance', 'mindfulness'],
  };
}

// ============================================================================
// EXPORT ALL TYPE GUARDS FOR CONVENIENCE
// ============================================================================

export {
  isStrengthConfiguration,
  isSteadyStateCardio,
  isIntervalCardio,
  type ExerciseConfigurationType,
  type StrengthConfiguration,
  type CardioSteadyStateConfiguration,
  type CardioIntervalsConfiguration,
};
