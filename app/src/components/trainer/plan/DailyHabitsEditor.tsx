'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Activity, Dumbbell, UtensilsCrossed, Droplet, Moon, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { DailyHabitsData, DailyHabit } from '@/types/plan';

interface DailyHabitsEditorProps {
  initialData: DailyHabitsData | null;
  onSave: (data: DailyHabitsData) => Promise<void>;
  isSaving: boolean;
}

// Icon map
const ICON_MAP = {
  activity: Activity,
  dumbbell: Dumbbell,
  nutrition: UtensilsCrossed,
  hydration: Droplet,
  sleep: Moon,
  custom: Activity,
};

// Habit templates organized by category
const HABIT_TEMPLATES = [
  {
    category: 'Activity',
    templates: [
      { title: 'Walk 10K steps daily', description: 'Building daily movement habit', iconType: 'activity' as const },
      { title: 'Walk 8K steps daily', description: 'Building daily movement habit', iconType: 'activity' as const },
      { title: 'LISS cardio 3x per week', description: 'Aerobic conditioning', iconType: 'activity' as const },
      { title: 'Walk after meals', description: 'Post-meal movement for digestion', iconType: 'activity' as const },
    ]
  },
  {
    category: 'Training',
    templates: [
      { title: 'Complete scheduled workouts', description: 'Following training program consistently', iconType: 'dumbbell' as const },
      { title: 'Train 4x per week', description: 'Consistent training frequency', iconType: 'dumbbell' as const },
      { title: 'Progressive overload focus', description: 'Adding weight/reps each week', iconType: 'dumbbell' as const },
      { title: 'Perfect exercise form', description: 'Quality over quantity', iconType: 'dumbbell' as const },
    ]
  },
  {
    category: 'Nutrition',
    templates: [
      { title: 'Hit protein target daily', description: 'Building nutrition consistency', iconType: 'nutrition' as const },
      { title: 'Follow meal plan', description: 'Eating according to plan', iconType: 'nutrition' as const },
      { title: 'Track calories consistently', description: 'Daily food logging', iconType: 'nutrition' as const },
      { title: 'Meal prep on Sundays', description: 'Weekly preparation routine', iconType: 'nutrition' as const },
    ]
  },
  {
    category: 'Hydration',
    templates: [
      { title: 'Drink 3L water daily', description: 'Staying hydrated throughout the day', iconType: 'hydration' as const },
      { title: 'Water before each meal', description: 'Hydration before eating', iconType: 'hydration' as const },
    ]
  },
  {
    category: 'Recovery',
    templates: [
      { title: 'Sleep 7-8 hours nightly', description: 'Prioritizing recovery', iconType: 'sleep' as const },
      { title: 'Consistent sleep schedule', description: 'Same bedtime each night', iconType: 'sleep' as const },
    ]
  },
];

