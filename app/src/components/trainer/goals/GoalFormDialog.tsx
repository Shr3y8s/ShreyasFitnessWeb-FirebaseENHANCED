'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Target, Check } from 'lucide-react';
import { 
  Goal, 
  GoalCategory, 
  GoalTerm, 
  GoalPriority,
  GOAL_CATEGORIES,
  getCategoryMetadata 
} from '@/types/goals';
import { Card } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface MilestoneData {
  tempId: string;
  text: string;
  targetValue: number;
  autoTracked: boolean;
}

export interface GoalFormData {
  title: string;
  category: GoalCategory | '';
  term: GoalTerm;
  priority: GoalPriority;
  // Streak-based fields (for steps, water, nutrition, workouts)
  dailyTarget?: number;
  targetStreak?: number;
  currentStreak?: number;
  // Value-based fields (for weight, strength, setup)
  targetValue?: number;
  currentValue?: number;
  unit: string;
  deadline: Date | undefined;
  exerciseId?: string;
  exerciseName?: string;
  lowerIsBetter: boolean;
  milestones: MilestoneData[];
}

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goalData: GoalFormData) => void;
  editingGoal?: Goal | null;
  clientName: string;
  preselectedCategory?: GoalCategory; // Skip category selection if provided
}

export function GoalFormDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  editingGoal,
  clientName,
  preselectedCategory 
}: GoalFormDialogProps) {
  const [step, setStep] = useState<'category' | 'config'>('category');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | ''>('');
  
  // Category-specific form data
  const [stepsConfig, setStepsConfig] = useState({ steps: 10000, days: [3, 5, 7] });
  const [waterConfig, setWaterConfig] = useState({ amount: 64, unit: 'oz', days: [3, 5, 7] });
  const [nutritionConfig, setNutritionConfig] = useState({ daysPerWeek: 7, weeks: [2, 3, 4] });
  const [workoutConfig, setWorkoutConfig] = useState({ workoutsPerWeek: 3, weeks: [2, 3, 4] });
  const [weightConfig, setWeightConfig] = useState({ current: 212, target: 180, milestones: [205, 195, 185] });
  const [weightMilestoneConfig, setWeightMilestoneConfig] = useState({ current: 212, incrementalPounds: [2, 3, 5] });
  const [strengthConfig, setStrengthConfig] = useState({ exerciseId: '', exerciseName: '', current: 185, target: 225, milestones: [200, 215, 225] });
  const [strengthExercises, setStrengthExercises] = useState<Array<{ id: string; name: string }>>([]);
  
  // Common fields
  const [term, setTerm] = useState<GoalTerm>('short-term');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);

  // Fetch strength exercises when strength category selected
  useEffect(() => {
    if (selectedCategory === 'strength' && open) {
      const fetchExercises = async () => {
        try {
          const q = query(
            collection(db, 'exercises'),
            where('category', '==', 'strength'),
            where('isActive', '==', true)
          );
          const snapshot = await getDocs(q);
          const exercises = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name
          }));
          setStrengthExercises(exercises);
        } catch (error) {
          console.error('Error fetching strength exercises:', error);
          setStrengthExercises([]);
        }
      };
      fetchExercises();
    }
  }, [selectedCategory, open]);

  // Initialize with preselected category if provided
  useEffect(() => {
    if (open) {
      if (preselectedCategory) {
        setSelectedCategory(preselectedCategory);
        setStep('config');
        
        // Auto-set term if category has fixedTerm
        const categoryMeta = getCategoryMetadata(preselectedCategory);
        if (categoryMeta.fixedTerm) {
          setTerm(categoryMeta.fixedTerm);
        }
      } else if (editingGoal) {
        setSelectedCategory(editingGoal.category);
        setStep('config');
      } else {
        setSelectedCategory('');
        setStep('category');
      }
    } else {
      // Reset on close
      setStep('category');
      setSelectedCategory('');
    }
  }, [open, preselectedCategory, editingGoal]);

  const handleCategorySelect = (category: GoalCategory) => {
    setSelectedCategory(category);
    setStep('config');
  };

  const handleBack = () => {
    setStep('category');
  };

  const generateStepsGoal = () => {
    const milestones: MilestoneData[] = stepsConfig.days.map((days, idx) => ({
      tempId: `m-${idx}`,
      text: `Walk ${stepsConfig.steps.toLocaleString()} steps for ${days} consecutive days`,
      targetValue: days,
      autoTracked: true
    }));

    return {
      title: `Walk ${stepsConfig.steps.toLocaleString()} Steps Daily`,
      category: 'steps' as GoalCategory,
      term,
      priority,
      dailyTarget: stepsConfig.steps,
      targetStreak: Math.max(...stepsConfig.days),
      currentStreak: 0,
      unit: 'consecutive days',
      deadline,
      exerciseId: '',
      exerciseName: '',
      lowerIsBetter: false,
      milestones
    };
  };

  const generateWaterGoal = () => {
    const milestones: MilestoneData[] = waterConfig.days.map((days, idx) => ({
      tempId: `m-${idx}`,
      text: `Drink ${waterConfig.amount} ${waterConfig.unit} for ${days} consecutive days`,
      targetValue: days,
      autoTracked: true
    }));

    return {
      title: `Drink ${waterConfig.amount} ${waterConfig.unit} Daily`,
      category: 'water' as GoalCategory,
      term,
      priority,
      dailyTarget: waterConfig.amount,
      targetStreak: Math.max(...waterConfig.days),
      currentStreak: 0,
      unit: 'consecutive days',
      deadline,
      exerciseId: '',
      exerciseName: '',
      lowerIsBetter: false,
      milestones
    };
  };

  const generateNutritionGoal = () => {
    const milestones: MilestoneData[] = nutritionConfig.weeks.map((weeks, idx) => ({
      tempId: `m-${idx}`,
      text: `Follow meal plan ${nutritionConfig.daysPerWeek} days/week for ${weeks} weeks`,
      targetValue: weeks,
      autoTracked: true
    }));

    return {
      title: `Follow Meal Plan ${nutritionConfig.daysPerWeek} Days Per Week`,
      category: 'nutrition' as GoalCategory,
      term,
      priority,
      targetValue: Math.max(...nutritionConfig.weeks),
      currentValue: 0,
      unit: 'consecutive weeks',
      deadline,
      exerciseId: '',
      exerciseName: '',
      lowerIsBetter: false,
      milestones
    };
  };

  const generateWorkoutGoal = () => {
    const milestones: MilestoneData[] = workoutConfig.weeks.map((weeks, idx) => ({
      tempId: `m-${idx}`,
      text: `Complete ${workoutConfig.workoutsPerWeek} workouts/week for ${weeks} weeks`,
      targetValue: weeks,
      autoTracked: true
    }));

    return {
      title: `Complete ${workoutConfig.workoutsPerWeek} Workouts Per Week`,
      category: 'workout_consistency' as GoalCategory,
      term,
      priority,
      targetValue: Math.max(...workoutConfig.weeks),
      currentValue: 0,
      unit: 'consecutive weeks',
      deadline,
      exerciseId: '',
      exerciseName: '',
      lowerIsBetter: false,
      milestones
    };
  };

  const generateWeightGoal = () => {
    const milestones: MilestoneData[] = weightConfig.milestones.map((weight, idx) => ({
      tempId: `m-${idx}`,
      text: `Reach ${weight} lbs`,
      targetValue: weight,
      autoTracked: true
    }));

    return {
      title: `Reach Target Weight of ${weightConfig.target} lbs`,
      category: 'weight_loss' as GoalCategory,
      term,
      priority,
      targetValue: weightConfig.target,
      currentValue: weightConfig.current,
      unit: 'lbs',
      deadline,
      exerciseId: '',
      exerciseName: '',
      lowerIsBetter: true,
      milestones
    };
  };

  const generateWeightMilestoneGoal = () => {
    // weightMilestoneConfig.incrementalPounds contains incremental pounds to lose
    const milestones: MilestoneData[] = weightMilestoneConfig.incrementalPounds.map((lbsToLose, idx) => {
      const targetWeight = weightMilestoneConfig.current - lbsToLose;
      const isLastMilestone = idx === weightMilestoneConfig.incrementalPounds.length - 1;
      
      return {
        tempId: `m-${idx}`,
        text: isLastMilestone 
          ? `Reach the ${lbsToLose}-pound loss milestone`
          : `Lose the first ${lbsToLose} pounds`,
        targetValue: targetWeight,
        autoTracked: true
      };
    });

    const totalLossTarget = Math.max(...weightMilestoneConfig.incrementalPounds);
    const targetWeight = weightMilestoneConfig.current - totalLossTarget;

    return {
      title: `Lose First ${totalLossTarget} Pounds`,
      category: 'weight_loss_st' as GoalCategory,
      term,
      priority,
      targetValue: targetWeight,
      currentValue: weightMilestoneConfig.current,
      unit: 'lbs',
      deadline,
      exerciseId: '',
      exerciseName: '',
      lowerIsBetter: true,
      milestones
    };
  };

  const generateStrengthGoal = () => {
    const milestones: MilestoneData[] = strengthConfig.milestones.map((weight, idx) => ({
      tempId: `m-${idx}`,
      text: `${strengthConfig.exerciseName}: ${weight} lbs`,
      targetValue: weight,
      autoTracked: false // Manually tracked
    }));

    return {
      title: `${strengthConfig.exerciseName}: ${strengthConfig.target} lbs`,
      category: 'strength' as GoalCategory,
      term,
      priority,
      targetValue: strengthConfig.target,
      currentValue: strengthConfig.current,
      unit: 'lbs',
      deadline,
      exerciseId: strengthConfig.exerciseId,
      exerciseName: strengthConfig.exerciseName,
      lowerIsBetter: false,
      milestones
    };
  };

  const generateSetupGoal = () => {
    // Predefined milestones for onboarding
    const milestones: MilestoneData[] = [
      {
        tempId: 'm-0',
        text: 'Schedule your 30-minute planning consultation',
        targetValue: 1,
        autoTracked: false
      },
      {
        tempId: 'm-1',
        text: 'Complete your consultation',
        targetValue: 2,
        autoTracked: false
      },
      {
        tempId: 'm-2',
        text: 'Receive your personalized fitness plan',
        targetValue: 3,
        autoTracked: false
      }
    ];

    return {
      title: 'Complete Your Onboarding',
      category: 'setup' as GoalCategory,
      term,
      priority,
      targetValue: 3,
      currentValue: 0,
      unit: 'tasks',
      deadline,
      exerciseId: '',
      exerciseName: '',
      lowerIsBetter: false,
      milestones
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deadline) {
      alert('Please select a deadline');
      return;
    }

    let goalData: GoalFormData;

    switch (selectedCategory) {
      case 'steps':
        goalData = generateStepsGoal();
        break;
      case 'water':
        goalData = generateWaterGoal();
        break;
      case 'nutrition':
        goalData = generateNutritionGoal();
        break;
      case 'workout_consistency':
        goalData = generateWorkoutGoal();
        break;
      case 'weight_loss':
        goalData = generateWeightGoal();
        break;
      case 'weight_loss_st':
        goalData = generateWeightMilestoneGoal();
        break;
      case 'strength':
        if (!strengthConfig.exerciseId || !strengthConfig.exerciseName) {
          alert('Please select an exercise');
          return;
        }
        goalData = generateStrengthGoal();
        break;
      case 'setup':
        goalData = generateSetupGoal();
        break;
      default:
        alert('Please select a category');
        return;
    }

    onSave(goalData);
    onOpenChange(false);
    
    // Reset for next use
    setStep('category');
    setSelectedCategory('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {editingGoal ? 'Edit Goal' : `Create New Goal for ${clientName}`}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Category Selection */}
        {step === 'category' && (
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">Select Goal Category</h3>
            <div className="grid grid-cols-2 gap-4">
              {GOAL_CATEGORIES.map(cat => (
                <Card
                  key={cat.value}
                  className="p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all"
                  onClick={() => handleCategorySelect(cat.value)}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">{cat.icon}</div>
                    <h4 className="font-semibold mb-1">{cat.label}</h4>
                    <p className="text-xs text-gray-500">{cat.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 'config' && selectedCategory && (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Back Button */}
            <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Change Category
            </Button>

            {/* Selected Category Display */}
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getCategoryMetadata(selectedCategory).icon}</span>
                <div>
                  <h4 className="font-semibold">{getCategoryMetadata(selectedCategory).label}</h4>
                  <p className="text-sm text-gray-600">{getCategoryMetadata(selectedCategory).description}</p>
                </div>
              </div>
            </div>

            {/* Category-Specific Forms */}
            
            {/* STEPS GOAL */}
            {selectedCategory === 'steps' && (
              <div className="space-y-4">
                <h4 className="font-semibold">Goal Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="steps">Steps Target *</Label>
                    <Input
                      id="steps"
                      type="number"
                      value={stepsConfig.steps}
                      onChange={(e) => setStepsConfig(prev => ({ ...prev, steps: parseInt(e.target.value) || 0 }))}
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Period *</Label>
                    <div className="pt-2">
                      <span className="text-sm">per Day</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Milestone Streaks (consecutive days) *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      value={stepsConfig.days[0]}
                      onChange={(e) => setStepsConfig(prev => ({ 
                        ...prev, 
                        days: [parseInt(e.target.value) || 0, prev.days[1], prev.days[2]]
                      }))}
                      placeholder="3"
                    />
                    <Input
                      type="number"
                      value={stepsConfig.days[1]}
                      onChange={(e) => setStepsConfig(prev => ({ 
                        ...prev, 
                        days: [prev.days[0], parseInt(e.target.value) || 0, prev.days[2]]
                      }))}
                      placeholder="5"
                    />
                    <Input
                      type="number"
                      value={stepsConfig.days[2]}
                      onChange={(e) => setStepsConfig(prev => ({ 
                        ...prev, 
                        days: [prev.days[0], prev.days[1], parseInt(e.target.value) || 0]
                      }))}
                      placeholder="7"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Enter 3 milestone values (e.g., 3, 5, 7 days)</p>
                </div>

                {/* Preview Generated Milestones */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-2 block">Generated Milestones:</Label>
                  <div className="space-y-1">
                    {stepsConfig.days.map((days, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Walk {stepsConfig.steps.toLocaleString()} steps for {days} consecutive days</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* WATER GOAL */}
            {selectedCategory === 'water' && (
              <div className="space-y-4">
                <h4 className="font-semibold">Goal Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="water-amount">Water Target *</Label>
                    <Input
                      id="water-amount"
                      type="number"
                      value={waterConfig.amount}
                      onChange={(e) => setWaterConfig(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                      placeholder="64"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="water-unit">Unit *</Label>
                    <Input
                      id="water-unit"
                      value={waterConfig.unit}
                      onChange={(e) => setWaterConfig(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="oz"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Milestone Streaks (consecutive days) *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {waterConfig.days.map((day, idx) => (
                      <Input
                        key={idx}
                        type="number"
                        value={day}
                        onChange={(e) => {
                          const newDays = [...waterConfig.days];
                          newDays[idx] = parseInt(e.target.value) || 0;
                          setWaterConfig(prev => ({ ...prev, days: newDays }));
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-2 block">Generated Milestones:</Label>
                  <div className="space-y-1">
                    {waterConfig.days.map((days, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Drink {waterConfig.amount} {waterConfig.unit} for {days} consecutive days</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* NUTRITION GOAL */}
            {selectedCategory === 'nutrition' && (
              <div className="space-y-4">
                <h4 className="font-semibold">Goal Configuration</h4>
                <div className="space-y-2">
                  <Label htmlFor="nutrition-days">Days Per Week *</Label>
                  <Input
                    id="nutrition-days"
                    type="number"
                    value={nutritionConfig.daysPerWeek}
                    onChange={(e) => setNutritionConfig(prev => ({ ...prev, daysPerWeek: parseInt(e.target.value) || 0 }))}
                    placeholder="7"
                    min="1"
                    max="7"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Milestone Weeks (consecutive weeks) *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {nutritionConfig.weeks.map((week, idx) => (
                      <Input
                        key={idx}
                        type="number"
                        value={week}
                        onChange={(e) => {
                          const newWeeks = [...nutritionConfig.weeks];
                          newWeeks[idx] = parseInt(e.target.value) || 0;
                          setNutritionConfig(prev => ({ ...prev, weeks: newWeeks }));
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-2 block">Generated Milestones:</Label>
                  <div className="space-y-1">
                    {nutritionConfig.weeks.map((weeks, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Follow meal plan {nutritionConfig.daysPerWeek} days/week for {weeks} consecutive weeks</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* WORKOUT CONSISTENCY GOAL */}
            {selectedCategory === 'workout_consistency' && (
              <div className="space-y-4">
                <h4 className="font-semibold">Goal Configuration</h4>
                <div className="space-y-2">
                  <Label htmlFor="workouts-per-week">Workouts Per Week *</Label>
                  <Input
                    id="workouts-per-week"
                    type="number"
                    value={workoutConfig.workoutsPerWeek}
                    onChange={(e) => setWorkoutConfig(prev => ({ ...prev, workoutsPerWeek: parseInt(e.target.value) || 0 }))}
                    placeholder="3"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Milestone Weeks (consecutive weeks) *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {workoutConfig.weeks.map((week, idx) => (
                      <Input
                        key={idx}
                        type="number"
                        value={week}
                        onChange={(e) => {
                          const newWeeks = [...workoutConfig.weeks];
                          newWeeks[idx] = parseInt(e.target.value) || 0;
                          setWorkoutConfig(prev => ({ ...prev, weeks: newWeeks }));
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-2 block">Generated Milestones:</Label>
                  <div className="space-y-1">
                    {workoutConfig.weeks.map((weeks, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Complete {workoutConfig.workoutsPerWeek} workouts/week for {weeks} consecutive weeks</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* WEIGHT LOSS GOAL (Long-term) */}
            {selectedCategory === 'weight_loss' && (
              <div className="space-y-4">
                <h4 className="font-semibold">Goal Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-weight">Current Weight *</Label>
                    <Input
                      id="current-weight"
                      type="number"
                      value={weightConfig.current}
                      onChange={(e) => setWeightConfig(prev => ({ ...prev, current: parseInt(e.target.value) || 0 }))}
                      placeholder="212"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-weight">Target Weight *</Label>
                    <Input
                      id="target-weight"
                      type="number"
                      value={weightConfig.target}
                      onChange={(e) => setWeightConfig(prev => ({ ...prev, target: parseInt(e.target.value) || 0 }))}
                      placeholder="180"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Milestone Weights (lbs) *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {weightConfig.milestones.map((weight, idx) => (
                      <Input
                        key={idx}
                        type="number"
                        value={weight}
                        onChange={(e) => {
                          const newMilestones = [...weightConfig.milestones];
                          newMilestones[idx] = parseInt(e.target.value) || 0;
                          setWeightConfig(prev => ({ ...prev, milestones: newMilestones }));
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Enter 3 milestone weights between current and target</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-2 block">Generated Milestones:</Label>
                  <div className="space-y-1">
                    {weightConfig.milestones.map((weight, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Reach {weight} lbs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* WEIGHT LOSS MILESTONE GOAL (Short-term) */}
            {selectedCategory === 'weight_loss_st' && (
              <div className="space-y-4">
                <h4 className="font-semibold">Short-term Weight Loss Milestone</h4>
                <div className="space-y-2">
                  <Label htmlFor="current-weight-st">Current Weight *</Label>
                  <Input
                    id="current-weight-st"
                    type="number"
                    value={weightMilestoneConfig.current}
                    onChange={(e) => setWeightMilestoneConfig(prev => ({ ...prev, current: parseInt(e.target.value) || 0 }))}
                    placeholder="212"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Milestone Increments (pounds to lose) *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {weightMilestoneConfig.incrementalPounds.map((lbsToLose, idx) => (
                      <Input
                        key={idx}
                        type="number"
                        value={lbsToLose}
                        onChange={(e) => {
                          const newIncrements = [...weightMilestoneConfig.incrementalPounds];
                          newIncrements[idx] = parseInt(e.target.value) || 0;
                          setWeightMilestoneConfig(prev => ({ ...prev, incrementalPounds: newIncrements }));
                        }}
                        placeholder={idx === 0 ? "2" : idx === 1 ? "3" : "5"}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Enter 3 incremental pounds to lose (e.g., 2, 3, 5 lbs)</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-2 block">Generated Milestones:</Label>
                  <div className="space-y-1">
                    {weightMilestoneConfig.incrementalPounds.map((lbsToLose, idx) => {
                      const targetWeight = weightMilestoneConfig.current - lbsToLose;
                      const isLastMilestone = idx === weightMilestoneConfig.incrementalPounds.length - 1;
                      return (
                        <div key={idx} className="text-sm flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>
                            {isLastMilestone 
                              ? `Reach the ${lbsToLose}-pound loss milestone (to ${targetWeight} lbs)`
                              : `Lose the first ${lbsToLose} pounds (to ${targetWeight} lbs)`
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Goal: Lose {Math.max(...weightMilestoneConfig.incrementalPounds)} lbs total 
                    (from {weightMilestoneConfig.current} to {weightMilestoneConfig.current - Math.max(...weightMilestoneConfig.incrementalPounds)} lbs)
                  </p>
                </div>
              </div>
            )}

            {/* SETUP/ONBOARDING GOAL */}
            {selectedCategory === 'setup' && (
              <div className="space-y-4">
                <h4 className="font-semibold">Onboarding Configuration</h4>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>📋 Standard Onboarding Goal</strong>
                  </p>
                  <p className="text-sm text-gray-700">
                    This goal uses predefined milestones for new client onboarding.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-2 block">Predefined Milestones:</Label>
                  <div className="space-y-1">
                    <div className="text-sm flex items-start gap-2">
                      <Check className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span>Schedule your 30-minute planning consultation</span>
                    </div>
                    <div className="text-sm flex items-start gap-2">
                      <Check className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span>Complete your consultation</span>
                    </div>
                    <div className="text-sm flex items-start gap-2">
                      <Check className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span>Receive your personalized fitness plan</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">⚠️ Manually tracked by trainer</p>
                </div>
              </div>
            )}

            {/* STRENGTH GOAL */}
            {selectedCategory === 'strength' && (
              <div className="space-y-4">
                <h4 className="font-semibold">Goal Configuration</h4>
                <div className="space-y-2">
                  <Label htmlFor="exercise-select">Exercise *</Label>
                  <Select
                    value={strengthConfig.exerciseId}
                    onValueChange={(value) => {
                      const exercise = strengthExercises.find(e => e.id === value);
                      setStrengthConfig(prev => ({
                        ...prev,
                        exerciseId: value,
                        exerciseName: exercise?.name || ''
                      }));
                    }}
                  >
                    <SelectTrigger id="exercise-select">
                      <SelectValue placeholder="Select an exercise" />
                    </SelectTrigger>
                    <SelectContent>
                      {strengthExercises.length === 0 ? (
                        <SelectItem value="none" disabled>No strength exercises found</SelectItem>
                      ) : (
                        strengthExercises.map(ex => (
                          <SelectItem key={ex.id} value={ex.id}>
                            {ex.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-weight-strength">Current Max (lbs) *</Label>
                    <Input
                      id="current-weight-strength"
                      type="number"
                      value={strengthConfig.current}
                      onChange={(e) => setStrengthConfig(prev => ({ ...prev, current: parseInt(e.target.value) || 0 }))}
                      placeholder="185"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-weight-strength">Target Max (lbs) *</Label>
                    <Input
                      id="target-weight-strength"
                      type="number"
                      value={strengthConfig.target}
                      onChange={(e) => setStrengthConfig(prev => ({ ...prev, target: parseInt(e.target.value) || 0 }))}
                      placeholder="225"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Milestone Weights (lbs) *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {strengthConfig.milestones.map((weight, idx) => (
                      <Input
                        key={idx}
                        type="number"
                        value={weight}
                        onChange={(e) => {
                          const newMilestones = [...strengthConfig.milestones];
                          newMilestones[idx] = parseInt(e.target.value) || 0;
                          setStrengthConfig(prev => ({ ...prev, milestones: newMilestones }));
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-2 block">Generated Milestones:</Label>
                  <div className="space-y-1">
                    {strengthConfig.milestones.map((weight, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span>{strengthConfig.exerciseName || 'Exercise'}: {weight} lbs</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">⚠️ Manually tracked by trainer</p>
                </div>
              </div>
            )}

            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Term *</Label>
                {(() => {
                  const categoryMeta = getCategoryMetadata(selectedCategory);
                  const isTermLocked = categoryMeta.fixedTerm !== undefined;
                  
                  return (
                    <>
                      <RadioGroup 
                        value={term} 
                        onValueChange={(value: GoalTerm) => setTerm(value)}
                        disabled={isTermLocked}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="short-term" id="term-short" disabled={isTermLocked} />
                          <Label htmlFor="term-short" className={`font-normal ${isTermLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Short-term</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="long-term" id="term-long" disabled={isTermLocked} />
                          <Label htmlFor="term-long" className={`font-normal ${isTermLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>Long-term</Label>
                        </div>
                      </RadioGroup>
                      {isTermLocked && (
                        <p className="text-xs text-gray-500 mt-1">
                          🔒 This category is designed for {categoryMeta.fixedTerm} goals
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <Label>Priority *</Label>
                <RadioGroup value={priority} onValueChange={(value: GoalPriority) => setPriority(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="priority-high" />
                    <Label htmlFor="priority-high" className="font-normal cursor-pointer">High</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="priority-medium" />
                    <Label htmlFor="priority-medium" className="font-normal cursor-pointer">Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="priority-low" />
                    <Label htmlFor="priority-low" className="font-normal cursor-pointer">Low</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline ? deadline.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                  setDeadline(date);
                }}
                required
              />
            </div>

            {/* Form Actions */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
