"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Dumbbell, ArrowUp, ArrowDown, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStrengthTrendsByCategory, type CategoryTrend } from '@/lib/strength-metrics';

export function StrengthTrends() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<CategoryTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const result = await getStrengthTrendsByCategory(user.uid);
        setTrends(result);
      } catch (error) {
        console.error('Error loading strength trends:', error);
        setTrends([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const hasAnyData = trends.some((t) => t.hasData);

  return (
    <Card className="card-hover-lift border-primary/50">
      <CardHeader>
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Strength Trends
        </h3>
        <CardDescription>
          Your estimated strength change over the last 30 days, grouped by movement pattern.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasAnyData ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <Dumbbell className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-semibold">Not enough data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Complete logged workouts and your strength trends will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trends.map((t) => {
              const up = t.hasData && t.value !== null && t.value > 0;
              const down = t.hasData && t.value !== null && t.value < 0;
              const TrendIcon = up ? ArrowUp : down ? ArrowDown : ArrowRight;
              return (
                <div
                  key={t.category}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg"
                >
                  <p className="font-semibold">{t.category}</p>
                  {t.hasData && t.value !== null ? (
                    <div
                      className={cn(
                        "flex items-center gap-1 font-bold",
                        up ? 'text-green-500' : down ? 'text-red-500' : 'text-muted-foreground'
                      )}
                    >
                      <TrendIcon className="h-4 w-4" />
                      {t.value > 0 ? '+' : ''}{t.value}%
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Not enough data</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
