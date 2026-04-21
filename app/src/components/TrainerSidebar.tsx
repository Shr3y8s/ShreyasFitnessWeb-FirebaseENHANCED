"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { registerListener, unregisterListener } from '@/lib/listener-registry';
import {
  LayoutDashboard,
  Users,
  Mail,
  Dumbbell,
  ListChecks,
  ClipboardList,
  User,
  LogOut,
  Shield,
  UserCircle,
  Calendar,
  Activity,
  Send,
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
import NotificationBell from '@/components/trainer/activity-feed/NotificationBell';

interface TrainerSidebarProps {
  currentPage?: string;
}

export default function TrainerSidebar({ currentPage }: TrainerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, canAccessAdminDashboard } = useAuth();
  const [clientCount, setClientCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [openTaskCount, setOpenTaskCount] = useState(0);

  // Listen for real-time client count updates
  useEffect(() => {
    if (!user) {
      setClientCount(0);
      return;
    }

    const clientsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'client'),
      where('gdprDeleted', '!=', true)
    );

    const unsubscribe = onSnapshot(
      clientsQuery,
      (snapshot) => {
        setClientCount(snapshot.size);
      },
      (error) => {
        console.error('Error listening to client count:', error);
        setClientCount(0);
      }
    );

    // Register with centralized registry
    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user]);

  // Listen for real-time open task count
  useEffect(() => {
    if (!user) { setOpenTaskCount(0); return; }

    const tasksQuery = query(
      collection(db, 'clientTasks'),
      where('trainerId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => setOpenTaskCount(snapshot.size),
      () => setOpenTaskCount(0)
    );

    registerListener(unsubscribe);
    return () => { unregisterListener(unsubscribe); unsubscribe(); };
  }, [user]);

  // Listen for real-time unread message count (messages from clients to this trainer)
  useEffect(() => {
    if (!user) {
      setUnreadMessageCount(0);
      return;
    }

    // Query all messages where the trainer is the recipient and not yet read
    const unreadQuery = query(
      collection(db, 'client_messages'),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        setUnreadMessageCount(snapshot.size);
      },
      (error) => {
        console.log('Unread messages listener error:', error.code);
        if (error.code === 'permission-denied') {
          setUnreadMessageCount(0);
        }
      }
    );

    // Register with centralized registry
    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get smart role label based on role and canTrain
  const getRoleLabel = () => {
    if (!userData?.role) return 'Trainer';
    
    if (userData.role === 'trainer') {
      return 'Trainer';
    } else if (userData.role === 'admin') {
      return userData.canTrain ? 'Admin + Trainer' : 'Business Admin';
    }
    
    return userData.role;
  };

  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
              SF
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-sidebar-foreground">SHREY.FIT</span>
              <span className="text-xs text-muted-foreground">Trainer Portal</span>
            </div>
          </Link>
          <NotificationBell />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard/Overview - Top Level */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={pathname === '/dashboard/trainer' || currentPage === 'overview' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Client Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">
            Client Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname.startsWith('/dashboard/trainer/client-hub') || currentPage === 'client-hub' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/client-hub">
                    <UserCircle className="w-4 h-4" />
                    <span className="font-medium">Client Hub</span>
                    {clientCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-primary text-white flex items-center justify-center w-5 h-5 p-0">
                        {clientCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/clients-messages' || currentPage === 'messages' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/clients-messages">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">Client Inbox</span>
                    {unreadMessageCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-red-500 text-white flex items-center justify-center w-5 h-5 p-0">
                        {unreadMessageCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/activity' || currentPage === 'activity' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/activity">
                    <Activity className="w-4 h-4" />
                    <span className="font-medium">Activity Feed</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/outreach' || currentPage === 'outreach' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/outreach">
                    <Send className="w-4 h-4" />
                    <span className="font-medium">Outreach</span>
                    {openTaskCount > 0 && (
                      <SidebarMenuBadge className="ml-auto bg-orange-500 text-white flex items-center justify-center w-5 h-5 p-0">
                        {openTaskCount > 9 ? '9+' : openTaskCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Training Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">
            Training
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/training-sessions' || currentPage === 'training-sessions' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/training-sessions">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">In-person Sessions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/weekly-checkins' || currentPage === 'weekly-checkins' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/weekly-checkins">
                    <ListChecks className="w-4 h-4" />
                    <span className="font-medium">Weekly Check-ins</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/exercises' || currentPage === 'exercises' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/exercises">
                    <Dumbbell className="w-4 h-4" />
                    <span className="font-medium">Exercise Library</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/workouts' || currentPage === 'workouts' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/workouts">
                    <ClipboardList className="w-4 h-4" />
                    <span className="font-medium">Workout Library</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/assignments' || currentPage === 'assignments' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/assignments">
                    <ListChecks className="w-4 h-4" />
                    <span className="font-medium">Workout Assignments</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/profile' || currentPage === 'profile' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/profile">
                    <User className="w-4 h-4" />
                    <span className="font-medium">My Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dashboard Switcher - Only for Admins */}
        {canAccessAdminDashboard && (
          <>
            <div className="border-t border-sidebar-border" />
            <SidebarGroup className="py-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => router.push('/dashboard/admin')}
                      className="cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-amber-500" />
                      <span className="font-medium">Admin Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="border-t border-sidebar-border" />
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="p-2 border-t border-white/10">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-3">
            {userData?.profilePhotoSmall ? (
              <img
                src={userData.profilePhotoSmall}
                alt={userData?.name || 'Trainer'}
                className="w-10 h-10 min-w-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 min-w-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {userData?.name ? userData.name.charAt(0).toUpperCase() : 'T'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-sidebar-foreground truncate">
                {userData?.name || 'Trainer'}
              </p>
              <p className="text-xs text-primary font-medium truncate">
                {getRoleLabel()}
              </p>
            </div>
          </div>

          {/* Sign Out Link */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
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
