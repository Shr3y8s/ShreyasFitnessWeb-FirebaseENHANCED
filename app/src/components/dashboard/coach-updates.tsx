"use client";

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Dumbbell, Trophy, Calendar, HeartPulse, Goal, MessageSquare, BookOpen, User, CreditCard, Settings, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn, formatTimeAgo } from '@/lib/utils';
import { useCoachUpdates } from '@/context/CoachUpdatesContext';
import { useRouter } from 'next/navigation';
import React from 'react';

type NotificationType = 'workout' | 'progress' | 'sessions' | 'nutrition' | 'goals' | 'communication' | 'resources' | 'profile' | 'billing' | 'settings';

// Configuration for icons and titles based on notification type
const updateConfig: Record<NotificationType, { icon: React.ReactElement; title: string; route: string }> = {
  workout: {
    icon: <Dumbbell className="h-4 w-4" />,
    title: 'Workout Plan Updated',
    route: '/workouts',
  },
  progress: {
    icon: <Trophy className="h-4 w-4" />,
    title: 'Progress Updated',
    route: '/progress',
  },
  sessions: {
    icon: <Calendar className="h-4 w-4" />,
    title: 'Session Scheduled',
    route: '/sessions',
  },
  nutrition: {
    icon: <HeartPulse className="h-4 w-4" />,
    title: 'Nutrition Plan Updated',
    route: '/nutrition',
  },
  goals: {
    icon: <Goal className="h-4 w-4" />,
    title: 'Goals Updated',
    route: '/goals',
  },
  communication: {
    icon: <MessageSquare className="h-4 w-4" />,
    title: 'New Message',
    route: '/communication',
  },
  resources: {
    icon: <BookOpen className="h-4 w-4" />,
    title: 'New Resource Available',
    route: '/resources',
  },
  profile: {
    icon: <User className="h-4 w-4" />,
    title: 'Profile Updated',
    route: '/profile',
  },
  billing: {
    icon: <CreditCard className="h-4 w-4" />,
    title: 'Billing Update',
    route: '/billing',
  },
  settings: {
    icon: <Settings className="h-4 w-4" />,
    title: 'Settings Updated',
    route: '/settings',
  },
};

export function CoachUpdates() {
  const { coachUpdates, removeCoachUpdate, clearCoachUpdates } = useCoachUpdates();
  const router = useRouter();

  const handleViewChanges = (type: NotificationType) => {
    const route = updateConfig[type].route;
    router.push(route);
  };

  const handleDismiss = (id: number) => {
    removeCoachUpdate(id);
  };

  const hasUpdates = coachUpdates.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'relative text-primary hover:bg-primary/10 hover:text-primary border-primary/50 cursor-pointer',
            hasUpdates && 'animate-pulse-green'
          )}
        >
          <Bell className="h-5 w-5" />
          {hasUpdates && (
            <Badge
              variant="default"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-green-500 hover:bg-green-500"
            >
              {coachUpdates.length}
            </Badge>
          )}
          <span className="sr-only">Open notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            You have {coachUpdates.length} unread message{coachUpdates.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Separator />
        {hasUpdates ? (
          <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
            {coachUpdates.map((update) => {
              const config = updateConfig[update.type];
              return (
                <div
                  key={update.id}
                  className="grid grid-cols-[25px_1fr] items-start p-3 rounded-md hover:bg-accent transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
                >
                  <span className="mt-1 text-primary">{config.icon}</span>
                  <div className="grid gap-1">
                    <p className="font-semibold text-sm">{config.title}</p>
                    <p className="text-sm text-muted-foreground">{update.description}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{formatTimeAgo(update.timestamp)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-green-600 hover:text-green-700 cursor-pointer"
                        onClick={() => handleViewChanges(update.type)}
                      >
                        View Changes
                      </Button>
                      <span className="text-muted-foreground">&middot;</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-destructive/80 hover:text-destructive cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss(update.id);
                        }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-primary/50" />
            <p className="text-sm font-medium text-foreground">You&apos;re all caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No new notifications at this time.</p>
          </div>
        )}
        {hasUpdates && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer"
                onClick={() => clearCoachUpdates()}
              >
                Dismiss all
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
