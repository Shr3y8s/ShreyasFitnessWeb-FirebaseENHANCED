"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Flame, Loader2, Plus, X, GripVertical, Sparkles, Utensils, Drumstick, Salad, Droplet, Clock, Leaf, CircleDot, Copy, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { updateNutritionProtocol } from '@/lib/plan-api';
import { NutritionApproach, NutritionHabit, NUTRITION_HABIT_TEMPLATES, NutritionHabitCategory, HABIT_CATEGORY_INFO } from '@/types/plan';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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

// Predefined meal types
const MEAL_TYPES = [
  'Breakfast',
  'Post Training',
  'Lunch',
  'Dinner',
  'Snack'
] as const;

// Diet type presets for macro calculator
const DIET_PRESETS = [
  { id: 'balanced', name: 'Balanced Diet', carbs: 40, protein: 30, fat: 30, description: 'Well-rounded approach for general health' },
  { id: 'high-protein', name: 'High Protein', carbs: 30, protein: 40, fat: 30, description: 'Muscle building and satiety focus' },
  { id: 'low-carb', name: 'Low Carb', carbs: 20, protein: 40, fat: 40, description: 'Reduced carbohydrate intake' },
  { id: 'keto', name: 'Ketogenic', carbs: 5, protein: 25, fat: 70, description: 'Very low carb, high fat' },
  { id: 'moderate-carb', name: 'Moderate Carb', carbs: 35, protein: 30, fat: 35, description: 'Balanced with moderate carbs' },
  { id: 'high-carb', name: 'High Carb', carbs: 50, protein: 25, fat: 25, description: 'Endurance athletes and active individuals' },
  { id: 'zone', name: 'Zone Diet', carbs: 40, protein: 30, fat: 30, description: 'Anti-inflammatory balance' },
] as const;

// Icon mapper for dynamic icon rendering
const iconMap: Record<string, any> = {
  Utensils,
  Drumstick,
  Salad,
  Droplet,
  Clock,
  Leaf,
  CircleDot
};

const HabitIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const IconComponent = iconMap[iconName] || CircleDot;
  return <IconComponent className={className} />;
};

// Sortable Habit Item Component
function SortableHabitItem({ 
  habit, 
  onEdit, 
  onRemove 
}: { 
  habit: NutritionHabit; 
  onEdit: (id: string, field: 'title' | 'description', value: string) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 space-y-2 bg-white"
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-2"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
        <div className="flex-1 space-y-2">
          <Input
            value={habit.title}
            onChange={(e) => onEdit(habit.id, 'title', e.target.value)}
            placeholder="Habit title"
            className="font-semibold"
          />
          <Textarea
            value={habit.description}
            onChange={(e) => onEdit(habit.id, 'description', e.target.value)}
            placeholder="Habit description"
            rows={2}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(habit.id)}
          className="text-destructive hover:text-destructive flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface NutritionProtocolEditorProps {
  clientId: string;
  trainerId: string;
  currentApproach?: NutritionApproach;
  currentData?: {
    healthyHabits?: { habits: NutritionHabit[] };
    macroTracking?: any;
    mealPlan?: any;
  };
  onUpdate: () => void;
}

