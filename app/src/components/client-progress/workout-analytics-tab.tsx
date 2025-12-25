"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, Flame, Target, TrendingUp } from 'lucide-react';
import { TimeRange } from '@/app/progress/page';

interface WorkoutAnalyticsTabProps {
  timeRange: TimeRange;
}

// Mock data for workout consistency
const consistencyData = [
  { week: "W1", completed: 4, planned: 5, adherence: 80 },
  { week: "W2", completed: 5, planned: 5, adherence: 100 },
  { week: "W3", completed: 3, planned: 5, adherence: 60 },
  { week: "W4", completed: 5, planned: 5, adherence: 100 },
  { week: "W5", completed: 4, planned: 5, adherence: 80 },
  { week: "W6", completed: 5, planned: 5, adherence: 100 },
  { week: "W7", completed: 5, planned: 5, adherence: 100 },
  { week: "W8", completed: 4, planned: 5, adherence: 80 },
];

const sessionDurationData = [
  { date: "Aug 9", duration: 55 },
  { date: "Aug 10", duration: 62 },
  { date: "Aug 11", duration: 48 },
  { date: "Aug 12", duration: 58 },
  { date: "Aug 13", duration: 65 },
  { date: "Aug 14", duration: 52 },
  { date: "Aug 15", duration: 60 },
];

// Heatmap data for workout calendar (last 8 weeks)
const heatmapData = [
  [1, 1, 0, 1, 1, 0, 0], // Week 1
  [1, 0, 1, 1, 1, 0, 0], // Week 2
  [0, 1, 1, 0, 1, 0, 0], // Week 3
  [1, 1, 0, 1, 1, 0, 0], // Week 4
  [1, 0, 1, 1, 1, 0, 0], // Week 5
  [1, 1, 1, 0, 1, 0, 0], // Week 6
  [1, 1, 0, 1, 1, 0, 0], // Week 7
  [1, 0, 1, 1, 1, 0, 0], // Week 8
];

const workoutsByDayOfWeek = [
  { day: "Mon", count: 7 },
  { day: "Tue", count: 6 },
  { day: "Wed", count: 8 },
  { day: "Thu", count: 5 },
  { day: "Fri", count: 7 },
  { day: "Sat", count: 2 },
  { day: "Sun", count: 1 },
];

const chartConfig = {
  completed: { label: "Completed", color: "oklch(65% 0.16 151)" },
  planned: { label: "Planned", color: "oklch(80% 0.05 151)" },
};

export function WorkoutAnalyticsTab({ timeRange }: WorkoutAnalyticsTabProps) {
  const totalWorkouts = consistencyData.reduce((sum, w) => sum + w.completed, 0);
  const totalPlanned = consistencyData.reduce((sum, w) => sum + w.planned, 0);
  const overallAdherence = Math.round((totalWorkouts / totalPlanned) * 100);
  const avgDuration = Math.round(sessionDurationData.reduce((sum, d) => sum + d.duration, 0) / sessionDurationData.length);
  const currentStreak = 5;
  const longestStreak = 12;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              Adherence Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overallAdherence}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              {totalWorkouts} of {totalPlanned} workouts
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Flame className="h-4 w-4" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentStreak} days</div>
            <p className="text-sm text-muted-foreground mt-1">
              Keep it going!
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Longest Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{longestStreak} days</div>
            <p className="text-sm text-muted-foreground mt-1">
              Personal best
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Consistency Heat Map */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Workout Consistency Calendar
          </CardTitle>
          <CardDescription>
            Your training consistency over the past 8 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-8 gap-1 text-xs text-muted-foreground">
              <div></div>
              <div className="text-center">Mon</div>
              <div className="text-center">Tue</div>
              <div className="text-center">Wed</div>
              <div className="text-center">Thu</div>
              <div className="text-center">Fri</div>
              <div className="text-center">Sat</div>
              <div className="text-center">Sun</div>
            </div>
            {heatmapData.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-8 gap-1">
                <div className="text-xs text-muted-foreground text-center self-center">
                  W{weekIndex + 1}
                </div>
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`h-8 rounded transition-all ${
                      day === 1
                        ? 'bg-primary hover:bg-primary/80'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    title={day === 1 ? 'Workout completed' : 'Rest day'}
                  />
                ))}
              </div>
            ))}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span>Workout Day</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-muted rounded"></div>
                <span>Rest Day</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Adherence Chart */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Weekly Workout Adherence
          </CardTitle>
          <CardDescription>
            Completed vs. planned workouts each week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consistencyData} margin={{ left: 10, right: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  domain={[0, 6]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-xl">
                          <p className="text-sm font-medium">{payload[0].payload.week}</p>
                          <p className="text-sm text-primary font-semibold mt-1">
                            {payload[0].payload.completed} of {payload[0].payload.planned} workouts
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {payload[0].payload.adherence}% adherence
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="planned"
                  fill="oklch(80% 0.05 151)"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="completed"
                  fill="oklch(65% 0.16 151)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Overall Statistics
          </CardTitle>
          <CardDescription>
            Your workout performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Workouts</p>
              <p className="text-2xl font-bold mt-1">{totalWorkouts}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 8 weeks</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Average Per Week</p>
              <p className="text-2xl font-bold mt-1">{(totalWorkouts / 8).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">Consistency score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
