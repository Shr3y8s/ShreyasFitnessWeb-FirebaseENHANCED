"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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

interface TrainerSidebarProps {
  currentPage?: string;
}

export default function TrainerSidebar({ currentPage }: TrainerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, canAccessAdminDashboard } = useAuth();
  const [clientCount, setClientCount] = useState(0);

  // Listen for real-time client count updates
  useEffect(() => {
    if (!user) {
      setClientCount(0);
      return;
    }

    const clientsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'client')
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
    const { registerListener, unregisterListener } = require('@/lib/listener-registry');
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
        <Link href="/" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
            SF
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-sidebar-foreground">SHREY.FIT</span>
            <span className="text-xs text-muted-foreground">Trainer Portal</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard - Top Level */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer' || currentPage === 'dashboard' ? 'bg-primary text-white hover:bg-primary/90' : ''}
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
                  className={pathname === '/dashboard/trainer/clients' || currentPage === 'clients' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/clients">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Client Roster</span>
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
                  className={pathname.startsWith('/dashboard/trainer/client-hub') || currentPage === 'client-hub' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/client-hub">
                    <UserCircle className="w-4 h-4" />
                    <span className="font-medium">Client Hub</span>
                    <span className="ml-auto border border-primary/50 text-primary text-xs px-2 py-0.5 rounded-full">
                      New
                    </span>
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