export function NutritionProtocolEditor({
  clientId,
  trainerId,
  currentApproach,
  currentData,
  onUpdate
}: NutritionProtocolEditorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<NutritionApproach>(currentApproach || 'healthy_habits');
  
  // Ref to prevent useEffect from overwriting calculator-applied values
  const isApplyingCalculator = useRef(false);
  
  // Healthy Habits state
  const [habits, setHabits] = useState<NutritionHabit[]>(
    currentData?.healthyHabits?.habits || []
  );
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitDescription, setNewHabitDescription] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  // Macro Calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcCalories, setCalcCalories] = useState('');
  const [calcDietType, setCalcDietType] = useState('');
  const [calculatedMacros, setCalculatedMacros] = useState<{
    protein: number;
    proteinPct: number;
    carbs: number;
    carbsPct: number;
    fats: number;
    fatsPct: number;
  } | null>(null);

  // Macro Tracking state
  const [macroCalories, setMacroCalories] = useState(currentData?.macroTracking?.calories || '');
  const [macroProtein, setMacroProtein] = useState(currentData?.macroTracking?.protein || '');
  const [macroProteinPct, setMacroProteinPct] = useState(currentData?.macroTracking?.proteinPercentage || '');
  const [macroCarbs, setMacroCarbs] = useState(currentData?.macroTracking?.carbs || '');
  const [macroCarbsPct, setMacroCarbsPct] = useState(currentData?.macroTracking?.carbsPercentage || '');
  const [macroFats, setMacroFats] = useState(currentData?.macroTracking?.fats || '');
  const [macroFatsPct, setMacroFatsPct] = useState(currentData?.macroTracking?.fatsPercentage || '');
  const [macroTiming, setMacroTiming] = useState<string[]>(
    currentData?.macroTracking?.timing || []
  );
  const [macroGuidelines, setMacroGuidelines] = useState<string[]>(
    currentData?.macroTracking?.guidelines || []
  );

  // Meal Plan state - Grid structure (meal type x day)
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Initialize meal plan grid: { mealType: { dayName: foodItems[] } }
  const initializeMealGrid = () => {
    const grid: Record<string, Record<string, string>> = {};
    MEAL_TYPES.forEach(mealType => {
      grid[mealType] = {};
      DAYS.forEach(day => {
        grid[mealType][day] = '';
      });
    });

    // Load existing data if available
    if (currentData?.mealPlan?.weeklyPlan) {
      currentData.mealPlan.weeklyPlan.forEach((dayPlan: any) => {
        dayPlan.meals.forEach((meal: any) => {
          if (grid[meal.name]) {
            grid[meal.name][dayPlan.day] = meal.items.join('\n');
          }
        });
      });
    }

    return grid;
  };

  const [mealGrid, setMealGrid] = useState<Record<string, Record<string, string>>>(initializeMealGrid);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync with initial data when it changes
  useEffect(() => {
    // Skip syncing if we're in the middle of applying calculator values
    if (isApplyingCalculator.current) {
      return;
    }
    
    if (currentApproach) {
      setActiveTab(currentApproach);
    }
    if (currentData?.healthyHabits?.habits) {
      setHabits(currentData.healthyHabits.habits);
    }
    if (currentData?.macroTracking) {
      setMacroCalories(currentData.macroTracking.calories || '');
      setMacroProtein(currentData.macroTracking.protein || '');
      setMacroProteinPct(currentData.macroTracking.proteinPercentage || '');
      setMacroCarbs(currentData.macroTracking.carbs || '');
      setMacroCarbsPct(currentData.macroTracking.carbsPercentage || '');
      setMacroFats(currentData.macroTracking.fats || '');
      setMacroFatsPct(currentData.macroTracking.fatsPercentage || '');
      setMacroTiming(currentData.macroTracking.timing || []);
      setMacroGuidelines(currentData.macroTracking.guidelines || []);
    }
    if (currentData?.mealPlan?.weeklyPlan) {
      setMealGrid(initializeMealGrid());
    }
  }, [currentApproach, currentData]);

  const handleAddHabit = () => {
    if (newHabitTitle.trim() && newHabitDescription.trim()) {
      const newHabit: NutritionHabit = {
        id: Date.now().toString(),
        title: newHabitTitle.trim(),
        description: newHabitDescription.trim(),
        icon: 'CircleDot', // default icon for custom habits
        category: 'quality' // default category for custom habits
      };
      setHabits([...habits, newHabit]);
      setNewHabitTitle('');
      setNewHabitDescription('');
    }
  };

  const handleAddFromTemplate = (templateId: string) => {
    const template = NUTRITION_HABIT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const newHabit: NutritionHabit = {
        id: Date.now().toString(),
        title: template.title,
        description: template.description,
        icon: template.icon,
        category: template.category
      };
      setHabits([...habits, newHabit]);
      setShowTemplates(false);
    }
  };

  const handleRemoveHabit = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
  };

  const handleEditHabit = (id: string, field: 'title' | 'description', value: string) => {
    setHabits(habits.map(h => 
      h.id === id ? { ...h, [field]: value } : h
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setHabits((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Update meal grid cell
  const updateMealCell = (mealType: string, day: string, value: string) => {
    setMealGrid(prev => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        [day]: value
      }
    }));
  };

  // Copy meal to all days
  const copyMealToAllDays = (mealType: string) => {
    const mondayValue = mealGrid[mealType]['Monday'];
    setMealGrid(prev => ({
      ...prev,
      [mealType]: DAYS.reduce((acc, day) => {
        acc[day] = mondayValue;
        return acc;
      }, {} as Record<string, string>)
    }));
  };

  // Macro Tracking - Timing Guidelines
  const addTimingGuideline = () => {
    setMacroTiming([...macroTiming, '']);
  };

  const updateTimingGuideline = (index: number, value: string) => {
    const updated = [...macroTiming];
    updated[index] = value;
    setMacroTiming(updated);
  };

  const removeTimingGuideline = (index: number) => {
    setMacroTiming(macroTiming.filter((_, i) => i !== index));
  };

  // Macro Tracking - General Guidelines
  const addGeneralGuideline = () => {
    setMacroGuidelines([...macroGuidelines, '']);
  };

  const updateGeneralGuideline = (index: number, value: string) => {
    const updated = [...macroGuidelines];
    updated[index] = value;
    setMacroGuidelines(updated);
  };

  const removeGeneralGuideline = (index: number) => {
    setMacroGuidelines(macroGuidelines.filter((_, i) => i !== index));
  };

  // Macro Calculator functions
  const calculateMacros = () => {
    const calories = parseFloat(calcCalories);
    const preset = DIET_PRESETS.find(p => p.id === calcDietType);
    
    if (!calories || !preset || calories <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid calories and select a diet type",
        variant: "destructive",
      });
      return;
    }

    // Calculate grams based on percentages
    // Protein: 4 cal/g, Carbs: 4 cal/g, Fat: 9 cal/g
    const proteinGrams = Math.round((calories * (preset.protein / 100)) / 4);
    const carbsGrams = Math.round((calories * (preset.carbs / 100)) / 4);
    const fatsGrams = Math.round((calories * (preset.fat / 100)) / 9);

    setCalculatedMacros({
      protein: proteinGrams,
      proteinPct: preset.protein,
      carbs: carbsGrams,
      carbsPct: preset.carbs,
      fats: fatsGrams,
      fatsPct: preset.fat,
    });
  };

  const applyCalculatedMacros = () => {
    if (!calculatedMacros) return;

    // Set flag to prevent useEffect from overwriting these values
    isApplyingCalculator.current = true;

    // Batch state updates in a setTimeout to ensure they complete together
    setTimeout(() => {
      setMacroCalories(calcCalories);
      setMacroProtein(String(calculatedMacros.protein));
      setMacroProteinPct(String(calculatedMacros.proteinPct));
      setMacroCarbs(String(calculatedMacros.carbs));
      setMacroCarbsPct(String(calculatedMacros.carbsPct));
      setMacroFats(String(calculatedMacros.fats));
      setMacroFatsPct(String(calculatedMacros.fatsPct));

      toast({
        title: "✓ Macros Applied Successfully",
        description: "Check the Daily Targets fields below - they should now show green borders with the calculated values.",
      });

      // Reset flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isApplyingCalculator.current = false;
      }, 200);
    }, 0);
  };

  // Convert grid back to day-first structure for saving
  const convertGridToDayPlan = () => {
    return DAYS.map(day => ({
      day,
      meals: MEAL_TYPES.map(mealType => ({
        name: mealType,
        items: mealGrid[mealType][day]
          .split('\n')
          .map(item => item.trim())
          .filter(item => item.length > 0)
      })).filter(meal => meal.items.length > 0)
    })).filter(dayPlan => dayPlan.meals.length > 0);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const nutritionData: any = {
        approach: activeTab
      };

      // Save configuration based on active tab
      if (activeTab === 'healthy_habits') {
        nutritionData.healthyHabits = { habits };
      } else if (activeTab === 'macro_tracking') {
        // Validate macro tracking fields
        if (!macroCalories || !macroProtein || !macroCarbs || !macroFats) {
          toast({
            title: "Missing Required Fields",
            description: "Please fill in all macro target fields (calories, protein, carbs, and fats) before saving.",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }

        nutritionData.macroTracking = {
          calories: macroCalories,
          protein: macroProtein,
          proteinPercentage: macroProteinPct || '0',
          carbs: macroCarbs,
          carbsPercentage: macroCarbsPct || '0',
          fats: macroFats,
          fatsPercentage: macroFatsPct || '0',
          timing: macroTiming.filter(line => line.trim()),
          guidelines: macroGuidelines.filter(line => line.trim())
        };
      } else if (activeTab === 'meal_plan') {
        nutritionData.mealPlan = {
          weeklyPlan: convertGridToDayPlan()
        };
      }

      const result = await updateNutritionProtocol(clientId, trainerId, nutritionData);

      if (result.success) {
        await onUpdate();
        toast({
          title: "Nutrition Protocol Saved",
          description: "Nutrition protocol saved successfully",
        });
      } else {
        console.error('Failed to save nutrition protocol');
        toast({
          title: "Save Failed",
          description: "Failed to save. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving nutrition protocol:', error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = activeTab !== currentApproach || 
    (activeTab === 'healthy_habits' && JSON.stringify(habits) !== JSON.stringify(currentData?.healthyHabits?.habits || [])) ||
    (activeTab === 'macro_tracking' && (
      macroCalories !== (currentData?.macroTracking?.calories || '') ||
      macroProtein !== (currentData?.macroTracking?.protein || '') ||
      macroProteinPct !== (currentData?.macroTracking?.proteinPercentage || '') ||
      macroCarbs !== (currentData?.macroTracking?.carbs || '') ||
      macroCarbsPct !== (currentData?.macroTracking?.carbsPercentage || '') ||
      macroFats !== (currentData?.macroTracking?.fats || '') ||
      macroFatsPct !== (currentData?.macroTracking?.fatsPercentage || '') ||
      JSON.stringify(macroTiming) !== JSON.stringify(currentData?.macroTracking?.timing || []) ||
      JSON.stringify(macroGuidelines) !== JSON.stringify(currentData?.macroTracking?.guidelines || [])
    )) ||
    (activeTab === 'meal_plan' && JSON.stringify(mealGrid) !== JSON.stringify(initializeMealGrid()));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          Nutrition Protocol
        </CardTitle>
        <CardDescription>
          Configure your client's nutrition approach. Switch tabs to change the approach and configure its details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NutritionApproach)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="healthy_habits">
              <span className="mr-2">🥗</span>
              Healthy Habits
            </TabsTrigger>
            <TabsTrigger value="macro_tracking">
              <span className="mr-2">📊</span>
              Macro Tracking
            </TabsTrigger>
            <TabsTrigger value="meal_plan">
              <span className="mr-2">📋</span>
              Meal Plans
            </TabsTrigger>
          </TabsList>

          {/* Healthy Habits Tab */}
          <TabsContent value="healthy_habits" className="space-y-4 mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>💡 Beginner-Friendly:</strong> Create a list of daily nutrition habits 
                for your client to follow. These will appear in their plan.
              </p>
            </div>

            {/* Existing habits with drag-and-drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={habits.map(h => h.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {habits.map((habit) => (
                    <SortableHabitItem
                      key={habit.id}
                      habit={habit}
                      onEdit={handleEditHabit}
                      onRemove={handleRemoveHabit}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Template Browser Dialog */}
            <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="lg">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Browse Habit Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nutrition Habit Templates</DialogTitle>
                  <DialogDescription>
                    Choose from pre-made habit templates organized by category
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  {Object.entries(
                    NUTRITION_HABIT_TEMPLATES.reduce((acc, template) => {
                      if (!acc[template.category]) acc[template.category] = [];
                      acc[template.category].push(template);
                      return acc;
                    }, {} as Record<NutritionHabitCategory, typeof NUTRITION_HABIT_TEMPLATES>)
                  ).map(([category, templates]) => {
                    const categoryInfo = HABIT_CATEGORY_INFO[category as NutritionHabitCategory];
                    // Background colors for categories
                    const bgColorMap: Record<string, string> = {
                      'meals': 'bg-blue-50 hover:bg-blue-100 border-blue-200',
                      'protein': 'bg-rose-50 hover:bg-rose-100 border-rose-200',
                      'vegetables': 'bg-green-50 hover:bg-green-100 border-green-200',
                      'hydration': 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
                      'timing': 'bg-purple-50 hover:bg-purple-100 border-purple-200',
                      'quality': 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                    };
                    const iconColorMap: Record<string, string> = {
                      'meals': 'text-blue-600',
                      'protein': 'text-rose-600',
                      'vegetables': 'text-green-600',
                      'hydration': 'text-cyan-600',
                      'timing': 'text-purple-600',
                      'quality': 'text-emerald-600'
                    };
                    
                    return (
                      <div key={category}>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <HabitIcon 
                            iconName={categoryInfo.icon} 
                            className={`h-5 w-5 ${iconColorMap[category]}`} 
                          />
                          <Badge variant="secondary" className="capitalize">
                            {categoryInfo.label}
                          </Badge>
                        </h3>
                        <div className="grid gap-2">
                          {templates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleAddFromTemplate(template.id)}
                              className={`text-left p-4 border rounded-lg transition-all hover:scale-[1.02] ${bgColorMap[category]}`}
                            >
                              <div className="flex items-start gap-3">
                                <HabitIcon 
                                  iconName={template.icon} 
                                  className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColorMap[category]}`}
                                />
                                <div>
                                  <p className="font-medium">{template.title}</p>
                                  <p className="text-sm text-muted-foreground">{template.description}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>

            {/* Add new habit */}
            <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm">Or Create Custom Habit</h4>
              <Input
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
                placeholder="Habit title (e.g., 'Drink Water Before Meals')"
              />
              <Textarea
                value={newHabitDescription}
                onChange={(e) => setNewHabitDescription(e.target.value)}
                placeholder="Habit description (e.g., 'Drink 16oz of water 10-15 minutes before each meal...')"
                rows={3}
              />
              <Button
                onClick={handleAddHabit}
                disabled={!newHabitTitle.trim() || !newHabitDescription.trim()}
                variant="outline"
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Habit
              </Button>
            </div>
          </TabsContent>

          {/* Macro Tracking Tab */}
          <TabsContent value="macro_tracking" className="space-y-4 mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>📊 Precision Approach:</strong> Configure daily macro targets for your client to track
              </p>
            </div>

            {/* Macro Calculator */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Macro Calculator</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCalculator(!showCalculator)}
                  >
                    {showCalculator ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CardDescription>
                  Calculate macros based on total calories and diet type
                </CardDescription>
              </CardHeader>
              {showCalculator && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Total Daily Calories</label>
                      <Input
                        type="number"
                        value={calcCalories}
                        onChange={(e) => setCalcCalories(e.target.value)}
                        placeholder="e.g., 2600"
                        className="text-lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Diet Type</label>
                      <Select value={calcDietType} onValueChange={setCalcDietType}>
                        <SelectTrigger className="text-lg">
                          <SelectValue placeholder="Select diet type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DIET_PRESETS.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{preset.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {preset.carbs}% C / {preset.protein}% P / {preset.fat}% F
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {calcDietType && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {DIET_PRESETS.find(p => p.id === calcDietType)?.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={calculateMacros}
                    disabled={!calcCalories || !calcDietType}
                    className="w-full"
                    variant="default"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Macros
                  </Button>

                  {calculatedMacros && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-semibold mb-3">Calculated Daily Targets</h4>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-primary">{calculatedMacros.protein}g</p>
                            <p className="text-sm text-muted-foreground">Protein ({calculatedMacros.proteinPct}%)</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-primary">{calculatedMacros.carbs}g</p>
                            <p className="text-sm text-muted-foreground">Carbs ({calculatedMacros.carbsPct}%)</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-primary">{calculatedMacros.fats}g</p>
                            <p className="text-sm text-muted-foreground">Fats ({calculatedMacros.fatsPct}%)</p>
                          </div>
                        </div>
                        <div className="text-center mt-3 text-sm text-muted-foreground">
                          Total: {calcCalories} calories
                        </div>
                      </div>

                      <Button
                        onClick={applyCalculatedMacros}
                        className="w-full"
                        size="lg"
                      >
                        Apply to Daily Targets Below
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Daily Targets</h3>
                  {macroCalories && macroProtein && macroCarbs && macroFats && (
                    <Badge variant="secondary" className="text-xs">
                      ✓ All fields filled
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Calories *</label>
                    <Input
                      type="number"
                      value={macroCalories}
                      onChange={(e) => setMacroCalories(e.target.value)}
                      placeholder="2400"
                      className={macroCalories ? "border-green-500" : ""}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Protein (g) *</label>
                      <Input
                        type="number"
                        value={macroProtein}
                        onChange={(e) => setMacroProtein(e.target.value)}
                        placeholder="180"
                        className={macroProtein ? "border-green-500" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">% (optional)</label>
                      <Input
                        type="number"
                        value={macroProteinPct}
                        onChange={(e) => setMacroProteinPct(e.target.value)}
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Carbs (g) *</label>
                      <Input
                        type="number"
                        value={macroCarbs}
                        onChange={(e) => setMacroCarbs(e.target.value)}
                        placeholder="240"
                        className={macroCarbs ? "border-green-500" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">% (optional)</label>
                      <Input
                        type="number"
                        value={macroCarbsPct}
                        onChange={(e) => setMacroCarbsPct(e.target.value)}
                        placeholder="40"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Fats (g) *</label>
                      <Input
                        type="number"
                        value={macroFats}
                        onChange={(e) => setMacroFats(e.target.value)}
                        placeholder="80"
                        className={macroFats ? "border-green-500" : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">% (optional)</label>
                      <Input
                        type="number"
                        value={macroFatsPct}
                        onChange={(e) => setMacroFatsPct(e.target.value)}
                        placeholder="30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Meal Timing Guidelines</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTimingGuideline}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Guideline
                  </Button>
                </div>
                {macroTiming.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                    No timing guidelines yet. Click "Add Guideline" to create one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {macroTiming.map((guideline, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-primary mt-2">•</span>
                        <Input
                          value={guideline}
                          onChange={(e) => updateTimingGuideline(index, e.target.value)}
                          placeholder="e.g., Pre-workout: 30-60g carbs"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTimingGuideline(index)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">General Guidelines</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addGeneralGuideline}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Guideline
                  </Button>
                </div>
                {macroGuidelines.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                    No general guidelines yet. Click "Add Guideline" to create one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {macroGuidelines.map((guideline, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-primary mt-2">•</span>
                        <Input
                          value={guideline}
                          onChange={(e) => updateGeneralGuideline(index, e.target.value)}
                          placeholder="e.g., Prioritize whole, minimally processed foods"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeGeneralGuideline(index)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Meal Plan Tab */}
          <TabsContent value="meal_plan" className="space-y-4 mt-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-800">
                <strong>📋 Structured Approach:</strong> Create a weekly meal plan grid. Enter food items (one per line) in each cell.
              </p>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32 font-semibold">Meal Type</TableHead>
                    {DAYS_SHORT.map(day => (
                      <TableHead key={day} className="text-center font-semibold min-w-[140px]">
                        {day}
                      </TableHead>
                    ))}
                    <TableHead className="w-24 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MEAL_TYPES.map(mealType => (
                    <TableRow key={mealType}>
                      <TableCell className="font-medium bg-muted/50">
                        {mealType}
                      </TableCell>
                      {DAYS.map(day => (
                        <TableCell key={day} className="p-2">
                          <Textarea
                            value={mealGrid[mealType][day]}
                            onChange={(e) => updateMealCell(mealType, day, e.target.value)}
                            placeholder="Enter foods&#10;(one per line)"
                            className="min-h-[100px] text-sm resize-none"
                            rows={4}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyMealToAllDays(mealType)}
                          className="w-full"
                          title="Copy Monday to all days"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <p><strong>💡 Tip:</strong> Fill in Monday's meals, then use the "Copy" button to replicate across the week. Modify individual days as needed.</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Current selection info */}
        {currentApproach && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium">
              Current approach: {currentApproach === 'healthy_habits' ? '🥗 Healthy Habits' : 
                currentApproach === 'macro_tracking' ? '📊 Macro Tracking' : '📋 Meal Plan'}
            </p>
            {hasChanges && (
              <p className="text-muted-foreground mt-1">
                You have unsaved changes. Click save to update.
              </p>
            )}
          </div>
        )}

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Nutrition Protocol'
          )}
        </Button>

        {!hasChanges && currentApproach && (
          <p className="text-xs text-center text-muted-foreground">
            No changes to save
          </p>
        )}
      </CardContent>
    </Card>
  );
}
