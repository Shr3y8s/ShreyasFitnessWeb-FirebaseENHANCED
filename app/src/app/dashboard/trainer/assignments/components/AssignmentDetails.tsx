import React from 'react';
import { Eye, Activity, AlertCircle, Users, Calendar, ArrowLeft } from 'lucide-react';
import { Workout } from '@/types/workout';
import { ClientData, getWorkoutDisplayStatus, getStatusBadgeClasses, getStatusLabel } from '../utils/assignmentHelpers';
import { WorkoutExecutionDetailView } from '@/components/workouts/WorkoutExecutionDetailView';
import { Button } from '@/components/ui/button';

interface AssignmentDetailsProps {
  selectedWorkoutData: Workout | null;
  clients: ClientData[];
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function AssignmentDetails({
  selectedWorkoutData,
  clients,
  onNavigate,
  onBack
}: AssignmentDetailsProps) {
  if (!selectedWorkoutData) {
    return (
      <div className="w-full bg-white rounded-xl border overflow-hidden flex flex-col">
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <Eye className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Workout Selected</h3>
          <p className="text-gray-600">Select a workout from the list to view details</p>
        </div>
      </div>
    );
  }

  const client = clients.find(c => c.id === selectedWorkoutData.clientId);
  const displayStatus = getWorkoutDisplayStatus(selectedWorkoutData);
  const hasActualData = selectedWorkoutData.exercises.some(ex => ex.actual);

  return (
    <div className="w-full bg-white rounded-xl border overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
            {client?.name?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{client?.name || 'Unknown Client'}</h2>
            <p className="text-sm text-gray-600">{selectedWorkoutData.name}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClasses(displayStatus)}`}>
          {getStatusLabel(displayStatus)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Workout Info */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Workout Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Scheduled Date:</span>
              <span className="font-medium">{new Date(selectedWorkoutData.scheduledDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-medium">
                {selectedWorkoutData.dueDate ? new Date(selectedWorkoutData.dueDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            {selectedWorkoutData.completedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium">{new Date(selectedWorkoutData.completedAt).toLocaleDateString()}</span>
              </div>
            )}
            {selectedWorkoutData.durationMinutes && (
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{selectedWorkoutData.durationMinutes} minutes</span>
              </div>
            )}
            {selectedWorkoutData.notes && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Trainer Notes:</span>
                <span className="font-medium text-right flex-1 ml-4">{selectedWorkoutData.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Exercise Details - Side-by-Side View (Prescribed + Actual) */}
        {selectedWorkoutData.exercises && selectedWorkoutData.exercises.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Exercise Details</h3>
            </div>
            <WorkoutExecutionDetailView 
              workout={selectedWorkoutData}
              showClientNotes={true}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                if (client) {
                  onNavigate(`/dashboard/trainer/clients-messages?clientId=${client.id}`);
                }
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              Message Client
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
