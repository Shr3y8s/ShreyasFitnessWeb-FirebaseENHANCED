"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sun, Moon, Leaf, Check, type LucideIcon } from 'lucide-react';
import { CoachUpdates } from '@/components/dashboard/coach-updates';
import { cn } from '@/lib/utils';

type Theme = 'default' | 'dark' | 'forest';


interface WelcomeHeaderProps {
  name: string;
  theme?: Theme;
  onCycleTheme?: () => void;
  // Legacy props kept for backward compatibility
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

/** Theme options, in the same order the legacy cycle used. */
const THEME_OPTIONS: { value: Theme; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'default', label: 'App theme', description: 'Light green — the default look', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Easier on the eyes at night', icon: Moon },
  { value: 'forest', label: 'Forest', description: 'Deep green, high contrast', icon: Leaf },
];

export function WelcomeHeader({ name, theme, onCycleTheme, isDarkMode = false, onToggleTheme }: WelcomeHeaderProps) {
  // Resolve active theme — new 3-way prop takes priority
  const activeTheme: Theme = theme ?? (isDarkMode ? 'dark' : 'default');

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

  const activeOption = THEME_OPTIONS.find((o) => o.value === activeTheme) ?? THEME_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  /**
   * Theme picker.
   *
   * This used to be a single unlabeled button that blind-cycled
   * default → dark → forest. It relied on `title` for explanation, which never
   * renders on a touch device — so on a phone a client would tap a sun icon,
   * watch the whole dashboard turn dark green, and have no idea what happened or
   * how to get back. Showing the three options explicitly (with the active one
   * checked) makes it obvious and lets them jump straight to one.
   *
   * `onCycleTheme` advances one step, so we call it until the desired theme is
   * reached — keeps this presentational and avoids changing the page's API.
   */
  const selectTheme = (target: Theme) => {
    if (!handleThemeClick || target === activeTheme) return;
    const order: Theme[] = ['default', 'dark', 'forest'];
    const from = order.indexOf(activeTheme);
    const to = order.indexOf(target);
    const steps = (to - from + order.length) % order.length;
    for (let i = 0; i < steps; i++) handleThemeClick();
  };

  const themePicker = handleThemeClick && (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title={`Theme: ${activeOption.label}`}
          aria-label={`Change theme — currently ${activeOption.label}`}
          className={cn(
            // Matches the notification bell beside it (size-10 on mobile).
            'size-10 sm:size-9 cursor-pointer transition-transform active:scale-95',
            activeTheme === 'forest'
              ? 'text-white hover:bg-white/10 hover:text-white border-white/30 bg-white/5'
              : 'text-primary hover:bg-primary/10 hover:text-primary border-primary/50'
          )}
        >
          <ActiveIcon className="h-[1.2rem] w-[1.2rem] transition-all" />
          <span className="sr-only">Change theme</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className={cn(
          'w-56 max-w-[calc(100vw-2rem)] p-1.5',
          activeTheme === 'forest' && 'bg-[#0d3d20]/95 backdrop-blur-xl border-white/15 text-white'
        )}
      >
        <p className={cn(
          'px-2 py-1.5 text-xs font-semibold uppercase tracking-wide',
          activeTheme === 'forest' ? 'text-white/60' : 'text-muted-foreground'
        )}>
          Theme
        </p>
        {THEME_OPTIONS.map((option) => {
          const OptionIcon = option.icon;
          const isActive = option.value === activeTheme;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => selectTheme(option.value)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'flex w-full min-h-11 items-center gap-3 rounded-md px-2 text-left transition-colors active:scale-[0.99]',
                activeTheme === 'forest' ? 'hover:bg-white/10' : 'hover:bg-accent',
                isActive && (activeTheme === 'forest' ? 'bg-white/10' : 'bg-primary/10')
              )}
            >
              <OptionIcon className={cn('h-4 w-4 shrink-0', activeTheme === 'forest' ? 'text-green-300' : 'text-primary')} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-tight">{option.label}</span>
                <span className={cn(
                  'block text-xs leading-tight',
                  activeTheme === 'forest' ? 'text-white/50' : 'text-muted-foreground'
                )}>
                  {option.description}
                </span>
              </span>
              {isActive && <Check className="h-4 w-4 shrink-0 text-green-500" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );

  // Prevent hydration mismatch by not rendering dynamic content until mounted
  if (!mounted) {
    return (
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              <span className="opacity-0">Loading...</span>
            </h1>
            <p className="text-muted-foreground mt-2 opacity-0">Loading...</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {handleThemeClick && (
            <Button
              variant="outline"
              size="icon"
              className="size-10 sm:size-9 cursor-pointer text-primary hover:bg-primary/10 hover:text-primary border-primary/50"
              aria-hidden="true"
              tabIndex={-1}
            >
              <Sun className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Change theme</span>
            </Button>
          )}
          <CoachUpdates theme={activeTheme} />
        </div>
      </div>
    );
  }


  return (
    <div className="flex justify-between items-start sm:items-center gap-3">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="dashboard-greeting text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            {greeting},{' '}
            <span className="text-primary transition-all duration-300 hover:drop-shadow-[0_0_8px_hsl(var(--primary))] hover:-translate-y-1 inline-block">
              {firstName}
            </span>
          </h1>
          <p className="dashboard-subtext text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            {subtext}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {themePicker}
        <CoachUpdates theme={activeTheme} />
      </div>
    </div>
  );
}
