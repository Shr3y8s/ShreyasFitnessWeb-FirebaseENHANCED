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
  BarChart3,
  Inbox,
  User,
  LogOut
} from 'lucide-react';

interface TrainerSidebarProps {
  currentPage?: 'overview' | 'inbox' | 'clients' | 'exercises' | 'workouts' | 'assignments';
}

export default function TrainerSidebar({ currentPage = 'overview' }: TrainerSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [counts, setCounts] = useState({
    clients: 0,
    exercises: 0,
    workouts: 0,
    assignments: 0,
    unreadMessages: 0
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
        setUserData(userDoc.data());

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
    } catch (error) {
      console.error('Error setting up listeners:', error);
    }

    // Return cleanup function directly from useEffect
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
    <div className="fixed left-0 top-0 h-screen w-64 bg-white shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">SF</div>
          <span className="font-semibold text-lg">TRAINER PORTAL</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-6 overflow-auto">
        {/* Dashboard Section */}
        <div>
          <p className="text-xs text-gray-500 mb-2 px-2">Dashboard</p>
          <Link href="/dashboard/trainer">
            <button className={`w-full flex items-center gap-2 p-2 rounded-md font-medium text-sm ${
              currentPage === 'overview' ? 'bg-primary text-white' : 'hover:bg-gray-100'
            }`}>
              <BarChart3 className="w-4 h-4" />
              Overview
            </button>
          </Link>
        </div>
        
        {/* Lead Management */}
        <div>
          <p className="text-xs text-gray-500 mb-2 px-2">Lead Management</p>
          <div className="space-y-1">
            <Link href="/dashboard/trainer/inbox">
              <button className={`w-full flex items-center justify-between p-2 rounded-md text-sm ${
                currentPage === 'inbox' ? 'bg-primary text-white' : 'hover:bg-gray-100'
              }`}>
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4" />
                  Contact Inbox
                </div>
                {counts.unreadMessages > 0 && (
                  <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center ${
                    currentPage === 'inbox' ? 'bg-white text-primary' : 'bg-red-500 text-white'
                  }`}>
                    {counts.unreadMessages}
                  </span>
                )}
              </button>
            </Link>
          </div>
        </div>
        
        {/* Client Management */}
        <div>
          <p className="text-xs text-gray-500 mb-2 px-2">Client Management</p>
          <Link href="/dashboard/trainer">
            <button className={`w-full flex items-center justify-between p-2 rounded-md text-sm ${
              currentPage === 'clients' ? 'bg-primary text-white' : 'hover:bg-gray-100'
            }`}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                All Clients
              </div>
              <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center ${
                currentPage === 'clients' ? 'bg-white text-primary' : 'bg-gray-200 text-gray-700'
              }`}>
                {counts.clients}
              </span>
            </button>
          </Link>
        </div>

        {/* Workout Management */}
        <div>
          <p className="text-xs text-gray-500 mb-2 px-2">Workout Management</p>
          <div className="space-y-1">
            <Link href="/dashboard/trainer/exercises">
              <button className={`w-full flex items-center justify-between p-2 rounded-md text-sm ${
                currentPage === 'exercises' ? 'bg-primary text-white' : 'hover:bg-gray-100'
              }`}>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Exercise Library
                </div>
                <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center ${
                  currentPage === 'exercises' ? 'bg-white text-primary' : 'bg-gray-200 text-gray-700'
                }`}>
                  {counts.exercises}
                </span>
              </button>
            </Link>
            
            <Link href="/dashboard/trainer/workouts">
              <button className={`w-full flex items-center justify-between p-2 rounded-md text-sm ${
                currentPage === 'workouts' ? 'bg-primary text-white' : 'hover:bg-gray-100'
              }`}>
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Workout Library
                </div>
                <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center ${
                  currentPage === 'workouts' ? 'bg-white text-primary' : 'bg-gray-200 text-gray-700'
                }`}>
                  {counts.workouts}
                </span>
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 min-w-10 bg-primary rounded-full flex items-center justify-center text-white flex-shrink-0">
              {userData?.name?.charAt(0) || 'T'}
            </div>
            <div>
              <p className="font-semibold text-sm">{userData?.name || 'Trainer'}</p>
              <p className="text-xs text-primary font-semibold">trainer/admin</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <LogOut className="w-5 h-5 text-primary" />
          </button>
        </div>
        
        <Link href="/dashboard/client">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <User className="h-4 w-4 mr-2" />
            View as Client
          </Button>
        </Link>
      </div>
    </div>
  );
}
