"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, TrendingUp, Calendar, CheckCircle2, Circle, Plus } from 'lucide-react';
import { TimeRange } from '@/app/progress/page';

interface GoalsMilestonesTabProps {
  timeRange: TimeRange;
}

// Mock data for active goals
const activeGoals = [
  {
    id: 1,
    title: 'Reach 185 lbs bodyweight',
    category: 'Body Composition',
    current: 188,
    target: 185,
    unit: 'lbs',
    progress: 60,
    deadline: '2024-09-30',
    status: 'on-track',
  },
  {
    id: 2,
    title: 'Squat 315 lbs for 1 rep',
    category: 'Strength',
    current: 295,
    target: 315,
    unit: 'lbs',
    progress: 75,
    deadline: '2024-10-15',
    status: 'on-track',
  },
  {
    id: 3,
    title: 'Complete 50 workouts',
    category: 'Consistency',
    current: 36,
    target: 50,
    unit: 'workouts',
    progress: 72,
    deadline: '2024-12-31',
    status: 'on-track',
  },
  {
    id: 4,
    title: 'Bench Press 225 lbs',
    category: 'Strength',
    current: 225,
    target: 225,
    unit: 'lbs',
    progress: 100,
    deadline: '2024-08-30',
    status: 'achieved',
  },
];

// Milestone timeline
const milestones = [
  {
    id: 1,
    title: 'First 225 lb Squat',
    description: 'Hit a major milestone with your first 225 lb squat!',
    date: '2024-01-15',
    category: 'Strength',
    icon: '🏋️',
  },
  {
    id: 2,
    title: '10 lb Weight Loss',
    description: 'Lost your first 10 lbs since starting the program',
    date: '2024-03-20',
    category: 'Body Composition',
    icon: '🎯',
  },
  {
    id: 3,
    title: '100 Workouts Completed',
    description: 'Consistency milestone - completed 100 training sessions!',
    date: '2024-05-12',
    category: 'Consistency',
    icon: '💪',
  },
  {
    id: 4,
    title: 'Bench Press 225 lbs',
    description: 'Achieved the coveted 2-plate bench press',
    date: '2024-08-15',
    category: 'Strength',
    icon: '🏆',
  },
];

// Goal completion history
const completionStats = {
  totalGoals: 12,
  completed: 8,
  inProgress: 4,
  successRate: 80,
};

// Predictions
const predictions = [
  {
    goal: 'Reach 185 lbs',
    predictedDate: 'Sep 25, 2024',
    confidence: 'High',
    daysRemaining: 10,
  },
  {
    goal: 'Squat 315 lbs',
    predictedDate: 'Oct 12, 2024',
    confidence: 'Medium',
    daysRemaining: 27,
  },
];

export function GoalsMilestonesTab({ timeRange }: GoalsMilestonesTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completionStats.inProgress}</div>
            <p className="text-sm text-muted-foreground mt-1">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completionStats.completed}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Goals achieved
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{completionStats.successRate}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              Historical average
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{milestones.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Major achievements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Active Goals
              </CardTitle>
              <CardDescription>
                Track progress toward your fitness objectives
              </CardDescription>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeGoals.map((goal) => (
              <div
                key={goal.id}
                className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{goal.title}</h4>
                      {goal.status === 'achieved' && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/50">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Achieved
                        </Badge>
                      )}
                      {goal.status === 'on-track' && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/50">
                          On Track
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{goal.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {goal.current}
                      <span className="text-sm text-muted-foreground">/{goal.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{goal.unit}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress value={goal.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{goal.progress}% complete</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Goal Predictions */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Goal Predictions
          </CardTitle>
          <CardDescription>
            Estimated completion dates based on current progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {predictions.map((prediction, index) => (
              <div
                key={index}
                className="p-4 bg-primary/5 border border-primary/20 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{prediction.goal}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Predicted: {prediction.predictedDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={
                      prediction.confidence === 'High' 
                        ? 'bg-green-500/10 text-green-700 border-green-500/50'
                        : 'bg-yellow-500/10 text-yellow-700 border-yellow-500/50'
                    }>
                      {prediction.confidence} Confidence
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {prediction.daysRemaining} days remaining
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Milestone Timeline */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Milestone Timeline
          </CardTitle>
          <CardDescription>
            Major achievements on your fitness journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={milestone.id} className="relative pl-16">
                  {/* Timeline dot */}
                  <div className="absolute left-6 top-1 w-5 h-5 rounded-full bg-primary border-4 border-background" />
                  
                  <div className="pb-8">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{milestone.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{milestone.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {milestone.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {milestone.description}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(milestone.date).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Records Feed */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Recent Personal Records
          </CardTitle>
          <CardDescription>
            Your latest PRs and achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { exercise: 'Bench Press', weight: 225, date: '2024-08-15', improvement: '+5 lbs' },
              { exercise: 'Squat', weight: 295, date: '2024-08-12', improvement: '+10 lbs' },
              { exercise: 'Deadlift', weight: 345, date: '2024-08-08', improvement: '+10 lbs' },
              { exercise: 'Overhead Press', weight: 150, date: '2024-08-05', improvement: '+5 lbs' },
            ].map((pr, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{pr.exercise}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{pr.weight} lbs</p>
                  <p className="text-sm text-green-600">{pr.improvement}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
