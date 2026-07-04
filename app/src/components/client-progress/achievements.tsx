"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getRecentWeightLogs } from '@/lib/activity-api';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Trophy, Award, Flame, Scale, Dumbbell, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  earned: boolean;
}

export function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const compute = async () => {
      try {
        setLoading(true);

        // Gather the same real data the other cards use, in parallel.
        const [streakDoc, statsDoc, weightLogs] = await Promise.all([
          getDoc(doc(db, 'goals', `${user.uid}_workout_consistency`)),
          getDoc(doc(db, 'clientStats', user.uid)),
          getRecentWeightLogs(user.uid, 100),
        ]);

        // Workout streak (current + longest).
        const streakData = streakDoc.exists() ? streakDoc.data() : {};
        const currentStreak = streakData.currentStreak ?? 0;
        const longestStreak = streakData.longestStreak ?? currentStreak;
        const totalWorkouts = streakData.workoutStats?.totalCompleted ?? 0;

        // Personal records count (all-time), from the store workouts.js maintains.
        const strengthRecords = statsDoc.exists() ? (statsDoc.data().strengthRecords || {}) : {};
        const prCount = Object.keys(strengthRecords).length;

        // Weight logging + total change.
        const sortedByDate = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
        const weighInCount = sortedByDate.length;
        let totalWeightLost = 0;
        if (sortedByDate.length >= 2) {
          totalWeightLost = sortedByDate[0].weight - sortedByDate[sortedByDate.length - 1].weight; // positive = lost
        }

        const catalog: Achievement[] = [
          {
            id: 'first-workout',
            title: 'First Workout',
            description: 'Complete your first workout',
            icon: Dumbbell,
            earned: totalWorkouts >= 1 || currentStreak >= 1 || longestStreak >= 1,
          },
          {
            id: 'streak-7',
            title: 'On Fire',
            description: '7-day workout streak',
            icon: Flame,
            earned: longestStreak >= 7,
          },
          {
            id: 'streak-30',
            title: 'Unstoppable',
            description: '30-day workout streak',
            icon: Flame,
            earned: longestStreak >= 30,
          },
          {
            id: 'first-weigh-in',
            title: 'Tracking Started',
            description: 'Log your first weigh-in',
            icon: Scale,
            earned: weighInCount >= 1,
          },
          {
            id: 'weight-consistency',
            title: 'Consistent Logger',
            description: 'Log 10 weigh-ins',
            icon: CheckCircle2,
            earned: weighInCount >= 10,
          },
          {
            id: 'weight-milestone-5',
            title: '5 Down',
            description: 'Lose 5 lbs from your start',
            icon: Scale,
            earned: totalWeightLost >= 5,
          },
          {
            id: 'first-pr',
            title: 'Personal Best',
            description: 'Set your first strength PR',
            icon: Award,
            earned: prCount >= 1,
          },
          {
            id: 'pr-5',
            title: 'Getting Stronger',
            description: 'Set PRs on 5 exercises',
            icon: Trophy,
            earned: prCount >= 5,
          },
        ];

        setAchievements(catalog);
      } catch (error) {
        console.error('Error computing achievements:', error);
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };

    compute();
  }, [user]);

  const earned = achievements.filter((a) => a.earned);
  const hasAnyEarned = earned.length > 0;

  return (
    <Card className="card-hover-lift border-primary/50">
      <CardHeader>
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Metric Achievements
        </h3>
        <CardDescription>
          {hasAnyEarned
            ? `${earned.length} of ${achievements.length} milestones reached`
            : 'Milestones you\u2019ve reached'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasAnyEarned ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <Award className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-semibold">No achievements yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Keep training — milestones you reach will show up here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {achievements.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    a.earned
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-secondary/30 opacity-60'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 rounded-lg shrink-0',
                      a.earned ? 'bg-amber-400/15 text-amber-600' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {a.earned ? <Icon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
