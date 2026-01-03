import React from 'react';
import { Search } from 'lucide-react';
import { Workout } from '@/types/workout';
import { ClientData, getWorkoutDisplayStatus, getStatusBadgeClasses, getStatusLabel } from '../utils/assignmentHelpers';

interface AssignmentsListProps {
  filteredWorkoutsData: Workout[];
  clients: ClientData[];
  selectedWorkoutData: Workout | null;
  setSelectedWorkoutData: (workout: Workout) => void;
  selectedViewClientId: string | null;
}

export function AssignmentsList({
  filteredWorkoutsData,
  clients,
  selectedWorkoutData,
  setSelectedWorkoutData,
  selectedViewClientId
}: AssignmentsListProps) {
  return (
    <div className="w-full flex flex-col bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b flex-shrink-0">
        <h3 className="font-semibold">
          {selectedViewClientId 
            ? (() => {
                const client = clients.find(c => c.id === selectedViewClientId);
                return `${client?.name}'s Workouts`;
              })()
            : 'All Workouts'}
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          {filteredWorkoutsData.length} workout{filteredWorkoutsData.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredWorkoutsData.length > 0 ? (
          filteredWorkoutsData.map((workout) => {
            const client = clients.find(c => c.id === workout.clientId);
            const displayStatus = getWorkoutDisplayStatus(workout);
            const isActive = selectedWorkoutData?.id === workout.id;
            
            return (
              <div
                key={workout.id}
                onClick={() => setSelectedWorkoutData(workout)}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                  isActive ? 'bg-blue-50 border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {client?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600 truncate">{workout.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(displayStatus)}`}>
                        {getStatusLabel(displayStatus)}
                      </span>
                      <span className="text-xs text-gray-600">
                        Due: {workout.dueDate ? workout.dueDate.toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600">No workouts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
