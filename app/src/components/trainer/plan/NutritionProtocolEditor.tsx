"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, Loader2, Plus, X, GripVertical, Sparkles } from 'lucide-react';
import { updateNutritionProtocol } from '@/lib/plan-api';
import { NutritionApproach, NutritionHabit, NUTRITION_HABIT_TEMPLATES, NutritionHabitCategory } from '@/types/plan';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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
              Meal Plan
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

            {/* Existing habits */}
            <div className="space-y-3">
              {habits.map((habit) => (
                <div key={habit.id} className="border rounded-lg p-4 space-y-2 bg-white">
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={habit.title}
                        onChange={(e) => handleEditHabit(habit.id, 'title', e.target.value)}
                        placeholder="Habit title"
                        className="font-semibold"
                      />
                      <Textarea
                        value={habit.description}
                        onChange={(e) => handleEditHabit(habit.id, 'description', e.target.value)}
                        placeholder="Habit description"
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveHabit(habit.id)}
                      className="text-destructive hover:text-destructive flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

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
                  ).map(([category, templates]) => (
                    <div key={category}>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {category}
                        </Badge>
                      </h3>
                      <div className="grid gap-2">
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleAddFromTemplate(template.id)}
                            className="text-left p-3 border rounded-lg hover:bg-accent hover:border-primary transition-colors"
                          >
                            <p className="font-medium">{template.title}</p>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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
