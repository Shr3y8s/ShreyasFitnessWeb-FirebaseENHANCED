'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  DollarSign,
  Users,
  Clock,
  MapPin,
  Settings,
  Briefcase,
  TrendingUp,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface AdminSidebarProps {
  currentPage?: string;
}

export default function AdminSidebar({ currentPage }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userData } = useAuth();

  const handleLogout = async () => {
    try {
      const { signOutUser } = await import('@/lib/firebase');
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
                  className={pathname === '/dashboard/admin' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/admin">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Financial Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">
            Financial
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={pathname === '/dashboard/admin/revenue' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/admin/revenue">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">Revenue & Billing</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={pathname === '/dashboard/admin/pending-accounts' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/admin/pending-accounts">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Pending Accounts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Business Operations Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">
            Business Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={pathname === '/dashboard/admin/trainers' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/admin/trainers">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Trainer Management</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={pathname === '/dashboard/admin/client-assignment' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/admin/client-assignment">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">Client Assignment</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={pathname === '/dashboard/admin/locations' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/admin/locations">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">Training Locations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={pathname === '/dashboard/admin/settings' ? 'bg-primary text-white hover:bg-primary/90' : ''}
                >
                  <Link href="/dashboard/admin/settings">
                    <Settings className="w-4 h-4" />
                    <span className="font-medium">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dashboard Switcher */}
        <div className="my-2 border-t border-sidebar-border" />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => router.push('/dashboard/trainer')}
                  className="cursor-pointer"
                >
                  <Briefcase className="w-4 h-4" />
                  <span className="font-medium">Training Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3 border-t border-white/10 space-y-3">
          {/* User Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userData?.profilePhotoSmall ? (
                <img
                  src={userData.profilePhotoSmall}
                  alt={userData?.name || 'Admin'}
                  className="w-10 h-10 min-w-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 min-w-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {userData?.name ? userData.name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-sidebar-foreground truncate">
                  {userData?.name || 'Admin'}
                </p>
                <p className="text-xs text-primary font-medium truncate">
                  Admin
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
