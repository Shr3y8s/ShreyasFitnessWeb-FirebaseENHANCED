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
  Briefcase,
  MapPin,
  User,
  LogOut,
  Clock,
  Shield,
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

    return () => unsubscribe();
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
        {/* Overview Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">
            Overview
          </SidebarGroupLabel>
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
                    <span className="font-medium">Clients</span>
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
                    <span className="font-medium">Messages</span>
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
                    <ListChecks className="w-4 h-4" />
                    <span className="font-medium">Workout Templates</span>
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
                    <span className="font-medium">Assignments</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Business Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">
            Business
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/business' || currentPage === 'business' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/business">
                    <Briefcase className="w-4 h-4" />
                    <span className="font-medium">Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/business/locations' || currentPage === 'locations' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/business/locations">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">Training Locations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={pathname === '/dashboard/trainer/pending-accounts' || currentPage === 'pending-accounts' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/trainer/pending-accounts">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Pending Accounts</span>
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
                    <span className="font-medium">Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dashboard Switcher - Only for Admins */}
        {canAccessAdminDashboard && (
          <>
            <div className="my-2 border-t border-sidebar-border" />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => router.push('/dashboard/admin')}
                      className="cursor-pointer"
                    >
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">Admin Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3 border-t border-white/10 space-y-3">
          {/* User Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
                <p className="text-xs text-primary font-medium truncate capitalize">
                  {userData?.role || 'Trainer'}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="h-8 w-8 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          
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
