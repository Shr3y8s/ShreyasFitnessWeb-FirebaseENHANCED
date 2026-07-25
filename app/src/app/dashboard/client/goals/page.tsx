'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ClientPageShell } from '@/components/dashboard/ClientPageShell';
import { Card } from '@/components/ui/card';
import { Target, Star } from 'lucide-react';
import { Goal, getCategoryMetadata, calculateGoalCompletion } from '@/types/goals';
import { getClientGoals } from '@/lib/goals-api';
import { FeatureLockedShell } from '@/components/dashboard/FeatureLockedShell';
import { getClientFeatureAccess } from '@/lib/constants';

export default function ClientGoalsPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const loadGoals = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        setLoading(true);
        const goals = await getClientGoals(user.uid);
        const active = Array.from(goals.values()).filter(g => g?.isActive && g?.isConfigured) as Goal[];
        setActiveGoals(active);
      } catch (error) {
        console.error('Error loading goals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [user, authLoading, router]);

  // Tier gating: in-person clients don't have goals & milestones.
  if (userData && !getClientFeatureAccess(userData.tier).goals) {
    return <FeatureLockedShell feature="goals" />;
  }

  if (loading) {
    return (
      <div className="client-surface flex items-center justify-center">
        <div className="text-stone-600">Loading your goals...</div>
      </div>
    );
  }


  return (
    <ClientPageShell>
      <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
                <Target className="h-8 w-8 text-primary" />
                My Goals & Milestones
              </h1>
              <p className="text-gray-600">Track your progress toward your fitness goals</p>
            </div>

            {/* Active Goals */}
            {activeGoals.length === 0 ? (
              <Card className="p-12 text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Goals</h3>
                <p className="text-gray-500">Your trainer will configure goals for you soon</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeGoals.map(goal => {
                  const categoryMeta = getCategoryMetadata(goal.category);
                  const completion = calculateGoalCompletion(goal);
                  const current = goal.currentStreak ?? goal.currentValue ?? 0;
                  const target = goal.targetStreak ?? goal.targetValue ?? 0;
                  const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
                  const totalMilestones = goal.milestones?.length || 0;

                  return (
                    <Card key={goal.id} className="p-6 hover:shadow-lg transition-shadow">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">{categoryMeta.icon}</span>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{goal.title}</h3>
                          <p className="text-xs text-gray-500">{categoryMeta.label}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
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
                          <span className="text-sm font-semibold flex items-center gap-1">
                            <Star className="h-4 w-4 text-primary" />
                            Milestones
                          </span>
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
                })}
              </div>
            )}
      </div>
    </ClientPageShell>
  );
}
