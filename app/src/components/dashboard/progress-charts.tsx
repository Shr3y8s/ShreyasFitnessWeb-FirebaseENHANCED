"use client";

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import {
  ChartContainer,
} from '@/components/ui/chart';
import { Activity } from 'lucide-react';

const chartData = [
  { month: "Jan", year: "2024", date: "January 15, 2024", weight: 215, bodyFat: 25.4 },
  { month: "Feb", year: "2024", date: "February 15, 2024", weight: 212, bodyFat: 25.1 },
  { month: "Mar", year: "2024", date: "March 15, 2024", weight: 210, bodyFat: 24.6 },
  { month: "Apr", year: "2024", date: "April 15, 2024", weight: 204, bodyFat: 23.9 },
  { month: "May", year: "2024", date: "May 15, 2024", weight: 195, bodyFat: 23.1 },
  { month: "Jun", year: "2024", date: "June 15, 2024", weight: 195, bodyFat: 22.5 },
];

const chartConfig = {
  weight: {
    label: "Weight (lbs)",
    color: "hsl(var(--primary))",
  },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      month: string;
      year: string;
      date: string;
      weight: number;
      bodyFat: number;
    };
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-2 bg-card/60 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg min-w-[150px]">
            <p className="text-sm font-semibold mb-1 text-primary">{data.date}</p>
            <div className="space-y-1 text-xs">
                <div>
                    <p className="font-medium text-muted-foreground">Weight</p>
                    <p className="font-semibold text-foreground">{`${data.weight} lbs`}</p>
                </div>
                <div>
                    <p className="font-medium text-muted-foreground">Body Fat</p>
                    <p className="font-semibold text-foreground">{`${data.bodyFat}%`}</p>
                </div>
            </div>
        </div>
      );
    }
  
    return null;
  };

export function ProgressCharts() {
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader>
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Progress Overview
        </h3>
        <CardDescription>
          Your body composition changes over the last 6 months.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 10,
              right: 10,
              bottom: 5
            }}
          >
            <defs>
              <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => value.slice(0, 3)}
              tick={{ fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={5}
              domain={[190, 220]}
              tickFormatter={(value) => `${value} lbs`}
              stroke="oklch(65% 0.16 151)"
              tick={{ fontSize: 12, fontWeight: 600 }}
            />
            <Tooltip
              cursor={false}
              content={<CustomTooltip />}
            />
            <Area
              yAxisId="left"
              dataKey="weight"
              type="natural"
              fill="url(#colorWeight)"
              fillOpacity={0.6}
              stroke="oklch(65% 0.16 151)"
              strokeWidth={2.5}
              name="Weight"
              dot={{
                r: 5,
                strokeWidth: 2,
                fill: 'oklch(1 0 0)',
                stroke: 'oklch(65% 0.16 151)',
              }}
              activeDot={{
                r: 7,
                strokeWidth: 2,
                fill: 'oklch(65% 0.16 151)',
                stroke: 'oklch(1 0 0)'
              }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
