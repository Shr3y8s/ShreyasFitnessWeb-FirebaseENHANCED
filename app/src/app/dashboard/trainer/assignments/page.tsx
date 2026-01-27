'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { AllClientsOverviewDashboard } from '@/components/workouts/AllClientsOverviewDashboard';
import { Dumbbell } from 'lucide-react';

// Import custom hooks
import { useAssignmentsData } from './hooks/useAssignmentsData';
import { useAssignmentFilters } from './hooks/useAssignmentFilters';
import { getWorkoutCounts } from './utils/assignmentHelpers';

// Import components
import { AssignmentFilterBar } from './components/AssignmentFilterBar';
import { AssignmentsList } from './components/AssignmentsList';
import { AssignmentDetails } from './components/AssignmentDetails';
import { Workout } from '@/types/workout';

export default function WorkoutAssignmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data fetching hook
  const { loading, clients, workoutTemplates, workouts, reloadWorkouts } = useAssignmentsData();

  // UI state
  const [selectedViewClientId, setSelectedViewClientId] = useState<string | null>(null);
  const [selectedWorkoutData, setSelectedWorkoutData] = useState<Workout | null>(null);

  // Check for pre-selected client from URL
  useEffect(() => {
    const urlClient = searchParams.get('client');
    if (urlClient) {
      setSelectedViewClientId(urlClient);
    }
  }, [searchParams]);

  // Filters hook
  const {
    assignmentSearchQuery,
    setAssignmentSearchQuery,
    statusFilter,
    setStatusFilter,
    timeWindowWeeks,
    setTimeWindowWeeks,
    filteredWorkoutsData
  } = useAssignmentFilters(
    clients,
    workoutTemplates,
    workouts,
    'view',
    selectedViewClientId
  );

  // Calculate workout counts
  const workoutCounts = getWorkoutCounts(workouts);

  // Handle navigation
  const handleNavigate = (path: string) => {
    router.push(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="assignments" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          {/* Header with Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb items={[
              { label: 'Training' },
              { label: 'Workout Assignments' }
            ]} />
            <h1 className="text-2xl font-bold text-foreground">Workout Assignments</h1>
            <p className="text-muted-foreground mt-1">
              {workoutCounts.total} total • {workoutCounts.active} active • {workoutCounts.overdue} overdue
            </p>
          </div>

          {/* New Assignment Button */}
          <div className="flex justify-end mb-6">
            <Button
              onClick={() => router.push('/dashboard/trainer/assignments/create')}
              className="bg-primary text-white"
            >
              <Dumbbell className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </div>

          {/* Filter Bar */}
          <AssignmentFilterBar
            selectedViewClientId={selectedViewClientId}
            setSelectedViewClientId={(id) => {
              setSelectedViewClientId(id);
              setSelectedWorkoutData(null);
            }}
            clients={clients}
            workouts={workouts}
            timeWindowWeeks={timeWindowWeeks}
            setTimeWindowWeeks={setTimeWindowWeeks}
            assignmentSearchQuery={assignmentSearchQuery}
            setAssignmentSearchQuery={setAssignmentSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            filteredWorkoutsData={filteredWorkoutsData}
            onNavigate={handleNavigate}
          />

          {/* Conditional: Dashboard or List/Detail View */}
          {!selectedViewClientId ? (
            /* ALL CLIENTS OVERVIEW - Full Width Dashboard */
            <AllClientsOverviewDashboard
              clients={clients}
              assignments={workouts}
              onSelectClient={(clientId) => {
                setSelectedViewClientId(clientId);
                router.push(`/dashboard/trainer/assignments?client=${clientId}`);
              }}
            />
          ) : selectedWorkoutData ? (
            /* WORKOUT SELECTED - Full Width Detail View */
            <AssignmentDetails
              selectedWorkoutData={selectedWorkoutData}
              clients={clients}
              onNavigate={handleNavigate}
              onBack={() => setSelectedWorkoutData(null)}
            />
          ) : (
            /* CLIENT SELECTED - Workout List */
            <AssignmentsList
              filteredWorkoutsData={filteredWorkoutsData}
              clients={clients}
              selectedWorkoutData={selectedWorkoutData}
              setSelectedWorkoutData={setSelectedWorkoutData}
              selectedViewClientId={selectedViewClientId}
              onWorkoutDeleted={reloadWorkouts}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
