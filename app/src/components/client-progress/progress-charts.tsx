"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getRecentWeightLogs } from '@/lib/activity-api';
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
import { Activity, Loader2 } from 'lucide-react';

interface ChartDataPoint {
  dateKey: string;  // YYYY-MM-DD format for unique X-axis
  month: string;
  year: string;
  date: string;  // Formatted for tooltip display
  weight: number;
  bodyFat: number | null;
}

const chartConfig = {
  weight: {
    label: "Weight (lbs)",
    color: "hsl(var(--primary))",
  },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
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
          {data.bodyFat && (
            <div>
              <p className="font-medium text-muted-foreground">Body Fat</p>
              <p className="font-semibold text-foreground">{`${data.bodyFat}%`}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export function ProgressCharts() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyAvg, setMonthlyAvg] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadWeightData = async () => {
      try {
        setLoading(true);
        
        // Fetch weight logs (last 100 entries should cover most use cases)
        const weights = await getRecentWeightLogs(user.uid, 100);
        
        if (weights.length === 0) {
          setChartData([]);
          setMonthlyAvg(null);
          setLoading(false);
          return;
        }

        // Sort by date (oldest first)
        const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));

        // Transform to chart format
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const transformed: ChartDataPoint[] = sorted.map((log) => {
          // Parse date string (YYYY-MM-DD) properly to avoid timezone issues
          const [year, month, day] = log.date.split('-').map(Number);
          
          // Convert to lbs for consistency in chart
          let weightInLbs = log.weight;
          if (log.unit === 'kg') {
            weightInLbs = log.weight * 2.20462;
          }

          return {
            dateKey: log.date,  // YYYY-MM-DD - unique and sortable
            month: monthShort[month - 1],
            year: year.toString(),
            date: `${monthNames[month - 1]} ${day}, ${year}`,
            weight: Math.round(weightInLbs * 10) / 10, // Round to 1 decimal
            bodyFat: null // Can be added later if needed
          };
        });

        setChartData(transformed);

        // Calculate monthly average (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const recentWeights = sorted.filter(log => log.date >= thirtyDaysAgoStr);
        
        if (recentWeights.length >= 7) {
          // Calculate average weekly weight loss/gain (requires at least 7 days of data)
          const oldestInMonth = recentWeights[0];
          const latestInMonth = recentWeights[recentWeights.length - 1];
          
          // Convert to lbs for calculation
          let oldestWeight = oldestInMonth.weight;
          let latestWeight = latestInMonth.weight;
          
          if (oldestInMonth.unit === 'kg') {
            oldestWeight *= 2.20462;
          }
          if (latestInMonth.unit === 'kg') {
            latestWeight *= 2.20462;
          }

          const weightChange = latestWeight - oldestWeight;
          const daysDiff = Math.max(1, (new Date(latestInMonth.date).getTime() - new Date(oldestInMonth.date).getTime()) / (1000 * 60 * 60 * 24));
          const weeksInPeriod = daysDiff / 7;
          const avgPerWeek = weeksInPeriod > 0 ? weightChange / weeksInPeriod : 0;
          
          setMonthlyAvg(avgPerWeek);
        } else {
          setMonthlyAvg(null);
        }

      } catch (error) {
        console.error('Error loading weight data:', error);
        setChartData([]);
        setMonthlyAvg(null);
      } finally {
        setLoading(false);
      }
    };

    loadWeightData();
  }, [user]);

  if (loading) {
    return (
      <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
        <CardHeader>
          <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Progress Overview
          </h3>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
        <CardHeader>
          <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Progress Overview
          </h3>
          <CardDescription>
            Your body composition changes over time.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No weight data available yet.</p>
          <p className="text-sm mt-2">Start logging your weight in the Daily Activities page!</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate Y-axis domain with padding
  const weights = chartData.map(d => d.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const padding = (maxWeight - minWeight) * 0.1 || 5; // 10% padding or 5 lbs minimum
  const yMin = Math.floor(minWeight - padding);
  const yMax = Math.ceil(maxWeight + padding);

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Progress Overview
          </h3>
          <CardDescription>
            Your body composition changes over {chartData.length > 30 ? 'the last several months' : 'time'}.
          </CardDescription>
        </div>
        {/* Callout Box */}
        {monthlyAvg !== null && (
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 shadow-lg border border-border/50">
            <p className="text-2xl font-bold text-green-600 dark:text-green-500">
              {monthlyAvg > 0 ? '+' : ''}{monthlyAvg.toFixed(1)} lbs/week
            </p>
            <p className="text-xs text-muted-foreground">On avg. this month</p>
          </div>
        )}
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
              dataKey="dateKey"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => {
                // Format YYYY-MM-DD to "MMM DD"
                const [year, month, day] = value.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
              }}
              tick={{ fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={5}
              domain={[yMin, yMax]}
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
