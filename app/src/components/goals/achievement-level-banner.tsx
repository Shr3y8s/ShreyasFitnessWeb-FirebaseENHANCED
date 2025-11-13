"use client";

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Milestone {
  text: string;
  completed: boolean;
}

interface GoalData {
  id: string;
  status: string;
  term: string;
  milestones?: Milestone[];
}

interface AchievementLevelBannerProps {
  goals: GoalData[];
}

const beltLevels = [
  { name: 'White', emoji: '⚪', level: 1, color: 'from-slate-100 to-slate-200', textColor: 'text-slate-700', borderColor: 'border-slate-300', min: 0, max: 4 },
  { name: 'Yellow', emoji: '🟡', level: 2, color: 'from-yellow-100 to-yellow-200', textColor: 'text-yellow-700', borderColor: 'border-yellow-300', min: 5, max: 9 },
  { name: 'Orange', emoji: '🟠', level: 3, color: 'from-orange-100 to-orange-200', textColor: 'text-orange-700', borderColor: 'border-orange-300', min: 10, max: 14 },
  { name: 'Green', emoji: '🟢', level: 4, color: 'from-green-100 to-green-200', textColor: 'text-green-700', borderColor: 'border-green-300', min: 15, max: 19 },
  { name: 'Blue', emoji: '🔵', level: 5, color: 'from-blue-100 to-blue-200', textColor: 'text-blue-700', borderColor: 'border-blue-300', min: 20, max: 24 },
  { name: 'Purple', emoji: '🟣', level: 6, color: 'from-purple-100 to-purple-200', textColor: 'text-purple-700', borderColor: 'border-purple-300', min: 25, max: 29 },
  { name: 'Brown', emoji: '🟤', level: 7, color: 'from-amber-100 to-amber-200', textColor: 'text-amber-700', borderColor: 'border-amber-300', min: 30, max: 34 },
  { name: 'Red', emoji: '🔴', level: 8, color: 'from-red-100 to-red-200', textColor: 'text-red-700', borderColor: 'border-red-300', min: 35, max: 39 },
  { name: 'Black', emoji: '⚫', level: 9, color: 'from-slate-700 to-slate-900', textColor: 'text-white', borderColor: 'border-slate-900', min: 40, max: Infinity },
];

const getBeltLevel = (milestoneCount: number) => {
  return beltLevels.find(belt => milestoneCount >= belt.min && milestoneCount <= belt.max) || beltLevels[0];
};

const getNextBelt = (currentBelt: typeof beltLevels[0]) => {
  const currentIndex = beltLevels.findIndex(b => b.name === currentBelt.name);
  return currentIndex < beltLevels.length - 1 ? beltLevels[currentIndex + 1] : null;
};

export function AchievementLevelBanner({ goals }: AchievementLevelBannerProps) {
  // Calculate total completed milestones
  const totalCompletedMilestones = goals.reduce((total, goal) => {
    if (!goal.milestones) return total;
    const completedCount = goal.milestones.filter(m => m.completed).length;
    return total + completedCount;
  }, 0);

  const currentBelt = getBeltLevel(totalCompletedMilestones);
  const nextBelt = getNextBelt(currentBelt);
  const progressInCurrentLevel = totalCompletedMilestones - currentBelt.min;
  const progressToNext = nextBelt ? (progressInCurrentLevel / 5) * 100 : 100;
  const milestonesNeeded = nextBelt ? (nextBelt.min - totalCompletedMilestones) : 0;

  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background border-2 border-primary/20">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{currentBelt.emoji}</div>
          <Badge className={`text-xs font-bold px-2 py-1 ${currentBelt.textColor} bg-gradient-to-r ${currentBelt.color} border ${currentBelt.borderColor}`}>
            Level {currentBelt.level} • {currentBelt.name}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">
            {totalCompletedMilestones}
          </p>
          <p className="text-xs text-muted-foreground">Milestones</p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-1">
        <Progress value={progressToNext} className="h-1.5" />
        {nextBelt ? (
          <p className="text-xs text-muted-foreground text-right">
            {milestonesNeeded} more to {nextBelt.emoji} <span className="font-semibold">{nextBelt.name}</span>
          </p>
        ) : (
          <p className="text-xs font-semibold text-right text-primary">
            Max Level Achieved! 🏆
          </p>
        )}
      </div>
    </div>
  );
}
