'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Settings,
  TrendingUp,
  MoreVertical,
  Star,
  Flag,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Goal, GOAL_CATEGORIES, getCategoryMetadata, calculateGoalCompletion } from '@/types/goals';
import { GoalFormDialog } from '@/components/trainer/goals/GoalFormDialog';
import { getClientGoals, saveGoalConfig, toggleGoalActive } from '@/lib/goals-api';

interface GoalsManagementPanelProps {
  clientId: string;
  clientName: string;
}

// Initialize 7 goal slots (one per category)
const initializeGoalSlots = (): Map<string, Goal | null> => {
  const slots = new Map<string, Goal | null>();
  GOAL_CATEGORIES.forEach(cat => {
    slots.set(cat.value, null); // null = not configured
  });
  return slots;
};

export function GoalsManagementPanel({ clientId, clientName }: GoalsManagementPanelProps) {
  const { toast } = useToast();
  
  const [goalSlots, setGoalSlots] = useState<Map<string, Goal | null>>(initializeGoalSlots());
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  // Fetch goals from Firestore
  useEffect(() => {
    if (!clientId) return;

    const loadGoals = async () => {
      try {
        setGoalsLoading(true);
        const goals = await getClientGoals(clientId);
        setGoalSlots(goals as any);
      } catch (error) {
        console.error('Error loading goals:', error);
        toast({
          title: 'Error Loading Goals',
          description: 'Failed to load goals from database',
          variant: 'destructive'
        });
      } finally {
        setGoalsLoading(false);
      }
    };

    loadGoals();
  }, [clientId, toast]);

  const handleConfigureGoal = (category: string) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleSaveGoal = async (goalData: any) => {
    const category = goalData.category;
    
    try {
      // Save to Firestore
      const result = await saveGoalConfig(clientId, category, goalData);
      
      if (result.success) {
        // Reload goals from Firestore
        const updatedGoals = await getClientGoals(clientId);
        setGoalSlots(updatedGoals as any);
        
        toast({
          title: 'Goal Configured',
          description: 'Goal has been saved to database successfully.',
        });
      } else {
        toast({
          title: 'Save Failed',
          description: result.error || 'Failed to save goal',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving goal:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (category: string) => {
    const goal = goalSlots.get(category);
    if (!goal || !goal.isConfigured) {
      toast({
        title: 'Cannot Toggle',
        description: 'Please configure the goal first.',
        variant: 'destructive'
      });
      return;
    }

    const newActiveState = !goal.isActive;

    try {
      // Update in Firestore
      const result = await toggleGoalActive(clientId, category as any, newActiveState);
      
      if (result.success) {
        // Update local state
        setGoalSlots(prev => {
          const newSlots = new Map(prev);
          const updatedGoal = { ...goal, isActive: newActiveState };
          newSlots.set(category, updatedGoal);
          return newSlots;
        });

        toast({
          title: newActiveState ? 'Goal Activated' : 'Goal Deactivated',
          description: newActiveState 
            ? 'Goal now visible to client' 
            : 'Goal hidden from client',
        });
      } else {
        toast({
          title: 'Toggle Failed',
          description: result.error || 'Failed to toggle goal',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error toggling goal:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while toggling',
        variant: 'destructive'
      });
    }
  };

  const activeGoals = Array.from(goalSlots.values()).filter(g => g?.isActive && g?.isConfigured);
  const configuredCount = Array.from(goalSlots.values()).filter(g => g?.isConfigured).length;

  if (goalsLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-stone-600">Loading goals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Goals & Milestones - {clientName}</h2>
          <p className="text-gray-600">Configure goal tracking system with 7 category slots</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Configured</p>
          <p className="text-2xl font-bold">{configuredCount}/7</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="configure" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configure Goals
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Progress & Tracking ({activeGoals.length} active)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Configure Goals */}
        <TabsContent value="configure">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {GOAL_CATEGORIES.map(category => {
              const goal = goalSlots.get(category.value);
              const isConfigured = goal?.isConfigured || false;
              const isActive = goal?.isActive || false;

              return (
                <GoalSlotCard
                  key={category.value}
                  category={category}
                  goal={goal}
                  isConfigured={isConfigured}
                  isActive={isActive}
                  onConfigure={() => handleConfigureGoal(category.value)}
                  onToggleActive={() => handleToggleActive(category.value)}
                />
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 2: Progress & Tracking */}
        <TabsContent value="progress">
          {activeGoals.length === 0 ? (
            <Card className="p-12 text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Goals</h3>
              <p className="text-gray-500 mb-4">Configure and activate goals in the "Configure Goals" tab to track progress</p>
              <Button onClick={() => document.querySelector('[value="configure"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>
                Go to Configure Goals
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Showing {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''} with live tracking
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeGoals.map(goal => goal && (
                  <GoalProgressCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Goal Form Dialog */}
      <GoalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveGoal}
        editingGoal={editingCategory ? (goalSlots.get(editingCategory) ?? null) : null}
        clientName={clientName}
        preselectedCategory={editingCategory as any}
      />
    </div>
  );
}

// Goal Slot Configuration Card
interface GoalSlotCardProps {
  category: typeof GOAL_CATEGORIES[number];
  goal: Goal | null;
  isConfigured: boolean;
  isActive: boolean;
  onConfigure: () => void;
  onToggleActive: () => void;
}

function GoalSlotCard({ 
  category, 
  goal, 
  isConfigured, 
  isActive, 
  onConfigure, 
  onToggleActive 
}: GoalSlotCardProps) {
  // Green theme for all badges to match app colors
  const badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-300';

  return (
    <Card className="p-6">
      {/* Top Row: Badges + 3-dot menu */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex gap-2 flex-wrap">
          <Badge className={`text-xs ${badgeStyle}`}>
            {category.label}
          </Badge>
          {isConfigured && goal && (
            <Badge className={`text-xs ${badgeStyle} flex items-center gap-1`}>
              <Flag className="h-3 w-3" />
              {goal.term === 'short-term' ? 'Short-term' : 'Long-term'}
            </Badge>
          )}
        </div>
        
        {isConfigured && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onConfigure}>
                Edit Configuration
              </DropdownMenuItem>
              {category.value !== 'setup' && (
                <DropdownMenuItem onClick={onToggleActive}>
                  {isActive ? 'Deactivate' : 'Activate'} Goal
                </DropdownMenuItem>
              )}
              {category.value === 'setup' && (
                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                  Setup goals cannot be deactivated
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold mb-2">
        {isConfigured && goal ? goal.title : category.label}
      </h3>

      {isConfigured && goal ? (
        <>
          {/* Milestones List (Static - No Checkboxes) */}
          {goal.milestones && goal.milestones.length > 0 && (
            <div className="bg-emerald-50/50 rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-emerald-700" />
                <span className="text-sm font-semibold text-gray-700">MILESTONES</span>
              </div>
              <div className="space-y-1">
                {goal.milestones.map(milestone => (
                  <div key={milestone.id} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400 flex-shrink-0 mt-0.5">•</span>
                    <p className="text-gray-700">{milestone.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer: Deadline + Priority */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Due: {goal.deadline.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <Badge className={`text-xs ${badgeStyle}`}>
              {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
            </Badge>
          </div>
        </>
      ) : (
        <>
          {/* Not Configured State */}
          <div className="bg-gray-50 rounded-lg p-6 mb-4 text-center">
            <p className="text-sm text-gray-500 mb-4">
              {category.description}
            </p>
            <Button onClick={onConfigure} className="w-full">
              Set Up Goal
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

// Goal Progress Card (for Progress tab)
interface GoalProgressCardProps {
  goal: Goal;
}

function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const categoryMeta = getCategoryMetadata(goal.category);
  const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
  const totalMilestones = goal.milestones?.length || 0;
  
  // Calculate completion using helper function
  const completion = calculateGoalCompletion(goal);
  
  // Get display values (streak or value based)
  const current = goal.currentStreak ?? goal.currentValue ?? 0;
  const target = goal.targetStreak ?? goal.targetValue ?? 0;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{categoryMeta.icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{goal.title}</h3>
          <p className="text-xs text-gray-500">{categoryMeta.label}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">
            {current} / {target} {goal.unit}
          </span>
          <span className="font-semibold">{Math.round(completion)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Milestones</span>
          <span className="text-xs text-gray-500">
            {completedMilestones}/{totalMilestones}
          </span>
        </div>
        {goal.milestones && goal.milestones.length > 0 && (
          <div className="space-y-1">
            {goal.milestones.map(milestone => (
              <div key={milestone.id} className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                  milestone.completed ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <p className={milestone.completed ? 'line-through text-gray-500' : ''}>
                  {milestone.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
