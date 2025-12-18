# Comprehensive Fitness Trainer Dashboard Data Model

## Table of Contents
1. [Overview](#overview)
2. [Core Entities](#core-entities)
3. [Exercise Definition](#exercise-definition)
4. [Workout Definition](#workout-definition)
5. [Workout Assignment](#workout-assignment)
6. [Workout Execution](#workout-execution)
7. [Complete JSON Examples](#complete-json-examples)

---

## Overview

This data model supports a complete fitness trainer dashboard system that allows trainers to:
1. Create exercises and maintain an exercise library
2. Define workouts by composing exercises from the library
3. Assign workouts to clients with exercise-specific configurations
4. Track client workout completion (partial or full)

The model is **polymorphic** — it handles 8 different exercise types (strength, cardio, core, flexibility, balance, mobility, plyometric, yoga/pilates) with type-specific configuration structures.

### Key Design Principles

- **Exercise Library**: Immutable exercise definitions (name, category, equipment, muscle groups, etc.)
- **Workout Template**: Reusable workout definitions that reference exercises
- **Workout Assignment**: Instance of a workout assigned to a specific client with configured parameters
- **Execution Tracking**: Records actual performance vs. planned performance

---

## Core Entities

### 1. Exercise (Exercise Library)

**Purpose**: Master definition of an exercise used across workouts. Immutable base information.

```json
{
  "id": "ex_[UUID]",
  "name": "string (required)",
  "description": "string (optional)",
  "category": "enum: strength | cardio | core | flexibility | balance | mobility | plyometric | yoga_pilates",
  
  "equipment": ["string array"],
  "primaryMuscles": ["string array"],
  "secondaryMuscles": ["string array"],
  "muscleGroup": "enum: upper_body | lower_body | full_body | core",
  "movementPattern": "enum: squat | hinge | push | pull | carry | rotation | isolation",
  "planeOfMotion": "enum: sagittal | frontal | transverse | multi_planar",
  
  "difficulty": "enum: beginner | intermediate | advanced",
  "videoUrl": "string (optional)",
  "imageUrl": "string (optional)",
  "aliases": ["string array"],
  
  "createdBy": "string (trainer ID)",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

**Examples**:
```json
{
  "id": "ex_001",
  "name": "Barbell Back Squat",
  "category": "strength",
  "equipment": ["barbell", "squat_rack"],
  "primaryMuscles": ["quadriceps", "glutes"],
  "secondaryMuscles": ["hamstrings", "erector_spinae"],
  "muscleGroup": "lower_body",
  "movementPattern": "squat",
  "difficulty": "intermediate"
}
```

```json
{
  "id": "ex_002",
  "name": "Plank",
  "category": "core",
  "equipment": ["none"],
  "primaryMuscles": ["rectus_abdominis", "transverse_abdominis"],
  "secondaryMuscles": ["erector_spinae", "deltoids"],
  "difficulty": "beginner"
}
```

```json
{
  "id": "ex_003",
  "name": "Treadmill Run",
  "category": "cardio",
  "equipment": ["treadmill"],
  "primaryMuscles": ["quadriceps", "glutes", "calves"],
  "difficulty": "intermediate"
}
```

```json
{
  "id": "ex_004",
  "name": "Hamstring Stretch",
  "category": "flexibility",
  "equipment": ["none"],
  "primaryMuscles": ["hamstrings"],
  "difficulty": "beginner"
}
```

---

### 2. Workout Template (Reusable Workout Definition)

**Purpose**: Defines a reusable workout structure that trainers can use as a blueprint for multiple clients.

```json
{
  "id": "wt_[UUID]",
  "name": "string (required)",
  "description": "string (optional)",
  "category": "enum: strength | cardio | mixed | recovery",
  "intensity": "enum: light | moderate | high | variable",
  "estimatedDurationMinutes": "number",
  "targetMuscleGroups": ["string array"],
  
  "exercises": [
    {
      "order": "number",
      "exerciseId": "string (reference to Exercise)",
      "configurationTemplate": "object (type-specific, see below)"
    }
  ],
  
  "createdBy": "string (trainer ID)",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp",
  "isPublic": "boolean (can other trainers use this?)"
}
```

**Example**:
```json
{
  "id": "wt_001",
  "name": "Upper Body Strength A",
  "category": "strength",
  "intensity": "high",
  "estimatedDurationMinutes": 60,
  "exercises": [
    {
      "order": 1,
      "exerciseId": "ex_001",
      "configurationTemplate": { /* see Exercise Configuration sections below */ }
    }
  ]
}
```

---

### 3. Workout Assignment

**Purpose**: Instance of a workout assigned to a specific client. Contains actual configured parameters for that client.

```json
{
  "id": "wa_[UUID]",
  "workoutTemplateId": "string (optional - can be null if custom workout)",
  "clientId": "string (required)",
  "trainerId": "string (required)",
  
  "name": "string (required - can differ from template)",
  "description": "string (optional)",
  "scheduledDate": "ISO 8601 date (YYYY-MM-DD)",
  "assignedAt": "ISO 8601 timestamp",
  "dueDate": "ISO 8601 date (optional)",
  
  "status": "enum: scheduled | in_progress | completed | skipped | cancelled",
  "completionPercentage": "number (0-100, calculated)",
  
  "exercises": [
    {
      "order": "number",
      "exerciseId": "string (reference to Exercise)",
      "exerciseName": "string (denormalized for display)",
      "exerciseType": "string (denormalized: strength | cardio | core | flexibility | balance | mobility | plyometric | yoga_pilates)",
      "configuration": "object (type-specific, see sections below)",
      "notes": "string (optional coaching cues)"
    }
  ],
  
  "notes": "string (optional)",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

---

### 4. Workout Execution (Completed Workout Record)

**Purpose**: Records actual client performance of an assigned workout.

```json
{
  "id": "we_[UUID]",
  "workoutAssignmentId": "string (reference to Workout Assignment)",
  "clientId": "string (required)",
  "trainerId": "string (required)",
  
  "startedAt": "ISO 8601 timestamp",
  "completedAt": "ISO 8601 timestamp (null if incomplete)",
  "durationMinutes": "number",
  
  "overallNotes": "string (optional)",
  "completionStatus": "enum: not_started | in_progress | partial | completed",
  
  "exercises": [
    {
      "exerciseId": "string",
      "exerciseName": "string",
      "exerciseType": "string",
      "completionStatus": "enum: not_started | partial | completed",
      "completionPercentage": "number (0-100)",
      
      "plannedConfiguration": "object (what was planned)",
      "actualConfiguration": "object (what was performed, type-specific)",
      
      "notes": "string (optional)",
      "deviations": ["string array (optional - notes on what differed from plan)"]
    }
  ],
  
  "createdAt": "ISO 8601 timestamp"
}
```

---

## Exercise Configuration

All configurations follow this pattern:
- **Planned configuration** is stored in `Workout Assignment`
- **Actual configuration** is recorded in `Workout Execution`

### Configuration Type 1: STRENGTH

**Applies to**: Strength exercises with weights, reps, and sets

```json
{
  "exerciseType": "strength",
  "strengthSubType": "enum: free_weight | machine | bodyweight | cable | resistance_band",
  
  "sets": [
    {
      "setNumber": "number (1, 2, 3, ...)",
      "setType": "enum: warm_up | working | drop_set | rest_pause | pyramid | pre_exhaustion | cluster | to_failure",
      
      "targetReps": "number (e.g., 8)",
      "repsRange": "object (optional: { min: 6, max: 10 })",
      "weight": "number (lbs or kg)",
      "weightUnit": "enum: lbs | kg",
      
      "restSeconds": "number",
      "rpeTarget": "number (1-10, optional - Rate of Perceived Exertion)",
      "rirTarget": "number (optional - Reps In Reserve)",
      
      "notes": "string (optional coaching cues)"
    }
  ],
  
  "trackableFields": ["weight", "reps", "rest_time", "rpe", "rir"],
  "progressionScheme": "enum: linear | double_progression | percentage_based (optional)"
}
```

**Example**:
```json
{
  "exerciseType": "strength",
  "strengthSubType": "free_weight",
  "sets": [
    {
      "setNumber": 1,
      "setType": "warm_up",
      "targetReps": 5,
      "weight": 135,
      "weightUnit": "lbs",
      "restSeconds": 180
    },
    {
      "setNumber": 2,
      "setType": "working",
      "targetReps": 8,
      "weight": 225,
      "weightUnit": "lbs",
      "restSeconds": 180,
      "rpeTarget": 7
    },
    {
      "setNumber": 3,
      "setType": "working",
      "targetReps": 8,
      "weight": 225,
      "weightUnit": "lbs",
      "restSeconds": 180,
      "rpeTarget": 7
    }
  ]
}
```

**Actual Performance Example**:
```json
{
  "exerciseType": "strength",
  "sets": [
    {
      "setNumber": 1,
      "actualReps": 5,
      "actualWeight": 135,
      "actualRestSeconds": 175,
      "actualRpe": 3
    },
    {
      "setNumber": 2,
      "actualReps": 8,
      "actualWeight": 225,
      "actualRestSeconds": 185,
      "actualRpe": 7
    },
    {
      "setNumber": 3,
      "actualReps": 7,
      "actualWeight": 225,
      "actualRestSeconds": 190,
      "actualRpe": 8
    }
  ]
}
```

---

### Configuration Type 2: CORE - REP BASED

**Applies to**: Core exercises measured by reps (crunches, leg raises)

```json
{
  "exerciseType": "core",
  "coreSubType": "rep_based",
  
  "sets": [
    {
      "setNumber": "number",
      "targetReps": "number",
      "restSeconds": "number",
      "notes": "string (optional)"
    }
  ],
  
  "trackableFields": ["reps", "rest_time"]
}
```

**Example**:
```json
{
  "exerciseType": "core",
  "coreSubType": "rep_based",
  "sets": [
    {
      "setNumber": 1,
      "targetReps": 15,
      "restSeconds": 60
    },
    {
      "setNumber": 2,
      "targetReps": 15,
      "restSeconds": 60
    }
  ]
}
```

---

### Configuration Type 3: CORE - DURATION BASED

**Applies to**: Core exercises measured by time (plank, hollow hold)

```json
{
  "exerciseType": "core",
  "coreSubType": "duration_based",
  
  "rounds": [
    {
      "roundNumber": "number",
      "durationSeconds": "number",
      "restSeconds": "number (rest after this round, optional)",
      "intensity": "enum: light | moderate | high (optional)",
      "notes": "string (optional)"
    }
  ],
  
  "trackableFields": ["duration"]
}
```

**Example - Multiple Rounds**:
```json
{
  "exerciseType": "core",
  "coreSubType": "duration_based",
  "rounds": [
    {
      "roundNumber": 1,
      "durationSeconds": 60,
      "restSeconds": 60
    },
    {
      "roundNumber": 2,
      "durationSeconds": 60,
      "restSeconds": 60
    },
    {
      "roundNumber": 3,
      "durationSeconds": 60
    }
  ]
}
```

**Example - Single Duration (Simple)**:
```json
{
  "exerciseType": "core",
  "coreSubType": "duration_based",
  "durationSeconds": 60,
  "trackableFields": ["duration"]
}
```

---

### Configuration Type 4: CARDIO - STEADY STATE

**Applies to**: Continuous cardio (treadmill run, bike ride)

```json
{
  "exerciseType": "cardio",
  "cardioSubType": "steady_state",
  "machineType": "enum: treadmill | stationary_bike | recumbent_bike | rowing_machine | elliptical | stair_climber | air_bike | skierg | vertical_climber",
  
  "durationSeconds": "number (total time)",
  "targetPace": "string (e.g., '6.0 mph', '8:00/mile', '100 watts')",
  
  "targetHeartRate": "number (optional, e.g., 140 bpm)",
  "heartRateZone": "enum: z1 | z2 | z3 | z4 | z5 (optional)",
  
  "notes": "string (optional)"
}
```

**Example - Treadmill**:
```json
{
  "exerciseType": "cardio",
  "cardioSubType": "steady_state",
  "machineType": "treadmill",
  "durationSeconds": 1800,
  "targetPace": "6.0 mph"
}
```

**Example - Rowing Machine**:
```json
{
  "exerciseType": "cardio",
  "cardioSubType": "steady_state",
  "machineType": "rowing_machine",
  "durationSeconds": 1200,
  "targetPace": "2:00 per 500m",
  "targetHeartRate": 145
}
```

**Actual Performance Example**:
```json
{
  "exerciseType": "cardio",
  "cardioSubType": "steady_state",
  "actualDurationSeconds": 1805,
  "actualPace": "5.9 mph",
  "actualDistance": 3.1,
  "actualCalories": 245,
  "actualAverageHeartRate": 142,
  "notes": "Felt good, could have gone longer"
}
```

---

### Configuration Type 5: CARDIO - INTERVALS (HIIT)

**Applies to**: High-intensity interval training (sprints, Tabata, circuit)

```json
{
  "exerciseType": "cardio",
  "cardioSubType": "intervals",
  "machineType": "enum: treadmill | stationary_bike | air_bike | rowing_machine | ski_erg | none (for bodyweight HIIT)",
  
  "intervals": [
    {
      "intervalNumber": "number",
      "type": "enum: work | rest | recovery",
      "durationSeconds": "number",
      "intensity": "enum: light | moderate | high",
      "targetPace": "string (optional)",
      "targetHeartRate": "number (optional)",
      "notes": "string (optional)"
    }
  ],
  
  "totalRounds": "number (how many times to repeat the interval sequence)",
  "restBetweenRounds": "number (seconds rest between complete rounds, optional)",
  
  "notes": "string (optional)"
}
```

**Example - Tabata Style (20 sec work / 10 sec rest)**:
```json
{
  "exerciseType": "cardio",
  "cardioSubType": "intervals",
  "machineType": "air_bike",
  
  "intervals": [
    {
      "intervalNumber": 1,
      "type": "work",
      "durationSeconds": 20,
      "intensity": "high"
    },
    {
      "intervalNumber": 2,
      "type": "rest",
      "durationSeconds": 10,
      "intensity": "light"
    }
  ],
  
  "totalRounds": 8
}
```

**Example - Pyramid Intervals**:
```json
{
  "exerciseType": "cardio",
  "cardioSubType": "intervals",
  "machineType": "treadmill",
  
  "intervals": [
    {
      "intervalNumber": 1,
      "type": "work",
      "durationSeconds": 60,
      "intensity": "high",
      "targetPace": "7.0 mph"
    },
    {
      "intervalNumber": 2,
      "type": "recovery",
      "durationSeconds": 60,
      "intensity": "light",
      "targetPace": "4.0 mph"
    },
    {
      "intervalNumber": 3,
      "type": "work",
      "durationSeconds": 120,
      "intensity": "high",
      "targetPace": "7.0 mph"
    },
    {
      "intervalNumber": 4,
      "type": "recovery",
      "durationSeconds": 120,
      "intensity": "light",
      "targetPace": "4.0 mph"
    }
  ],
  
  "totalRounds": 3
}
```

---

### Configuration Type 6: CARDIO - ACTIVITY BASED

**Applies to**: Free-form activities (basketball, tennis, running outdoors, hiking)

```json
{
  "exerciseType": "cardio",
  "cardioSubType": "activity_based",
  "activity": "enum: walking | running | hiking | basketball | tennis | soccer | climbing | swimming | other",
  
  "durationSeconds": "number (estimated)",
  "intensity": "enum: light | moderate | high",
  
  "targetHeartRate": "number (optional)",
  "notes": "string (optional)"
}
```

**Example**:
```json
{
  "exerciseType": "cardio",
  "cardioSubType": "activity_based",
  "activity": "basketball",
  "durationSeconds": 3600,
  "intensity": "moderate",
  "notes": "Recreational league game"
}
```

**Actual Performance Example**:
```json
{
  "exerciseType": "cardio",
  "cardioSubType": "activity_based",
  "actualDurationSeconds": 3480,
  "actualHeartRate": 155,
  "notes": "Won the game! Great conditioning"
}
```

---

### Configuration Type 7: CARDIO - STEPS BASED

**Applies to**: Step/rep-counted cardio (stair climbing, step platform, walking)

```json
{
  "exerciseType": "cardio",
  "cardioSubType": "steps_based",
  "machineType": "enum: none | stair_climber | step_platform",
  
  "targetSteps": "number",
  "pace": "enum: slow | moderate | fast",
  
  "durationTargetSeconds": "number (optional - if duration matters)",
  
  "notes": "string (optional)"
}
```

**Example**:
```json
{
  "exerciseType": "cardio",
  "cardioSubType": "steps_based",
  "machineType": "stair_climber",
  "targetSteps": 1000,
  "pace": "moderate"
}
```

**Actual Performance Example**:
```json
{
  "exerciseType": "cardio",
  "cardioSubType": "steps_based",
  "actualSteps": 985,
  "actualDurationSeconds": 450,
  "notes": "Lower back felt tight at end"
}
```

---

### Configuration Type 8: FLEXIBILITY

**Applies to**: Stretching and flexibility work

```json
{
  "exerciseType": "flexibility",
  "flexibilitySubType": "enum: static_stretch | dynamic_stretch | pnf",
  
  "targetAreas": ["string array - muscle groups to stretch"],
  
  "stretches": [
    {
      "stretchNumber": "number",
      "muscleGroup": "string",
      "durationSeconds": "number",
      "reps": "number (for PNF, optional)",
      "notes": "string (optional)"
    }
  ],
  
  "totalDurationSeconds": "number (total estimated time)",
  "intensity": "enum: light | moderate",
  
  "notes": "string (optional)"
}
```

**Example - Static Stretching**:
```json
{
  "exerciseType": "flexibility",
  "flexibilitySubType": "static_stretch",
  "targetAreas": ["hamstrings", "quadriceps", "hip_flexors", "chest"],
  
  "stretches": [
    {
      "stretchNumber": 1,
      "muscleGroup": "hamstrings",
      "durationSeconds": 30
    },
    {
      "stretchNumber": 2,
      "muscleGroup": "quadriceps",
      "durationSeconds": 30
    },
    {
      "stretchNumber": 3,
      "muscleGroup": "hip_flexors",
      "durationSeconds": 30
    }
  ],
  
  "totalDurationSeconds": 300
}
```

**Actual Performance Example**:
```json
{
  "exerciseType": "flexibility",
  "actualTotalDurationSeconds": 295,
  "stretchesCompleted": 3,
  "notes": "Hip flexors still tight"
}
```

---

### Configuration Type 9: BALANCE

**Applies to**: Balance and proprioceptive training

```json
{
  "exerciseType": "balance",
  "balanceSubType": "enum: bodyweight | equipment_assisted | unstable_surface",
  "equipment": "string (optional - e.g., 'bosu_ball', 'balance_board')",
  
  "rounds": [
    {
      "roundNumber": "number",
      "durationSeconds": "number (or reps)",
      "reps": "number (optional - for counting rather than timing)",
      "restSeconds": "number (optional)",
      "intensity": "enum: light | moderate | high (optional)",
      "notes": "string (optional)"
    }
  ],
  
  "trackableFields": ["duration", "reps"],
  "notes": "string (optional)"
}
```

**Example - Duration-Based**:
```json
{
  "exerciseType": "balance",
  "balanceSubType": "equipment_assisted",
  "equipment": "bosu_ball",
  
  "rounds": [
    {
      "roundNumber": 1,
      "durationSeconds": 60,
      "restSeconds": 30
    },
    {
      "roundNumber": 2,
      "durationSeconds": 60,
      "restSeconds": 30
    }
  ]
}
```

**Example - Rep-Based**:
```json
{
  "exerciseType": "balance",
  "balanceSubType": "bodyweight",
  
  "rounds": [
    {
      "roundNumber": 1,
      "reps": 10,
      "restSeconds": 30
    },
    {
      "roundNumber": 2,
      "reps": 10,
      "restSeconds": 30
    }
  ]
}
```

---

### Configuration Type 10: MOBILITY

**Applies to**: Myofascial release and mobility drills (foam rolling, trigger point work)

```json
{
  "exerciseType": "mobility",
  "mobilitySubType": "enum: foam_roll | trigger_point | dynamic_drill",
  "equipment": "string (e.g., 'foam_roller', 'lacrosse_ball')",
  
  "targetAreas": ["string array - areas to release"],
  
  "areas": [
    {
      "areaNumber": "number",
      "muscleGroup": "string",
      "durationSeconds": "number",
      "intensity": "enum: light | moderate | high (optional)",
      "notes": "string (optional)"
    }
  ],
  
  "totalDurationSeconds": "number",
  "notes": "string (optional)"
}
```

**Example - Foam Rolling**:
```json
{
  "exerciseType": "mobility",
  "mobilitySubType": "foam_roll",
  "equipment": "foam_roller",
  "targetAreas": ["quads", "hamstrings", "calves", "back"],
  
  "areas": [
    {
      "areaNumber": 1,
      "muscleGroup": "quads",
      "durationSeconds": 120
    },
    {
      "areaNumber": 2,
      "muscleGroup": "hamstrings",
      "durationSeconds": 120
    },
    {
      "areaNumber": 3,
      "muscleGroup": "calves",
      "durationSeconds": 90
    },
    {
      "areaNumber": 4,
      "muscleGroup": "back",
      "durationSeconds": 120
    }
  ],
  
  "totalDurationSeconds": 450
}
```

**Actual Performance Example**:
```json
{
  "exerciseType": "mobility",
  "actualTotalDurationSeconds": 440,
  "areasCompleted": 4,
  "notes": "Quads were very sore"
}
```

---

### Configuration Type 11: PLYOMETRIC

**Applies to**: Explosive/ballistic movements (similar to strength but emphasizes power/speed)

```json
{
  "exerciseType": "plyometric",
  "plyometricSubType": "enum: jumping | throwing | bounding",
  
  "sets": [
    {
      "setNumber": "number",
      "setType": "enum: warm_up | working | to_failure",
      "targetReps": "number",
      "restSeconds": "number",
      "intensity": "enum: light | moderate | high (optional)",
      "notes": "string (optional - focus on speed, form cues)"
    }
  ],
  
  "trackableFields": ["reps", "rest_time"],
  "notes": "string (optional - e.g., 'Focus on explosive movement')"
}
```

**Example**:
```json
{
  "exerciseType": "plyometric",
  "plyometricSubType": "jumping",
  
  "sets": [
    {
      "setNumber": 1,
      "setType": "warm_up",
      "targetReps": 5,
      "restSeconds": 120
    },
    {
      "setNumber": 2,
      "setType": "working",
      "targetReps": 10,
      "restSeconds": 180
    },
    {
      "setNumber": 3,
      "setType": "working",
      "targetReps": 10,
      "restSeconds": 180
    }
  ],
  
  "notes": "Jump as high as possible, focus on landing softly"
}
```

---

### Configuration Type 12: YOGA/PILATES

**Applies to**: Yoga flows, Pilates sessions

```json
{
  "exerciseType": "yoga_pilates",
  "yogaSubType": "enum: yoga_flow | yoga_poses | pilates_mat | pilates_reformer",
  
  "style": "string (optional - e.g., 'vinyasa', 'hatha', 'power yoga')",
  "durationSeconds": "number",
  "intensity": "enum: light | moderate | high",
  
  "focusAreas": ["string array (optional - e.g., 'hip_opening', 'core_strength')"],
  
  "notes": "string (optional)"
}
```

**Example - Yoga Flow**:
```json
{
  "exerciseType": "yoga_pilates",
  "yogaSubType": "yoga_flow",
  "style": "vinyasa",
  "durationSeconds": 1800,
  "intensity": "moderate",
  "focusAreas": ["flexibility", "balance", "mindfulness"]
}
```

**Example - Pilates Mat**:
```json
{
  "exerciseType": "yoga_pilates",
  "yogaSubType": "pilates_mat",
  "durationSeconds": 1200,
  "intensity": "moderate",
  "focusAreas": ["core", "posture", "stability"]
}
```

**Actual Performance Example**:
```json
{
  "exerciseType": "yoga_pilates",
  "actualDurationSeconds": 1750,
  "completionPercentage": 100,
  "notes": "Felt great, very relaxing"
}
```

---

## Complete JSON Examples

### Example 1: Full Strength Workout Assignment

```json
{
  "id": "wa_001",
  "workoutTemplateId": "wt_001",
  "clientId": "client_123",
  "trainerId": "trainer_456",
  "name": "Upper Body Strength A",
  "scheduledDate": "2025-12-05",
  "status": "scheduled",
  "completionPercentage": 0,
  "exercises": [
    {
      "order": 1,
      "exerciseId": "ex_001",
      "exerciseName": "Barbell Bench Press",
      "exerciseType": "strength",
      "configuration": {
        "exerciseType": "strength",
        "strengthSubType": "free_weight",
        "sets": [
          {
            "setNumber": 1,
            "setType": "warm_up",
            "targetReps": 5,
            "weight": 135,
            "weightUnit": "lbs",
            "restSeconds": 180
          },
          {
            "setNumber": 2,
            "setType": "warm_up",
            "targetReps": 3,
            "weight": 185,
            "weightUnit": "lbs",
            "restSeconds": 180
          },
          {
            "setNumber": 3,
            "setType": "working",
            "targetReps": 5,
            "weight": 225,
            "weightUnit": "lbs",
            "restSeconds": 240,
            "rpeTarget": 7
          },
          {
            "setNumber": 4,
