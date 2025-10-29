"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import {
  House,
  User,
  Dumbbell,
  TrendingUp,
  Calendar,
  HeartPulse,
  Goal,
  MessageSquare,
  BookOpen,
  CreditCard,
  Settings,
  Plug,
  Smartphone,
  LogOut,
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
  onLogout?: () => void;
  onShowWelcome?: () => void;
}

export function ClientSidebar({ userName, userTier, onLogout, onShowWelcome }: ClientSidebarProps) {
  // Helper function to map tier ID to service type label
  const getServiceType = (tier?: ServiceTier | string): string => {
    if (!tier) return 'Client';
    
    // Handle if tier is a string (current Firestore structure)
    const tierId = typeof tier === 'string' ? tier : tier.id;
    
    switch (tierId) {
      case 'in-person-training':
      case '4-pack-training':
        return 'In-Person';
      case 'online-coaching':
        return 'Online';
      case 'complete-transformation':
        return 'Hybrid';
      default:
        return 'Client';
    }
  };
  
  const pathname = usePathname();
  const { coachUpdates } = useCoachUpdates();
  const { user, userData } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  
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
      } catch (error) {
        console.error('Error setting up message listener:', error);
      }
    };
    
    setupMessageListener();
    
    // Cleanup function to unsubscribe when component unmounts or dependencies change
    return () => {
      if (unsubscribe) {
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
  const communicationUpdatesCount = coachUpdates.filter(
    (update) => update.type === 'communication'
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
        {/* General Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/' || pathname === '/dashboard' || pathname === '/dashboard/client' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client">
                    <House className="w-4 h-4" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tracking Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">Tracking</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={pathname === '/workouts' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/workouts">
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
                <SidebarMenuButton asChild>
                  <Link href="/progress">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">Progress & Analytics</span>
                    {progressUpdatesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {progressUpdatesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/sessions">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Sessions & Schedule</span>
                    {sessionsUpdatesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {sessionsUpdatesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/nutrition">
                    <HeartPulse className="w-4 h-4" />
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
                <SidebarMenuButton asChild>
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
                <SidebarMenuButton asChild className={pathname === '/dashboard/client/messages' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
                  <Link href="/dashboard/client/messages">
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-medium">Coach Inbox</span>
                    {unreadMessagesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-red-500 text-white flex items-center justify-center w-5 h-5 p-0">
                        {unreadMessagesCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
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
                <SidebarMenuButton asChild>
                  <Link href="/billing">
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
                  <Link href="/settings">
                    <Settings className="w-4 h-4" />
                    <span className="font-medium">Settings</span>
                    {settingsUpdatesCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {settingsUpdatesCount}
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
        <div className="p-3 border-t border-white/10 space-y-3">
          {/* Test Welcome Screen Button */}
          {onShowWelcome && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowWelcome}
              className="w-full text-xs"
            >
              Test Welcome Screen
            </Button>
          )}
          
          {/* User Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 min-w-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-sidebar-foreground truncate">{userName || 'User'}</p>
                <p className="text-xs text-primary font-medium truncate">{getServiceType(userTier)}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout} className="h-8 w-8 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
