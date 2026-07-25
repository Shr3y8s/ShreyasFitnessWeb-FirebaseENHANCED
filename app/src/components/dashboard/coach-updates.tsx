"use client";

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Dumbbell,
  Apple,
  ClipboardList,
  Pin,
  Activity,
  CreditCard,
  Flame,
  Target,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Footprints,
  NotebookPen,
  Scale,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn, formatTimeAgo } from '@/lib/utils';
import { useClientNotifications } from '@/context/ClientNotificationsContext';
import { useRouter } from 'next/navigation';
import React from 'react';
import { CLIENT_NOTIFICATION_CONFIG } from '@/types/client-notifications';
import type { ClientNotificationType } from '@/types/client-notifications';

// Icon map for each notification type
const notifIcons: Record<ClientNotificationType, React.ReactElement> = {
  plan_updated:        <ClipboardList className="h-4 w-4" />,
  new_workout:         <Dumbbell className="h-4 w-4" />,
  nutrition_updated:   <Apple className="h-4 w-4" />,
  task_reminder:       <Pin className="h-4 w-4" />,
  activities_updated:  <Activity className="h-4 w-4" />,
  upcoming_payment:    <CreditCard className="h-4 w-4" />,
  login_streak:        <Flame className="h-4 w-4" />,
  goal_added:          <Target className="h-4 w-4" />,
  goal_updated:        <Trophy className="h-4 w-4" />,
  workout_overdue:     <AlertTriangle className="h-4 w-4" />,
  nutrition_reminder:  <Apple className="h-4 w-4" />,
  steps_reminder:      <Footprints className="h-4 w-4" />,
  habits_reminder:     <NotebookPen className="h-4 w-4" />,
  weight_reminder:     <Scale className="h-4 w-4" />,
  new_message:         <MessageSquare className="h-4 w-4" />,
};

interface CoachUpdatesProps {
  /** Dashboard theme — forest needs a dark-green popout instead of white. */
  theme?: 'default' | 'dark' | 'forest';
}

export function CoachUpdates({ theme = 'default' }: CoachUpdatesProps) {
  const {
    notifications,
    unreadCount,
    handleDismiss,
    handleDismissAll,
    handleMarkAsRead,
  } = useClientNotifications();
  const router = useRouter();

  const isForest = theme === 'forest';
  const hasNotifications = notifications.length > 0;


  const handleView = (type: ClientNotificationType, actionUrl?: string) => {
    const url = actionUrl || CLIENT_NOTIFICATION_CONFIG[type].defaultActionUrl;
    router.push(url);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'relative cursor-pointer size-10 sm:size-9',
            isForest
              ? 'text-white hover:bg-white/10 hover:text-white border-white/30 bg-white/5'
              : 'text-primary hover:bg-primary/10 hover:text-primary border-primary/50',
            unreadCount > 0 && 'animate-pulse-green'
          )}
          aria-label={`Notifications — ${unreadCount} unread`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] leading-none bg-green-500 hover:bg-green-500"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Open notifications</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          'w-80 max-w-[calc(100vw-1rem)] p-0',
          isForest && 'bg-[#0d3d20]/95 backdrop-blur-xl border-white/15 text-white'
        )}
        align="end"
      >
        {/* Header */}
        <div className="p-4">
          <h3 className="font-semibold">Notifications</h3>
          <p className={cn('text-sm', isForest ? 'text-white/60' : 'text-muted-foreground')}>
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`
              : 'All notifications'}
          </p>
        </div>
        <Separator className={cn(isForest && 'bg-white/15')} />


        {/* List */}
        {hasNotifications ? (
          <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
            {notifications.map((notif) => {
              const config = CLIENT_NOTIFICATION_CONFIG[notif.type];
              const icon = notifIcons[notif.type];
              return (
                <div
                  key={notif.id}
                  className={cn(
                    'grid grid-cols-[25px_1fr] items-start p-3 rounded-md transition-all duration-200 hover:scale-[1.02] hover:shadow-sm',
                    isForest ? 'hover:bg-white/10' : 'hover:bg-accent',
                    !notif.read && (isForest ? 'bg-white/10' : 'bg-primary/5')
                  )}
                >
                  <span className={cn('mt-1', isForest ? 'text-green-300' : 'text-primary')}>{icon}</span>
                  <div className="grid gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm leading-none">{config.title}</p>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className={cn('text-sm', isForest ? 'text-white/70' : 'text-muted-foreground')}>{notif.message}</p>
                    <p className={cn('text-xs mt-0.5', isForest ? 'text-white/50' : 'text-muted-foreground/70')}>

                      {formatTimeAgo(notif.timestamp)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-green-600 hover:text-green-700 cursor-pointer"
                        onClick={() => {
                          handleMarkAsRead(notif.id);
                          handleView(notif.type, notif.actionUrl);
                        }}
                      >
                        View
                      </Button>
                      <span className="text-muted-foreground">&middot;</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-destructive/80 hover:text-destructive cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss(notif.id);
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
            <CheckCircle2 className={cn('h-12 w-12 mx-auto mb-3', isForest ? 'text-green-300/60' : 'text-primary/50')} />
            <p className={cn('text-sm font-medium', isForest ? 'text-white' : 'text-foreground')}>You&apos;re all caught up!</p>
            <p className={cn('text-xs mt-1', isForest ? 'text-white/50' : 'text-muted-foreground')}>No new notifications at this time.</p>
          </div>

        )}

        {/* Footer */}
        {hasNotifications && (
          <>
            <Separator className={cn(isForest && 'bg-white/15')} />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className={cn('w-full cursor-pointer', isForest && 'text-white hover:bg-white/10 hover:text-white')}
                onClick={() => handleDismissAll()}
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
