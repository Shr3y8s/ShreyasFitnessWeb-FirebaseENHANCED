'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { db, signOutUser } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import {
  Users,
  Dumbbell,
  Target,
  LayoutDashboard,
  Inbox,
  User,
  LogOut,
  Mail,
  CalendarCheck,
  Briefcase
} from 'lucide-react';

interface TrainerSidebarProps {
  currentPage?: 'overview' | 'inbox' | 'clients' | 'messages' | 'exercises' | 'workouts' | 'assignments' | 'business' | 'pending-accounts';
}

interface UserData {
  name?: string;
  email?: string;
  role?: string;
}

export default function TrainerSidebar({ currentPage = 'overview' }: TrainerSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [counts, setCounts] = useState({
    clients: 0,
    exercises: 0,
    workouts: 0,
    assignments: 0,
    unreadMessages: 0,
    unreadClientMessages: 0,
    pendingAccounts: 0
  });

  // Fetch user data and counts
  useEffect(() => {
    if (!user) return;

    // Array to store all unsubscribe functions
    const unsubscribers: (() => void)[] = [];

    // Fetch user data
    (async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setUserData(userDoc.data() as UserData || null);

        // Count clients
        const clientsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'client')
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        setCounts(prev => ({ ...prev, clients: clientsSnapshot.size }));
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    })();

    // Set up real-time listeners
    try {
      // Listen to exercises
      const exercisesQuery = query(
        collection(db, 'exercises'),
        where('createdBy', '==', user.uid)
      );
      const unsubExercises = onSnapshot(exercisesQuery, (snapshot) => {
        setCounts(prev => ({ ...prev, exercises: snapshot.size }));
      });
      unsubscribers.push(unsubExercises);

      // Listen to workouts
      const workoutsQuery = query(
        collection(db, 'workout_templates'),
        where('createdBy', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubWorkouts = onSnapshot(workoutsQuery, (snapshot) => {
        setCounts(prev => ({ ...prev, workouts: snapshot.size }));
      });
      unsubscribers.push(unsubWorkouts);

      // Listen to assignments
      const assignmentsQuery = query(
        collection(db, 'assigned_workouts'),
        where('trainerId', '==', user.uid)
      );
      const unsubAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
        setCounts(prev => ({ ...prev, assignments: snapshot.size }));
      });
      unsubscribers.push(unsubAssignments);

      // Listen to unread contact messages
      const contactsQuery = query(
        collection(db, 'contact_form_submissions'),
        where('Status', '==', 'Unread')
      );
      const unsubContacts = onSnapshot(contactsQuery, (snapshot) => {
        setCounts(prev => ({ ...prev, unreadMessages: snapshot.size }));
      });
      unsubscribers.push(unsubContacts);

      // Listen to pending accounts
      const pendingAccountsQuery = query(
        collection(db, 'users'),
        where('paymentStatus', '==', 'pending')
      );
      const unsubPending = onSnapshot(pendingAccountsQuery, (snapshot) => {
        setCounts(prev => ({ ...prev, pendingAccounts: snapshot.size }));
      });
      unsubscribers.push(unsubPending);
    } catch (error) {
      console.error('Error setting up listeners:', error);
    }

    // Return cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub());
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

  return (
    <div className="fixed left-4 top-4 bottom-4 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-200/60 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
          SF
        </div>
        <span className="font-bold text-lg text-sidebar-foreground">TRAINER PORTAL</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-auto">
        {/* Dashboard Section */}
        <div>
          <p className="text-xs font-medium text-sidebar-foreground/70 mb-2 px-2">Dashboard</p>
          <Link href="/dashboard/trainer">
            <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              currentPage === 'overview' 
                ? 'bg-primary text-white hover:bg-primary/90' 
                : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`}>
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Overview</span>
            </button>
          </Link>
        </div>
        
        {/* Lead Management */}
        <div>
          <p className="text-xs font-medium text-sidebar-foreground/70 mb-2 px-2">Lead Management</p>
          <div className="space-y-1">
            <Link href="/dashboard/trainer/inbox">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                currentPage === 'inbox' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}>
                <Inbox className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">Lead Inbox</span>
                {counts.unreadMessages > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {counts.unreadMessages}
                  </span>
                )}
              </button>
            </Link>
          </div>
        </div>
        
        {/* Client Management */}
        <div>
          <p className="text-xs font-medium text-sidebar-foreground/70 mb-2 px-2">Client Management</p>
          <div className="space-y-1">
            <Link href="/dashboard/trainer/clients">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                currentPage === 'clients' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}>
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">Clients</span>
                {counts.clients > 0 && (
                  <span className="ml-auto bg-sidebar-accent text-sidebar-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {counts.clients}
                  </span>
                )}
              </button>
            </Link>
            
            <Link href="/dashboard/trainer/clients-messages">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                currentPage === 'messages' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}>
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">Client Inbox</span>
                {counts.unreadClientMessages > 0 && (
                  <span className="ml-auto bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {counts.unreadClientMessages}
                  </span>
                )}
              </button>
            </Link>
            
            <Link href="/dashboard/trainer/assignments">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                currentPage === 'assignments' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}>
                <CalendarCheck className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">Workout Assignments</span>
                {counts.assignments > 0 && (
                  <span className="ml-auto bg-sidebar-accent text-sidebar-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {counts.assignments}
                  </span>
                )}
              </button>
            </Link>
          </div>
        </div>

        {/* Business Management */}
        <div>
          <p className="text-xs font-medium text-sidebar-foreground/70 mb-2 px-2">Business Management</p>
          <div className="space-y-1">
            <Link href="/dashboard/trainer/business">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                currentPage === 'business' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}>
                <Briefcase className="w-4 h-4 flex-shrink-0" />
                <span>Overview</span>
              </button>
            </Link>
            
            <Link href="/dashboard/trainer/pending-accounts">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                currentPage === 'pending-accounts' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}>
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">Pending Accounts</span>
                {counts.pendingAccounts > 0 && (
                  <span className={`ml-auto text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    counts.pendingAccounts > 10 ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                  }`}>
                    {counts.pendingAccounts}
                  </span>
                )}
              </button>
            </Link>
          </div>
        </div>
        
        {/* Workout Management */}
        <div>
          <p className="text-xs font-medium text-sidebar-foreground/70 mb-2 px-2">Workout Management</p>
          <div className="space-y-1">
            <Link href="/dashboard/trainer/exercises">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                currentPage === 'exercises' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}>
                <Target className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">Exercise Library</span>
                {counts.exercises > 0 && (
                  <span className="ml-auto bg-sidebar-accent text-sidebar-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {counts.exercises}
                  </span>
                )}
              </button>
            </Link>
            
            <Link href="/dashboard/trainer/workouts">
              <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                currentPage === 'workouts' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}>
                <Dumbbell className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">Workout Library</span>
                {counts.workouts > 0 && (
                  <span className="ml-auto bg-sidebar-accent text-sidebar-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {counts.workouts}
                  </span>
                )}
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-emerald-100/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 min-w-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
              {userData?.name ? userData.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-sidebar-foreground truncate">{userData?.name || 'Trainer'}</p>
              <p className="text-xs text-primary font-medium truncate">trainer/admin</p>
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
      </div>
    </div>
  );
}
