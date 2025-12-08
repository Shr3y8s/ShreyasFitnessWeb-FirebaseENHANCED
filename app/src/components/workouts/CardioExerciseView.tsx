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
import { Label } from '@/components/ui/label';

type ExerciseConfigurationMode = 'display' | 'configure' | 'track' | 'input';

interface CardioExerciseViewProps {
  exercise: WorkoutAssignmentExercise;
  exIndex: number;
  mode: ExerciseConfigurationMode;
  readOnly: boolean;
  performanceData?: { [key: string]: any };
  onPerformanceChange?: (data: { [key: string]: any }) => void;
  onExerciseUpdate?: (exerciseIndex: number, updatedConfig: ExerciseConfigurationType) => void;
}

export function CardioExerciseView({
  exercise,
  exIndex,
  mode,
  readOnly,
  onExerciseUpdate,
}: CardioExerciseViewProps) {
  const config = exercise.configuration as any;
  
  const handleConfigChange = (field: string, value: any) => {
    if (!onExerciseUpdate) return;
    
    const updatedConfig = {
      ...config,
      [field]: value,
    };
    
    onExerciseUpdate(exIndex, updatedConfig);
  };

  const handleSubtypeChange = (newSubtype: string) => {
    if (!onExerciseUpdate) return;
    
    // Set default values for each subtype
    let updatedConfig: any = {
      ...config,
      cardioSubType: newSubtype,
    };

    switch (newSubtype) {
      case 'steady_state':
        updatedConfig = {
          ...updatedConfig,
          machineType: 'treadmill',
          durationSeconds: 1800, // 30 min
          targetHeartRate: '120-130',
          targetPace: null,
        };
        break;
      case 'intervals':
        updatedConfig = {
          ...updatedConfig,
          machineType: 'treadmill',
          totalRounds: 8,
          workDurationSeconds: 30,
          restDurationSeconds: 30,
        };
        break;
      case 'activity_based':
        updatedConfig = {
          ...updatedConfig,
          activity: 'Running',
          intensity: 'moderate',
          durationSeconds: 1800, // 30 min
          targetHeartRate: '120-130',
        };
        break;
      case 'steps_based':
        updatedConfig = {
          ...updatedConfig,
          machineType: null,
          targetSteps: 10000,
          pace: 'moderate',
        };
        break;
    }
    
    onExerciseUpdate(exIndex, updatedConfig);
  };

  return (
    <div className="space-y-4">
      {/* Subtype Selector - Only in Configure Mode */}
      {mode === 'configure' && !readOnly && (
        <div className="space-y-2">
          <Label>Cardio Type</Label>
          <select
            value={config.cardioSubType || 'steady_state'}
            onChange={(e) => handleSubtypeChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="steady_state">Steady State</option>
            <option value="intervals">Intervals</option>
            <option value="activity_based">Activity Based</option>
            <option value="steps_based">Steps Based</option>
          </select>
        </div>
      )}

      {/* Steady State Configuration */}
      {config.cardioSubType === 'steady_state' && (
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20">
              <TableHead className="text-center">Machine</TableHead>
              <TableHead className="text-center">Duration (min)</TableHead>
              <TableHead className="text-center">Target HR (bpm)</TableHead>
              <TableHead className="text-center">Target Pace</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-primary/20">
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <select
                    value={config.machineType || 'treadmill'}
                    onChange={(e) => handleConfigChange('machineType', e.target.value)}
                    disabled={readOnly}
                    className="w-full px-2 py-1.5 border rounded text-sm"
                  >
                    <option value="treadmill">Treadmill</option>
                    <option value="bike">Bike</option>
                    <option value="elliptical">Elliptical</option>
                    <option value="rower">Rower</option>
                    <option value="stairmaster">Stairmaster</option>
                    <option value="assault_bike">Assault Bike</option>
                  </select>
                ) : (
                  <span className="capitalize">{config.machineType?.replace('_', ' ')}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <Input
                    type="number"
                    value={Math.round((config.durationSeconds || 1800) / 60)}
                    onChange={(e) => {
                      const minutes = parseInt(e.target.value) || 0;
                      handleConfigChange('durationSeconds', minutes * 60);
                    }}
                    className="text-center border-primary/20"
                    disabled={readOnly}
                    min="1"
                  />
                ) : (
                  <span className="font-medium">{Math.round((config.durationSeconds || 0) / 60)} min</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <Input
                    type="text"
                    value={config.targetHeartRate || '120-130'}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleConfigChange('targetHeartRate', value || '120-130');
                    }}
                    placeholder="e.g., 120-130"
                    className="text-center border-primary/20"
                    disabled={readOnly}
                  />
                ) : (
                  <span>{config.targetHeartRate || '120-130'} bpm</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <Input
                    type="text"
                    value={config.targetPace || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleConfigChange('targetPace', value || null);
                    }}
                    placeholder="e.g., 6.0 mph"
                    className="text-center border-primary/20"
                    disabled={readOnly}
                  />
                ) : (
                  <span>{config.targetPace || '-'}</span>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {/* Intervals Configuration */}
      {config.cardioSubType === 'intervals' && (
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20">
              <TableHead className="text-center">Machine</TableHead>
              <TableHead className="text-center">Total Rounds</TableHead>
              <TableHead className="text-center">Work Duration (sec)</TableHead>
              <TableHead className="text-center">Rest Duration (sec)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-primary/20">
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <select
                    value={config.machineType || 'treadmill'}
                    onChange={(e) => handleConfigChange('machineType', e.target.value)}
                    disabled={readOnly}
                    className="w-full px-2 py-1.5 border rounded text-sm"
                  >
                    <option value="treadmill">Treadmill</option>
                    <option value="bike">Bike</option>
                    <option value="assault_bike">Assault Bike</option>
                    <option value="rower">Rower</option>
                    <option value="track">Track/Outdoor</option>
                  </select>
                ) : (
                  <span className="capitalize">{config.machineType?.replace('_', ' ')}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <Input
                    type="number"
                    value={config.totalRounds || 8}
                    onChange={(e) => handleConfigChange('totalRounds', parseInt(e.target.value) || 8)}
                    className="text-center border-primary/20"
                    disabled={readOnly}
                    min="1"
                  />
                ) : (
                  <span className="font-medium">{config.totalRounds}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <Input
                    type="number"
                    value={config.workDurationSeconds || 30}
                    onChange={(e) => handleConfigChange('workDurationSeconds', parseInt(e.target.value) || 30)}
                    className="text-center border-primary/20"
                    disabled={readOnly}
                    min="5"
                  />
                ) : (
                  <span className="font-medium">{config.workDurationSeconds}s</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <Input
                    type="number"
                    value={config.restDurationSeconds || 30}
                    onChange={(e) => handleConfigChange('restDurationSeconds', parseInt(e.target.value) || 30)}
                    className="text-center border-primary/20"
                    disabled={readOnly}
                    min="5"
                  />
                ) : (
                  <span className="font-medium">{config.restDurationSeconds}s</span>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {/* Activity Based Configuration */}
      {config.cardioSubType === 'activity_based' && (
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20">
              <TableHead className="text-center">Activity</TableHead>
              <TableHead className="text-center">Intensity</TableHead>
              <TableHead className="text-center">Duration (min)</TableHead>
              <TableHead className="text-center">Target HR (bpm)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-primary/20">
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  (() => {
                    const predefinedActivities = ['Running', 'Swimming', 'Cycling', 'Rowing', 'Walking', 'Hiking', 'Jump Rope', 'Stair Climbing'];
                    const isCustom = config.activity && !predefinedActivities.includes(config.activity);
                    
                    if (isCustom) {
                      return (
                        <Input
                          type="text"
                          value={config.activity}
                          onChange={(e) => handleConfigChange('activity', e.target.value)}
                          placeholder="Enter activity"
                          className="text-center border-primary/20"
                          disabled={readOnly}
                        />
                      );
                    }
                    
                    return (
                      <select
                        value={config.activity || 'Running'}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            handleConfigChange('activity', ' ');
                          } else {
                            handleConfigChange('activity', e.target.value);
                          }
                        }}
                        disabled={readOnly}
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      >
                        <option value="Running">Running</option>
                        <option value="Swimming">Swimming</option>
                        <option value="Cycling">Cycling</option>
                        <option value="Rowing">Rowing</option>
                        <option value="Walking">Walking</option>
                        <option value="Hiking">Hiking</option>
                        <option value="Jump Rope">Jump Rope</option>
                        <option value="Stair Climbing">Stair Climbing</option>
                        <option value="custom">Other (enter custom)...</option>
                      </select>
                    );
                  })()
                ) : (
                  <span className="capitalize font-medium">{config.activity}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <select
                    value={config.intensity || 'moderate'}
                    onChange={(e) => handleConfigChange('intensity', e.target.value)}
                    disabled={readOnly}
                    className="w-full px-2 py-1.5 border rounded text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="max">Max</option>
                  </select>
                ) : (
                  <span className="capitalize">{config.intensity}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <Input
                    type="number"
                    value={Math.round((config.durationSeconds || 1800) / 60)}
                    onChange={(e) => {
                      const minutes = parseInt(e.target.value) || 0;
                      handleConfigChange('durationSeconds', minutes * 60);
                    }}
                    className="text-center border-primary/20"
                    disabled={readOnly}
                    min="1"
                  />
                ) : (
                  <span className="font-medium">{Math.round((config.durationSeconds || 0) / 60)} min</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <Input
                    type="text"
                    value={config.targetHeartRate || '120-130'}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleConfigChange('targetHeartRate', value || '120-130');
                    }}
                    placeholder="e.g., 120-130"
                    className="text-center border-primary/20"
                    disabled={readOnly}
                  />
                ) : (
                  <span>{config.targetHeartRate || '120-130'} bpm</span>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {/* Steps Based Configuration */}
      {config.cardioSubType === 'steps_based' && (
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20">
              <TableHead className="text-center">Machine</TableHead>
              <TableHead className="text-center">Target Steps</TableHead>
              <TableHead className="text-center">Pace</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-primary/20">
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <select
                    value={config.machineType || 'none'}
                    onChange={(e) => handleConfigChange('machineType', e.target.value === 'none' ? null : e.target.value)}
                    disabled={readOnly}
                    className="w-full px-2 py-1.5 border rounded text-sm"
                  >
                    <option value="none">None (Walking)</option>
                    <option value="treadmill">Treadmill</option>
                    <option value="stairmaster">Stairmaster</option>
                  </select>
                ) : (
                  <span className="capitalize">{config.machineType?.replace('_', ' ') || 'None'}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <Input
                    type="number"
                    value={config.targetSteps || 10000}
                    onChange={(e) => handleConfigChange('targetSteps', parseInt(e.target.value) || 10000)}
                    className="text-center border-primary/20"
                    disabled={readOnly}
                    min="100"
                    step="100"
                  />
                ) : (
                  <span className="font-medium">{config.targetSteps?.toLocaleString()}</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {mode === 'configure' ? (
                  <select
                    value={config.pace || 'moderate'}
                    onChange={(e) => handleConfigChange('pace', e.target.value)}
                    disabled={readOnly}
                    className="w-full px-2 py-1.5 border rounded text-sm"
                  >
                    <option value="slow">Slow</option>
                    <option value="moderate">Moderate</option>
                    <option value="brisk">Brisk</option>
                    <option value="fast">Fast</option>
                  </select>
                ) : (
                  <span className="capitalize">{config.pace}</span>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {/* Fallback for unknown or missing subtype */}
      {!config.cardioSubType && mode !== 'configure' && (
        <div className="text-center text-muted-foreground py-4">
          No cardio subtype configured
        </div>
      )}
    </div>
  );
}
