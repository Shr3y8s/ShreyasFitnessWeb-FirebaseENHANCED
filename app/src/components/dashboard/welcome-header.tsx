"use client";

import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { CoachUpdates } from '@/components/dashboard/coach-updates';

interface WelcomeHeaderProps {
  name: string;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export function WelcomeHeader({ name, isDarkMode = false, onToggleTheme }: WelcomeHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Good afternoon,{' '}
            <span className="text-primary transition-all duration-300 hover:drop-shadow-[0_0_8px_hsl(var(--primary))] hover:-translate-y-1 inline-block">
              {name}
            </span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Ready to crush your goals today? Let&apos;s get started.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {onToggleTheme && (
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleTheme}
            className="text-primary hover:bg-primary/10 hover:text-primary border-primary/50"
          >
            {isDarkMode ? (
              <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
            ) : (
              <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        )}
        <CoachUpdates />
      </div>
    </div>
  );
}
