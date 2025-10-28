"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { CoachUpdates } from '@/components/dashboard/coach-updates';

interface WelcomeHeaderProps {
  name: string;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export function WelcomeHeader({ name, isDarkMode = false, onToggleTheme }: WelcomeHeaderProps) {
  const [greeting, setGreeting] = useState('');
  const [subtext, setSubtext] = useState('');
  const [mounted, setMounted] = useState(false);

  // Extract first name only
  const firstName = name.split(' ')[0];

  useEffect(() => {
    setMounted(true);
    const updateGreetingAndSubtext = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('Good morning');
        setSubtext('Ready to crush your goals today? Let\'s get started.');
      } else if (hour >= 12 && hour < 17) {
        setGreeting('Good afternoon');
        setSubtext('Keep that momentum going strong!');
      } else if (hour >= 17 && hour < 21) {
        setGreeting('Good evening');
        setSubtext('Time to finish the day strong!');
      } else {
        setGreeting('Good night');
        setSubtext('Great work today. Rest up and recover!');
      }
    };
    
    updateGreetingAndSubtext();
  }, []);

  // Prevent hydration mismatch by not rendering dynamic content until mounted
  if (!mounted) {
    return (
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              <span className="opacity-0">Loading...</span>
            </h1>
            <p className="text-muted-foreground mt-2 opacity-0">Loading...</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {onToggleTheme && (
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleTheme}
            className="cursor-pointer text-primary hover:bg-primary/10 hover:text-primary border-primary/50"
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

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {greeting},{' '}
            <span className="text-primary transition-all duration-300 hover:drop-shadow-[0_0_8px_hsl(var(--primary))] hover:-translate-y-1 inline-block">
              {firstName}
            </span>
          </h1>
          <p className="text-muted-foreground mt-2">
            {subtext}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {onToggleTheme && (
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleTheme}
            className="cursor-pointer text-primary hover:bg-primary/10 hover:text-primary border-primary/50"
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
