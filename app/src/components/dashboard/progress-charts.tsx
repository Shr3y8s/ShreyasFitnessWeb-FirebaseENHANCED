"use client";

import { Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { month: 'Jan', weight: 195 },
  { month: 'Feb', weight: 197 },
  { month: 'Mar', weight: 198 },
  { month: 'Apr', weight: 201 },
  { month: 'May', weight: 206 },
  { month: 'Jun', weight: 193 }
];

export function ProgressCharts() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
      <div className="flex flex-col space-y-1.5 p-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold leading-none tracking-tight">Progress Overview</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Your body composition changes over the last 6 months.
        </p>
      </div>
      <div className="p-6 pt-0">
        <div className="w-full h-[300px] min-h-[300px] rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <ResponsiveContainer width="100%" height={300} minHeight={300}>
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary))" opacity={0.2} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--primary))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{
                  color: 'hsl(var(--foreground))',
                  fontWeight: 'bold'
                }}
                formatter={(value: number) => [`${value} lbs`, 'Weight']}
                labelFormatter={(label) => `${label} 2024`}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="url(#weightGradient)"
                dot={{
                  fill: 'hsl(var(--primary))',
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))',
                  r: 4
                }}
                activeDot={{
                  r: 6,
                  fill: 'hsl(var(--primary))',
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
