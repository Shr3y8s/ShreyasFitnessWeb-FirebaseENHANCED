"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, Loader2, Plus, X, GripVertical, Sparkles, Utensils, Drumstick, Salad, Droplet, Clock, Leaf, CircleDot } from 'lucide-react';
import { updateNutritionProtocol } from '@/lib/plan-api';
import { NutritionApproach, NutritionHabit, NUTRITION_HABIT_TEMPLATES, NutritionHabitCategory, HABIT_CATEGORY_INFO } from '@/types/plan';
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
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<NutritionApproach>(currentApproach || 'healthy_habits');
  
  // Healthy Habits state
  const [habits, setHabits] = useState<NutritionHabit[]>(
    currentData?.healthyHabits?.habits || []
  );
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitDescription, setNewHabitDescription] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync with initial data when it changes
  useEffect(() => {
    if (currentApproach) {
      setActiveTab(currentApproach);
    }
    if (currentData?.healthyHabits?.habits) {
      setHabits(currentData.healthyHabits.habits);
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
        // Future: save macro tracking data
        nutritionData.macroTracking = {};
      } else if (activeTab === 'meal_plan') {
        // Future: save meal plan data
        nutritionData.mealPlan = {};
      }

      const result = await updateNutritionProtocol(clientId, trainerId, nutritionData);

      if (result.success) {
        await onUpdate();
        alert('Nutrition protocol saved successfully!');
      } else {
        console.error('Failed to save nutrition protocol');
        alert('Failed to save. Please try again.');
      }
    } catch (error) {
      console.error('Error saving nutrition protocol:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = activeTab !== currentApproach || 
    (activeTab === 'healthy_habits' && JSON.stringify(habits) !== JSON.stringify(currentData?.healthyHabits?.habits || []));

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
              Nutrition Protocol
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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-sm text-amber-800">
                <strong>Coming Soon:</strong> Configure daily macronutrient targets (calories, protein, carbs, fats)
              </p>
            </div>
          </TabsContent>

          {/* Meal Plan Tab */}
          <TabsContent value="meal_plan" className="space-y-4 mt-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <p className="text-sm text-purple-800">
                <strong>Coming Soon:</strong> Create structured meal plans with specific foods and portions
              </p>
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
