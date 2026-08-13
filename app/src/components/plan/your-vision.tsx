"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Pin } from 'lucide-react';

interface VisionGoal {
  text: string;
}

interface YourVisionProps {
  goals?: VisionGoal[];
}

export function YourVision({ goals }: YourVisionProps) {
  // Show nothing if no goals are set
  if (!goals || goals.length === 0) {
    return null;
  }
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
      <CardHeader>
        {/* The Pin was absolutely positioned at top-4 right-4 and collided with
            the title block on narrow screens; it's now a flex sibling. */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-primary/10 rounded-full shrink-0">
            <Eye className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-xl">Your Vision</CardTitle>
            <CardDescription>
              Why you started this journey
            </CardDescription>
          </div>
          <Pin className="h-5 w-5 shrink-0 text-primary/50" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {goals.map((goal, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg shadow-sm">
            <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
            <p className="font-semibold text-foreground/90 min-w-0">{goal.text}</p>
          </div>
        ))}
      </CardContent>
      
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          Every workout, every meal, every choice brings you closer to these goals.
        </p>
      </CardFooter>
    </Card>
  );
}
