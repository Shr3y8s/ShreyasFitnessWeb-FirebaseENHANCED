"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, LineChart, ResponsiveContainer } from 'recharts';
import { Activity, TrendingDown, Weight, Pencil, CheckCircle2 } from 'lucide-react';
import { TimeRange } from '@/app/progress/page';
import { LogWeightDialog } from './dialogs/log-weight-dialog';

interface BodyCompositionTabProps {
  timeRange: TimeRange;
}

// Mock data for body composition
const initialWeightData = [
  { date: "2024-01-15", weight: 215, bodyFat: 25.4 },
  { date: "2024-02-15", weight: 212, bodyFat: 25.1 },
  { date: "2024-03-15", weight: 210, bodyFat: 24.6 },
  { date: "2024-04-15", weight: 204, bodyFat: 23.9 },
  { date: "2024-05-15", weight: 195, bodyFat: 23.1 },
  { date: "2024-06-15", weight: 195, bodyFat: 22.5 },
  { date: "2024-07-15", weight: 192, bodyFat: 21.8 },
  { date: "2024-08-15", weight: 188, bodyFat: 20.9 },
];

const chartConfig = {
  weight: {
    label: "Weight (lbs)",
    color: "oklch(65% 0.16 151)",
  },
  bodyFat: {
    label: "Body Fat %",
    color: "oklch(70% 0.14 40)",
  },
};

export function BodyCompositionTab({ timeRange }: BodyCompositionTabProps) {
  const [weightData, setWeightData] = useState(initialWeightData);
  const [logWeightOpen, setLogWeightOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const currentWeight = weightData[weightData.length - 1].weight;
  const startWeight = weightData[0].weight;
  const weightChange = currentWeight - startWeight;
  const currentBodyFat = weightData[weightData.length - 1].bodyFat;
  const startBodyFat = weightData[0].bodyFat;
  const bodyFatChange = currentBodyFat - startBodyFat;

  const handleLogWeight = (data: { weight: number; bodyFat?: number; date: string }) => {
    console.log('Weight logged:', data);
    // In a real app, this would save to Firestore
    // For now, just show success message
    setSuccessMessage('Weight logged successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Weight className="h-4 w-4" />
                Current Weight
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLogWeightOpen(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentWeight} lbs</div>
            <p className={`text-sm flex items-center gap-1 mt-1 ${weightChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingDown className="h-3 w-3" />
              {Math.abs(weightChange)} lbs since start
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" />
                Body Fat %
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLogWeightOpen(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentBodyFat}%</div>
            <p className={`text-sm flex items-center gap-1 mt-1 ${bodyFatChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingDown className="h-3 w-3" />
              {Math.abs(bodyFatChange).toFixed(1)}% since start
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weight Trend Chart */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Weight className="h-5 w-5 text-primary" />
            Weight Progression
          </CardTitle>
          <CardDescription>
            Track your weight changes over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weightData} margin={{ left: 10, right: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.05} />
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
                  tickFormatter={(value) => `${value} lbs`}
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
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-primary font-semibold mt-1">
                            {payload[0].value} lbs
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="oklch(65% 0.16 151)"
                  strokeWidth={2.5}
                  fill="url(#colorWeight)"
                  dot={{ r: 5, strokeWidth: 2, fill: 'oklch(1 0 0)', stroke: 'oklch(65% 0.16 151)' }}
                  activeDot={{ r: 7, strokeWidth: 2, fill: 'oklch(65% 0.16 151)', stroke: 'oklch(1 0 0)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Body Fat Chart */}
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Body Fat Percentage
          </CardTitle>
          <CardDescription>
            Monitor your body composition changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightData} margin={{ left: 10, right: 10, bottom: 5 }}>
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
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 12 }}
                  domain={[20, 26]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-xl">
                          <p className="text-sm font-medium">
                            {new Date(payload[0].payload.date).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-primary font-semibold mt-1">
                            {payload[0].value}% Body Fat
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bodyFat"
                  stroke="oklch(70% 0.14 40)"
                  strokeWidth={2.5}
                  dot={{ r: 5, strokeWidth: 2, fill: 'oklch(1 0 0)', stroke: 'oklch(70% 0.14 40)' }}
                  activeDot={{ r: 7, strokeWidth: 2, fill: 'oklch(70% 0.14 40)', stroke: 'oklch(1 0 0)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Dialog */}
      <LogWeightDialog
        open={logWeightOpen}
        onOpenChange={setLogWeightOpen}
        onSave={handleLogWeight}
      />
    </div>
  );
}
