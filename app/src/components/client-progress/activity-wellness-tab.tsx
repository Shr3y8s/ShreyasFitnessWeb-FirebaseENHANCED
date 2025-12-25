"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartContainer } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, BarChart, ResponsiveContainer } from 'recharts';
import { Footprints, Flame, Heart, Moon, Watch, Link2, TrendingUp, Activity } from 'lucide-react';
import { TimeRange } from '@/app/progress/page';

interface ActivityWellnessTabProps {
  timeRange: TimeRange;
}

// Mock data for activity tracking (simulating Apple Watch/Fitbit data)
const dailyActivityData = [
  { date: "2024-08-09", steps: 8234, caloriesBurned: 2340, activeMinutes: 45, heartRate: 72 },
  { date: "2024-08-10", steps: 10521, caloriesBurned: 2580, activeMinutes: 60, heartRate: 75 },
  { date: "2024-08-11", steps: 7845, caloriesBurned: 2210, activeMinutes: 35, heartRate: 70 },
  { date: "2024-08-12", steps: 12340, caloriesBurned: 2750, activeMinutes: 75, heartRate: 78 },
  { date: "2024-08-13", steps: 9567, caloriesBurned: 2420, activeMinutes: 50, heartRate: 73 },
  { date: "2024-08-14", steps: 11234, caloriesBurned: 2640, activeMinutes: 65, heartRate: 76 },
  { date: "2024-08-15", steps: 10890, caloriesBurned: 2530, activeMinutes: 58, heartRate: 74 },
];

const sleepData = [
  { date: "Aug 9", hours: 7.2, quality: 82 },
  { date: "Aug 10", hours: 6.8, quality: 75 },
  { date: "Aug 11", hours: 8.1, quality: 89 },
  { date: "Aug 12", hours: 7.5, quality: 85 },
  { date: "Aug 13", hours: 7.0, quality: 78 },
  { date: "Aug 14", hours: 7.8, quality: 87 },
  { date: "Aug 15", hours: 7.3, quality: 80 },
];

const chartConfig = {
  steps: { label: "Steps", color: "oklch(65% 0.16 151)" },
  calories: { label: "Calories", color: "oklch(70% 0.14 40)" },
};

export function ActivityWellnessTab({ timeRange }: ActivityWellnessTabProps) {
  const isDeviceConnected = false; // Set to true when device is connected
  const todayData = dailyActivityData[dailyActivityData.length - 1];
  const avgSteps = Math.round(dailyActivityData.reduce((sum, d) => sum + d.steps, 0) / dailyActivityData.length);
  const avgCalories = Math.round(dailyActivityData.reduce((sum, d) => sum + d.caloriesBurned, 0) / dailyActivityData.length);

  return (
    <div className="space-y-6">
      {/* Device Connection Status */}
      {!isDeviceConnected && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Watch className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Connect Your Wearable Device</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sync your Apple Watch or Fitbit to track activity, heart rate, and more
                  </p>
                </div>
              </div>
              <Button className="gap-2 whitespace-nowrap">
                <Link2 className="h-4 w-4" />
                Connect Device
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isDeviceConnected && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Watch className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Apple Watch Connected</p>
                  <p className="text-sm text-muted-foreground">Last synced: 2 minutes ago</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/50">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Footprints className="h-4 w-4" />
              Steps Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayData.steps.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Goal: 10,000 ({Math.round((todayData.steps / 10000) * 100)}%)
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Flame className="h-4 w-4" />
              Calories Burned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayData.caloriesBurned}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Active: {Math.round(todayData.caloriesBurned * 0.3)} cal
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              Active Minutes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayData.activeMinutes}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Goal: 60 min ({Math.round((todayData.activeMinutes / 60) * 100)}%)
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4" />
              Avg Heart Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayData.heartRate} bpm</div>
            <p className="text-sm text-muted-foreground mt-1">
              Resting: 65 bpm
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trends with All Charts */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Weekly Trends
          </CardTitle>
          <CardDescription>
            Compare your activity across recent weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Daily Avg Steps</p>
                <p className="text-2xl font-bold mt-1">{avgSteps.toLocaleString()}</p>
                <p className="text-sm text-green-600 flex items-center justify-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +8% this week
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Avg Calories Burned</p>
                <p className="text-2xl font-bold mt-1">{avgCalories}</p>
                <p className="text-sm text-green-600 flex items-center justify-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +5% this week
                </p>
              </div>
            </div>

            {/* Daily Steps Chart */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-primary" />
                  Daily Steps
                </h4>
                <p className="text-sm text-muted-foreground">Track your daily movement and activity levels</p>
              </div>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyActivityData} margin={{ left: 10, right: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-xl">
                              <p className="text-sm font-medium">
                                {new Date(payload[0].payload.date).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric'
                                })}
                              </p>
                              <p className="text-sm text-primary font-semibold mt-1">
                                {payload[0].value?.toLocaleString()} steps
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="steps"
                      fill="oklch(65% 0.16 151)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Calories Burned Chart */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />
                  Calories Burned
                </h4>
                <p className="text-sm text-muted-foreground">Monitor your daily calorie expenditure</p>
              </div>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyActivityData} margin={{ left: 10, right: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(70% 0.14 40)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="oklch(70% 0.14 40)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-xl">
                              <p className="text-sm font-medium">
                                {new Date(payload[0].payload.date).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric'
                                })}
                              </p>
                              <p className="text-sm text-primary font-semibold mt-1">
                                {payload[0].value} calories
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="caloriesBurned"
                      stroke="oklch(70% 0.14 40)"
                      strokeWidth={2.5}
                      fill="url(#colorCalories)"
                      dot={{ r: 5, strokeWidth: 2, fill: 'oklch(1 0 0)', stroke: 'oklch(70% 0.14 40)' }}
                      activeDot={{ r: 7, strokeWidth: 2, fill: 'oklch(70% 0.14 40)', stroke: 'oklch(1 0 0)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Sleep Quality Chart */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Moon className="h-4 w-4 text-primary" />
                  Sleep Quality
                </h4>
                <p className="text-sm text-muted-foreground">Track your rest and recovery patterns</p>
              </div>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={sleepData} margin={{ left: 10, right: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(60% 0.14 260)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="oklch(60% 0.14 260)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
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
                      tickFormatter={(value) => `${value}h`}
                      tick={{ fontSize: 12 }}
                      domain={[6, 9]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-xl">
                              <p className="text-sm font-medium">{payload[0].payload.date}</p>
                              <p className="text-sm text-primary font-semibold mt-1">
                                {payload[0].value} hours
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Quality: {payload[0].payload.quality}%
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="oklch(60% 0.14 260)"
                      strokeWidth={2.5}
                      fill="url(#colorSleep)"
                      dot={{ r: 5, strokeWidth: 2, fill: 'oklch(1 0 0)', stroke: 'oklch(60% 0.14 260)' }}
                      activeDot={{ r: 7, strokeWidth: 2, fill: 'oklch(60% 0.14 260)', stroke: 'oklch(1 0 0)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
