"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Leaf } from 'lucide-react';
import { CoachUpdates } from '@/components/dashboard/coach-updates';

type Theme = 'light' | 'dark' | 'forest';

interface WelcomeHeaderProps {
  name: string;
  theme?: Theme;
  onCycleTheme?: () => void;
  // Legacy props kept for backward compatibility
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export function WelcomeHeader({ name, theme, onCycleTheme, isDarkMode = false, onToggleTheme }: WelcomeHeaderProps) {
  // Resolve active theme — new 3-way prop takes priority
  const activeTheme: Theme = theme ?? (isDarkMode ? 'dark' : 'light');
  const handleThemeClick = onCycleTheme ?? onToggleTheme;
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

  // Determine icon for current theme
  const themeIcon = activeTheme === 'dark'
    ? <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
    : activeTheme === 'forest'
    ? <Leaf className="h-[1.2rem] w-[1.2rem] transition-all" />
    : <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />;

  const themeLabel = activeTheme === 'dark' ? 'Dark mode' : activeTheme === 'forest' ? 'Forest mode' : 'Light mode';

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
          {handleThemeClick && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleThemeClick}
              className="cursor-pointer text-primary hover:bg-primary/10 hover:text-primary border-primary/50"
            >
              <Sun className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Cycle theme</span>
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
        {handleThemeClick && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleThemeClick}
            title={themeLabel}
            className="cursor-pointer text-primary hover:bg-primary/10 hover:text-primary border-primary/50"
          >
            {themeIcon}
            <span className="sr-only">{themeLabel}</span>
          </Button>
        )}
        <CoachUpdates />
      </div>
    </div>
  );
}