export function DailyHabitsEditor({ initialData, onSave, isSaving }: DailyHabitsEditorProps) {
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customHabit, setCustomHabit] = useState<{
    title: string;
    description: string;
    iconType: 'activity' | 'dumbbell' | 'nutrition' | 'hydration' | 'sleep' | 'custom';
  }>({
    title: '',
    description: '',
    iconType: 'activity',
  });

  useEffect(() => {
    if (initialData?.habits) {
      setHabits(initialData.habits);
    }
  }, [initialData]);

  const handleAddFromTemplate = () => {
    if (!selectedCategory || !selectedTemplate) return;

    const category = HABIT_TEMPLATES.find(c => c.category === selectedCategory);
    const template = category?.templates.find(t => t.title === selectedTemplate);

    if (template) {
      const newHabit: DailyHabit = {
        id: `habit-${Date.now()}`,
        title: template.title,
        description: template.description,
        iconType: template.iconType,
        order: habits.length,
      };

      setHabits([...habits, newHabit]);
      setIsAddDialogOpen(false);
      setSelectedCategory('');
      setSelectedTemplate('');
    }
  };

  const handleAddCustom = () => {
    if (!customHabit.title) return;

    const newHabit: DailyHabit = {
      id: `habit-${Date.now()}`,
      title: customHabit.title,
      description: customHabit.description,
      iconType: customHabit.iconType,
      order: habits.length,
    };

    setHabits([...habits, newHabit]);
    setIsAddDialogOpen(false);
    setCustomHabit({ title: '', description: '', iconType: 'activity' });
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    const habit = habits[index];
    setCustomHabit({
      title: habit.title,
      description: habit.description,
      iconType: habit.iconType,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !customHabit.title) return;

    const updatedHabits = [...habits];
    updatedHabits[editingIndex] = {
      ...updatedHabits[editingIndex],
      title: customHabit.title,
      description: customHabit.description,
      iconType: customHabit.iconType,
    };

    setHabits(updatedHabits);
    setIsEditDialogOpen(false);
    setEditingIndex(null);
    setCustomHabit({ title: '', description: '', iconType: 'activity' });
  };

  const handleRemove = (index: number) => {
    const updatedHabits = habits.filter((_, i) => i !== index);
    // Reorder remaining habits
    const reorderedHabits = updatedHabits.map((habit, i) => ({
      ...habit,
      order: i,
    }));
    setHabits(reorderedHabits);
  };

  const handleSave = async () => {
    const data: DailyHabitsData = {
      habits,
      lastUpdated: new Date(),
    };
    await onSave(data);
  };

  const availableTemplates = selectedCategory
    ? HABIT_TEMPLATES.find(c => c.category === selectedCategory)?.templates || []
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Daily Habits</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set up to 5 daily habits for your client to focus on. These are ongoing habits, not time-bound goals.
        </p>
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        {habits.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <p className="font-medium">No habits added yet</p>
                <p className="text-sm mt-1">Click "Add Habit" to get started</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          habits.map((habit, index) => {
            const IconComponent = ICON_MAP[habit.iconType] || Activity;
            return (
              <Card key={habit.id} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50 flex-shrink-0">
                      <IconComponent className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1">{habit.title}</h4>
                      <p className="text-xs text-muted-foreground">{habit.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(index)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Button */}
      {habits.length < 5 && (
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Habit
        </Button>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving || habits.length === 0}
        className="w-full"
      >
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Daily Habits
      </Button>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Daily Habit</DialogTitle>
            <DialogDescription>
              Choose from a template or create a custom habit
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Template Selection */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Choose from Template</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {HABIT_TEMPLATES.map((cat) => (
                        <SelectItem key={cat.category} value={cat.category}>
                          {cat.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Template</label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}
                    disabled={!selectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTemplates.map((template) => (
                        <SelectItem key={template.title} value={template.title}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleAddFromTemplate}
                disabled={!selectedCategory || !selectedTemplate}
                className="w-full"
              >
                Add from Template
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Custom Habit */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Create Custom Habit</h4>
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={customHabit.title}
                  onChange={(e) => setCustomHabit({ ...customHabit, title: e.target.value })}
                  placeholder="e.g., Complete all meals on time"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={customHabit.description}
                  onChange={(e) => setCustomHabit({ ...customHabit, description: e.target.value })}
                  placeholder="e.g., Eating at consistent times each day"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Icon</label>
                <Select
                  value={customHabit.iconType}
                  onValueChange={(value: any) => setCustomHabit({ ...customHabit, iconType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">🚶 Activity</SelectItem>
                    <SelectItem value="dumbbell">💪 Training</SelectItem>
                    <SelectItem value="nutrition">🍽️ Nutrition</SelectItem>
                    <SelectItem value="hydration">💧 Hydration</SelectItem>
                    <SelectItem value="sleep">😴 Sleep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddCustom}
                disabled={!customHabit.title}
                className="w-full"
              >
                Add Custom Habit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={customHabit.title}
                onChange={(e) => setCustomHabit({ ...customHabit, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={customHabit.description}
                onChange={(e) => setCustomHabit({ ...customHabit, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Icon</label>
              <Select
                value={customHabit.iconType}
                onValueChange={(value: any) => setCustomHabit({ ...customHabit, iconType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">🚶 Activity</SelectItem>
                  <SelectItem value="dumbbell">💪 Training</SelectItem>
                  <SelectItem value="nutrition">🍽️ Nutrition</SelectItem>
                  <SelectItem value="hydration">💧 Hydration</SelectItem>
                  <SelectItem value="sleep">😴 Sleep</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
