"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Dumbbell, TrendingUp, Trophy } from 'lucide-react';
import { TimeRange } from '@/app/progress/page';

interface StrengthProgressTabProps {
  timeRange: TimeRange;
}

// Mock data for strength progression
const liftProgressionData = [
  { date: "2024-01-15", squat: 225, bench: 185, deadlift: 275, ohp: 115 },
  { date: "2024-02-15", squat: 235, bench: 195, deadlift: 285, ohp: 120 },
  { date: "2024-03-15", squat: 245, bench: 200, deadlift: 295, ohp: 125 },
  { date: "2024-04-15", squat: 255, bench: 205, deadlift: 305, ohp: 130 },
  { date: "2024-05-15", squat: 265, bench: 210, deadlift: 315, ohp: 135 },
  { date: "2024-06-15", squat: 275, bench: 215, deadlift: 325, ohp: 140 },
  { date: "2024-07-15", squat: 285, bench: 220, deadlift: 335, ohp: 145 },
  { date: "2024-08-15", squat: 295, bench: 225, deadlift: 345, ohp: 150 },
];

const personalRecords = [
  { exercise: 'Squat', current: 295, start: 225, increase: 70, percentIncrease: 31 },
  { exercise: 'Bench Press', current: 225, start: 185, increase: 40, percentIncrease: 22 },
  { exercise: 'Deadlift', current: 345, start: 275, increase: 70, percentIncrease: 25 },
  { exercise: 'Overhead Press', current: 150, start: 115, increase: 35, percentIncrease: 30 },
];

const chartConfig = {
  squat: { label: "Squat", color: "oklch(65% 0.16 151)" },
  bench: { label: "Bench", color: "oklch(70% 0.14 40)" },
  deadlift: { label: "Deadlift", color: "oklch(60% 0.18 20)" },
  ohp: { label: "OHP", color: "oklch(70% 0.14 260)" },
};

export function StrengthProgressTab({ timeRange }: StrengthProgressTabProps) {
  const avgIncrease = Math.round(
    personalRecords.reduce((sum, r) => sum + r.percentIncrease, 0) / personalRecords.length
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {personalRecords.map((record) => (
          <Card key={record.exercise} className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Dumbbell className="h-4 w-4" />
                {record.exercise}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{record.current} lbs</div>
              <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                +{record.increase} lbs ({record.percentIncrease}%)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Strength Progress Card */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Strength Progress
          </CardTitle>
          <CardDescription>
            Track your progress on the major lifts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Average Increase</p>
                <p className="text-3xl font-bold text-primary mt-1">{avgIncrease}%</p>
                <p className="text-xs text-muted-foreground mt-1">Across all lifts</p>
              </div>
              <div className="p-4 bg-green-500/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Gained</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {personalRecords.reduce((sum, r) => sum + r.increase, 0)} lbs
                </p>
                <p className="text-xs text-muted-foreground mt-1">Since you started</p>
              </div>
            </div>

            {/* Progress Chart */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">Lift Progression</h4>
                <p className="text-sm text-muted-foreground">See how your strength has improved over time</p>
              </div>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={liftProgressionData} margin={{ left: 10, right: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value} lbs`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-xl">
                              <p className="text-sm font-medium mb-2">
                                {new Date(payload[0].payload.date).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  year: 'numeric'
                                })}
                              </p>
                              {payload.map((entry, index) => (
                                <p key={index} className="text-sm" style={{ color: entry.color }}>
                                  {entry.name}: <span className="font-semibold">{entry.value} lbs</span>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="squat"
                      stroke="oklch(65% 0.16 151)"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      name="Squat"
                    />
                    <Line
                      type="monotone"
                      dataKey="bench"
                      stroke="oklch(70% 0.14 40)"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      name="Bench"
                    />
                    <Line
                      type="monotone"
                      dataKey="deadlift"
                      stroke="oklch(60% 0.18 20)"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      name="Deadlift"
                    />
                    <Line
                      type="monotone"
                      dataKey="ohp"
                      stroke="oklch(70% 0.14 260)"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      name="OHP"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Recent Wins */}
            <div className="space-y-3">
              <h4 className="font-semibold">Recent Wins 🎉</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <div>
                    <p className="font-medium text-green-700">New Squat PR!</p>
                    <p className="text-sm text-muted-foreground">Hit 295 lbs for the first time</p>
                  </div>
                  <span className="text-xs text-muted-foreground">2 days ago</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <div>
                    <p className="font-medium text-green-700">New Bench PR!</p>
                    <p className="text-sm text-muted-foreground">Hit 225 lbs for the first time</p>
                  </div>
                  <span className="text-xs text-muted-foreground">1 week ago</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
