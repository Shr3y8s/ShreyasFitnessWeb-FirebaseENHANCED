"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import {
  House,
  User,
  Dumbbell,
  BarChart3,
  Calendar,
  HeartPulse,
  Goal,
  MessageSquare,
  BookOpen,
  CreditCard,
  Plug,
  Smartphone,
  LogOut,
  ClipboardList,
  UserCircle,
  Apple,
  Activity,
  Camera,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { useCoachUpdates } from '@/context/CoachUpdatesContext';

interface ServiceTier {
  id: string;
  name: string;
  price: number;
  features?: string[];
}

interface ClientSidebarProps {
  userName?: string;
  userTier?: ServiceTier | string;
  userTierName?: string;
  userProfilePhoto?: string;
  onLogout?: () => void;
  onShowWelcome?: () => void;
}

export function ClientSidebar({ userName, userTier, userTierName, userProfilePhoto, onLogout, onShowWelcome }: ClientSidebarProps) {
  
  const pathname = usePathname();
  const { coachUpdates } = useCoachUpdates();
  const { user, userData } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [availableSessions, setAvailableSessions] = useState(0);
  
  // Listen for real-time session balance updates
  useEffect(() => {
    if (!user) {
      setAvailableSessions(0);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAvailableSessions(data.sessionBalance?.available ?? 0);
      } else {
        setAvailableSessions(0);
      }
    }, (error) => {
      console.error('Error listening to session balance:', error);
      setAvailableSessions(0);
    });

    // Register with centralized registry
    const { registerListener, unregisterListener } = require('@/lib/listener-registry');
    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user]);

  // Listen for unread messages from trainer
  useEffect(() => {
    if (!user || !userData?.assignedTrainerId) {
      // Reset count if no user or trainer
      setUnreadMessagesCount(0);
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    
    const setupMessageListener = async () => {
      try {
        // Use assigned trainer ID from user profile
        const trainerId = userData.assignedTrainerId;
        const conversationId = [user.uid, trainerId].sort().join('_');
        
        // Listen for unread messages
        const messagesQuery = query(
          collection(db, 'client_messages'),
          where('conversationId', '==', conversationId),
          where('senderId', '==', trainerId),
          where('read', '==', false)
        );
        
        unsubscribe = onSnapshot(
          messagesQuery,
          (snapshot) => {
            setUnreadMessagesCount(snapshot.size);
          },
          (error) => {
            // Handle permission errors gracefully (e.g., after logout)
            console.log('Message listener error:', error.code);
            if (error.code === 'permission-denied') {
              setUnreadMessagesCount(0);
            }
          }
        );

        // Register with centralized registry
        if (unsubscribe) {
          const { registerListener } = require('@/lib/listener-registry');
          registerListener(unsubscribe);
        }
      } catch (error) {
        console.error('Error setting up message listener:', error);
      }
    };
    
    setupMessageListener();
    
    // Cleanup function to unsubscribe when component unmounts or dependencies change
    return () => {
      if (unsubscribe) {
        const { unregisterListener } = require('@/lib/listener-registry');
        unregisterListener(unsubscribe);
        unsubscribe();
      }
    };
  }, [user, userData]);
  
  // Filter notifications by type to get counts for each section
  const workoutUpdatesCount = coachUpdates.filter(
    (update) => update.type === 'workout'
  ).length;
  const progressUpdatesCount = coachUpdates.filter(
    (update) => update.type === 'progress'
  ).length;
  const sessionsUpdatesCount = coachUpdates.filter(
    (update) => update.type === 'sessions'
  ).length;
  const nutritionUpdatesCount = coachUpdates.filter(
    (update) => update.type === 'nutrition'
  ).length;
  const goalsUpdatesCount = coachUpdates.filter(
    (update) => update.type === 'goals'
  ).length;
  const resourcesUpdatesCount = coachUpdates.filter(
    (update) => update.type === 'resources'
  ).length;
  const profileUpdatesCount = coachUpdates.filter(
    (update) => update.type === 'profile'
  ).length;
  const billingUpdatesCount = coachUpdates.filter(
    (update) => update.type === 'billing'
  ).length;
  const settingsUpdatesCount = coachUpdates.filter(
    (update) => update.type === 'settings'
  ).length;
  
  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
            SF
          </div>
          <span className="font-bold text-lg text-sidebar-foreground">SHREY.FIT</span>
        </div>
      </SidebarHeader>

      <SidebarContent>

        {/* Planning Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">Planning</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/plan' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/plan">
                    <ClipboardList className="w-4 h-4" />
                    <span className="font-medium">My Plan</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/plan' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/plan">
                    <ClipboardList className="w-4 h-4" />
                    <span className="font-medium">My Plan (mock)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logging Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">Logging</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/activity' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/activity">
                    <Activity className="w-4 h-4" />
                    <span className="font-medium">Daily Activities</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/survey' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/survey">
                    <ClipboardList className="w-4 h-4" />
                    <span className="font-medium">Weekly Survey</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/photos' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/photos">
                    <Camera className="w-4 h-4" />
                    <span className="font-medium">Progress Photos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Training Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">Training</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/workouts' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/workouts">
                    <Dumbbell className="w-4 h-4" />
                    <span className="font-medium">My Workouts</span>
                    {workoutUpdatesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {workoutUpdatesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/workouts' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/workouts">
                    <Dumbbell className="w-4 h-4" />
                    <span className="font-medium">My Workouts (Mock)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/sessions/buy' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/sessions/buy">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium">Buy 1-on-1 Sessions</span>
                    {availableSessions > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-green-600 text-white flex items-center justify-center w-5 h-5 p-0">
                        {availableSessions}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/sessions/schedule' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/sessions/schedule">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Schedule 1-on-1</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Nutrition Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">Nutrition</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/nutrition' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/nutrition">
                    <Apple className="w-4 h-4" />
                    <span className="font-medium">Nutrition Hub</span>
                    {nutritionUpdatesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {nutritionUpdatesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/nutrition' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/nutrition">
                    <Apple className="w-4 h-4" />
                    <span className="font-medium">Nutrition Hub (Mock)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Progress Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">Progress</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/progress' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/progress">
                    <BarChart3 className="w-4 h-4" />
                    <span className="font-medium">Progress</span>
                    {progressUpdatesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {progressUpdatesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/progress' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/progress">
                    <BarChart3 className="w-4 h-4" />
                    <span className="font-medium">Metrics (Mock)</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/goals' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/goals">
                    <Goal className="w-4 h-4" />
                    <span className="font-medium">Goals & Milestones</span>
                    {goalsUpdatesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {goalsUpdatesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Support Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/trainer' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/trainer">
                    <UserCircle className="w-4 h-4" />
                    <span className="font-medium">Your Trainer</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/messages' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/messages">
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-medium">Coach Chat</span>
                    {unreadMessagesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-red-500 text-white flex items-center justify-center w-5 h-5 p-0">
                        {unreadMessagesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/resources' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/resources">
                    <BookOpen className="w-4 h-4" />
                    <span className="font-medium">Resources</span>
                    {resourcesUpdatesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {resourcesUpdatesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/profile' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/profile">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Profile</span>
                    {profileUpdatesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {profileUpdatesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/billing' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/billing">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium">Billing</span>
                    {billingUpdatesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {billingUpdatesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/integrations">
                    <Plug className="w-4 h-4" />
                    <span className="font-medium">Integrations</span>
                    <span className="ml-auto border border-primary/50 text-primary text-xs px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/mobile">
                    <Smartphone className="w-4 h-4" />
                    <span className="font-medium">Mobile App</span>
                    <span className="ml-auto border border-primary/50 text-primary text-xs px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-2 border-t border-white/10">
          {/* Test Welcome Screen Button */}
          {onShowWelcome && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowWelcome}
              className="w-full text-xs mb-3"
            >
              Test Welcome Screen
            </Button>
          )}
          
          {/* User Info */}
          <div className="flex items-center gap-3 mb-3">
            {userProfilePhoto ? (
              <img
                src={userProfilePhoto}
                alt={userName || 'User'}
                className="w-10 h-10 min-w-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 min-w-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-sidebar-foreground truncate">{userName || 'User'}</p>
              {/* Only show tier display if we have a meaningful tierName */}
              {userTierName && (
                <p className="text-xs text-primary font-medium truncate">{userTierName}</p>
              )}
            </div>
          </div>

          {/* Sign Out Link */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onLogout}
                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 mb-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          {/* Legal Links */}
          <div className="text-xs text-center text-muted-foreground pt-2 border-t border-white/10">
            <Link href="/legal/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <span className="mx-2">•</span>
            <Link href="/legal/privacy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
