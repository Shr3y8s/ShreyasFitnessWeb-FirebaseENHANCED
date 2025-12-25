"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, PieChart, Cell } from 'recharts';
import { Target, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { TimeRange } from '@/app/progress/page';

interface PerformanceMetricsTabProps {
  timeRange: TimeRange;
}

// Mock data for progressive overload
const progressiveOverloadData = [
  { week: "W1", totalReps: 520, totalSets: 85, totalWeight: 42000 },
  { week: "W2", totalReps: 535, totalSets: 88, totalWeight: 44500 },
  { week: "W3", totalReps: 550, totalSets: 90, totalWeight: 47000 },
  { week: "W4", totalReps: 520, totalSets: 85, totalWeight: 45000 },
  { week: "W5", totalReps: 565, totalSets: 92, totalWeight: 49000 },
  { week: "W6", totalReps: 580, totalSets: 95, totalWeight: 51000 },
  { week: "W7", totalReps: 595, totalSets: 97, totalWeight: 53000 },
  { week: "W8", totalReps: 610, totalSets: 100, totalWeight: 55000 },
];

// Volume by muscle group
const volumeByMuscleGroup = [
  { name: 'Legs', volume: 15000, percentage: 27 },
  { name: 'Back', volume: 12000, percentage: 22 },
  { name: 'Chest', volume: 11000, percentage: 20 },
  { name: 'Shoulders', volume: 9000, percentage: 16 },
  { name: 'Arms', volume: 8000, percentage: 15 },
];

const COLORS = [
  'oklch(65% 0.16 151)',
  'oklch(70% 0.14 40)',
  'oklch(60% 0.18 20)',
  'oklch(70% 0.14 260)',
  'oklch(60% 0.16 180)',
];

// Rest time analysis
const restTimeData = [
  { week: "W1", avgRest: 90 },
  { week: "W2", avgRest: 85 },
  { week: "W3", avgRest: 80 },
  { week: "W4", avgRest: 85 },
  { week: "W5", avgRest: 75 },
  { week: "W6", avgRest: 70 },
  { week: "W7", avgRest: 75 },
  { week: "W8", avgRest: 70 },
];

// Energy and soreness trends
const energyData = [
  { date: "Aug 9", energy: 7, soreness: 4 },
  { date: "Aug 10", energy: 8, soreness: 3 },
  { date: "Aug 11", energy: 6, soreness: 5 },
  { date: "Aug 12", energy: 9, soreness: 2 },
  { date: "Aug 13", energy: 7, soreness: 4 },
  { date: "Aug 14", energy: 8, soreness: 3 },
  { date: "Aug 15", energy: 9, soreness: 2 },
];

const chartConfig = {
  totalWeight: { label: "Total Weight", color: "oklch(65% 0.16 151)" },
  totalReps: { label: "Total Reps", color: "oklch(70% 0.14 40)" },
};

export function PerformanceMetricsTab({ timeRange }: PerformanceMetricsTabProps) {
  const volumeIncrease = ((progressiveOverloadData[progressiveOverloadData.length - 1].totalWeight - progressiveOverloadData[0].totalWeight) / progressiveOverloadData[0].totalWeight * 100).toFixed(1);
  const repsIncrease = ((progressiveOverloadData[progressiveOverloadData.length - 1].totalReps - progressiveOverloadData[0].totalReps) / progressiveOverloadData[0].totalReps * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Volume Increase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">+{volumeIncrease}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              Last 8 weeks
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              Avg Energy Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">7.7/10</div>
            <p className="text-sm text-muted-foreground mt-1">
              Self-reported
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              Reps Increase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">+{repsIncrease}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              Progressive overload
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progressive Overload Chart */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Progressive Overload Tracking
          </CardTitle>
          <CardDescription>
            Total volume progression over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressiveOverloadData} margin={{ left: 10, right: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-xl">
                          <p className="text-sm font-medium mb-2">{payload[0].payload.week}</p>
                          <p className="text-sm text-primary">
                            Weight: <span className="font-semibold">{payload[0].value?.toLocaleString()} lbs</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Reps: <span className="font-semibold">{payload[0].payload.totalReps}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Sets: <span className="font-semibold">{payload[0].payload.totalSets}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalWeight"
                  stroke="oklch(65% 0.16 151)"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  name="Total Weight"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalReps"
                  stroke="oklch(70% 0.14 40)"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  name="Total Reps"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Volume by Muscle Group */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Volume by Muscle Group
            </CardTitle>
            <CardDescription>
              Training distribution across body parts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={volumeByMuscleGroup}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="volume"
                  >
                    {volumeByMuscleGroup.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-xl">
                            <p className="text-sm font-medium">{payload[0].payload.name}</p>
                            <p className="text-sm text-primary font-semibold mt-1">
                              {payload[0].value?.toLocaleString()} lbs
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {payload[0].payload.percentage}% of total
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {volumeByMuscleGroup.map((group, index) => (
                <div key={group.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span>{group.name}</span>
                  </div>
                  <span className="font-semibold">{group.volume.toLocaleString()} lbs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Rest Time Analysis
            </CardTitle>
            <CardDescription>
              Average rest between sets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={restTimeData} margin={{ left: 10, right: 10, bottom: 5 }}>
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
                    tickFormatter={(value) => `${value}s`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-xl">
                            <p className="text-sm font-medium">{payload[0].payload.week}</p>
                            <p className="text-sm text-primary font-semibold mt-1">
                              {payload[0].value}s average rest
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgRest"
                    stroke="oklch(65% 0.16 151)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Energy and Soreness Tracking */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Recovery Indicators
          </CardTitle>
          <CardDescription>
            Self-reported energy and soreness levels (1-10 scale)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={energyData} margin={{ left: 10, right: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  domain={[0, 10]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-xl">
                          <p className="text-sm font-medium mb-2">{payload[0].payload.date}</p>
                          <p className="text-sm text-green-600">
                            Energy: <span className="font-semibold">{payload[0].payload.energy}/10</span>
                          </p>
                          <p className="text-sm text-orange-600">
                            Soreness: <span className="font-semibold">{payload[0].payload.soreness}/10</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="oklch(70% 0.14 140)"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  name="Energy"
                />
                <Line
                  type="monotone"
                  dataKey="soreness"
                  stroke="oklch(70% 0.14 40)"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  name="Soreness"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-[oklch(70%_0.14_140)]" />
              <span>Higher is better (Energy)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-[oklch(70%_0.14_40)]" />
              <span>Lower is better (Soreness)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Performance Insights
          </CardTitle>
          <CardDescription>
            Key takeaways from your training data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="font-semibold text-green-700">✓ Strong Progressive Overload</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your total volume has increased by {volumeIncrease}% over the past 8 weeks, indicating excellent progressive overload.
              </p>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="font-semibold text-blue-700">→ Balanced Muscle Development</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your training volume is well-distributed across muscle groups, with legs and back receiving appropriate emphasis.
              </p>
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="font-semibold text-yellow-700">! Watch Rest Times</p>
              <p className="text-sm text-muted-foreground mt-1">
                Rest times have decreased to 70s. Consider if this aligns with your strength goals or if you need more recovery.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
