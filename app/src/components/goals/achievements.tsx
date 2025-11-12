"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Flame, Star, Award, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  earnedDate: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const achievements: Achievement[] = [
  {
    id: '1',
    icon: '🏆',
    title: 'First Goal Completed',
    description: 'Completed your very first goal',
    earnedDate: '2024-01-15',
    rarity: 'common',
  },
  {
    id: '2',
    icon: '🔥',
    title: '7-Day Streak',
    description: 'Maintained progress for 7 days straight',
    earnedDate: '2024-03-20',
    rarity: 'rare',
  },
  {
    id: '3',
    icon: '⭐',
    title: '5 Goals Mastery',
    description: 'Successfully completed 5 goals',
    earnedDate: '2024-05-12',
    rarity: 'epic',
  },
  {
    id: '4',
    icon: '💪',
    title: 'Consistency Champion',
    description: 'Hit milestones on time for 3 months',
    earnedDate: '2024-08-15',
    rarity: 'legendary',
  },
];

const getRarityStyle = (rarity: string) => {
  switch (rarity) {
    case 'legendary':
      return 'border-yellow-500/50 bg-yellow-500/5 text-yellow-700';
    case 'epic':
      return 'border-purple-500/50 bg-purple-500/5 text-purple-700';
    case 'rare':
      return 'border-blue-500/50 bg-blue-500/5 text-blue-700';
    default:
      return 'border-gray-500/50 bg-gray-500/5 text-gray-700';
  }
};

export function Achievements() {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Achievements
        </CardTitle>
        <CardDescription>
          Your earned badges and milestones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-3 border rounded-lg transition-all hover:shadow-md ${getRarityStyle(achievement.rarity)}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{achievement.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{achievement.title}</h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs capitalize ${getRarityStyle(achievement.rarity)} border-current`}
                    >
                      {achievement.rarity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {achievement.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Earned: {new Date(achievement.earnedDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Stats footer */}
        <div className="mt-6 pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Achievements</span>
            <span className="font-bold text-primary">{achievements.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completion Rate</span>
            <span className="font-bold text-green-600">80%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
