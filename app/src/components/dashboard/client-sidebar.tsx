"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/sidebar';

interface ClientSidebarProps {
  userName?: string;
  userTier?: string;
  onLogout?: () => void;
  onShowWelcome?: () => void;
}

export function ClientSidebar({ userName = 'Shreyas Annapureddy', userTier = 'in-person-training', onLogout, onShowWelcome }: ClientSidebarProps) {
  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
            SF
          </div>
          <span className="font-semibold text-base text-sidebar-foreground">SHREY.FIT</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* General Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-2">General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="bg-primary text-white hover:bg-primary/90">
                  <Link href="/">
                    <House className="w-4 h-4" />
                    <span>Dashboard</span>
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
                <SidebarMenuButton asChild>
                  <Link href="/workouts">
                    <Dumbbell className="w-4 h-4" />
                    <span>My Workouts</span>
                    <span className="ml-auto bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      2
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/progress">
                    <TrendingUp className="w-4 h-4" />
                    <span>Progress & Analytics</span>
                    <span className="ml-auto bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      1
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/sessions">
                    <Calendar className="w-4 h-4" />
                    <span>Sessions & Schedule</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/nutrition">
                    <HeartPulse className="w-4 h-4" />
                    <span>Nutrition Hub</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/goals">
                    <Goal className="w-4 h-4" />
                    <span>Goals & Milestones</span>
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
                <SidebarMenuButton asChild>
                  <Link href="/communication">
                    <MessageSquare className="w-4 h-4" />
                    <span>Communication</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/resources">
                    <BookOpen className="w-4 h-4" />
                    <span>Resources</span>
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
                <SidebarMenuButton asChild>
                  <Link href="/profile">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/billing">
                    <CreditCard className="w-4 h-4" />
                    <span>Billing</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/integrations">
                    <Plug className="w-4 h-4" />
                    <span>Integrations</span>
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
                    <span>Mobile App</span>
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
                SA
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-sidebar-foreground truncate">{userName}</p>
                <p className="text-xs text-primary font-medium truncate">{userTier}</p>
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
