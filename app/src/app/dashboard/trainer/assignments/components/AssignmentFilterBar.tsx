import React from 'react';
import { Search, Filter } from 'lucide-react';
import { ClientData, getClientStats } from '../utils/assignmentHelpers';
import { Workout } from '@/types/workout';

interface AssignmentFilterBarProps {
  selectedViewClientId: string | null;
  setSelectedViewClientId: (id: string | null) => void;
  clients: ClientData[];
  workouts: Workout[];
  timeWindowWeeks: number;
  setTimeWindowWeeks: (weeks: number) => void;
  assignmentSearchQuery: string;
  setAssignmentSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  filteredWorkoutsData: Workout[];
  onNavigate: (path: string) => void;
}

export function AssignmentFilterBar({
  selectedViewClientId,
  setSelectedViewClientId,
  clients,
  workouts,
  timeWindowWeeks,
  setTimeWindowWeeks,
  assignmentSearchQuery,
  setAssignmentSearchQuery,
  statusFilter,
  setStatusFilter,
  filteredWorkoutsData,
  onNavigate
}: AssignmentFilterBarProps) {
  return (
    <div className="bg-primary/5 border border-primary/50 rounded-xl p-4 mb-6 transition-all duration-300 hover:shadow-glow">
      <div className="flex items-end gap-4">
        {/* Client Selector */}
        <div className="w-[30%]">
          <label className="text-xs text-gray-600 block mb-1 font-medium">Client</label>
          <select
            value={selectedViewClientId || ''}
            onChange={(e) => {
              const clientId = e.target.value || null;
              setSelectedViewClientId(clientId);
              if (clientId) {
                onNavigate(`/dashboard/trainer/assignments?client=${clientId}`);
              } else {
                onNavigate('/dashboard/trainer/assignments');
              }
            }}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary font-medium"
          >
            <option value="">📊 All Clients Overview</option>
            {clients.map(client => {
              const stats = getClientStats(client.id, workouts);
              return (
                <option key={client.id} value={client.id}>
                  {client.name} {stats.overdue > 0 ? '🔴' : stats.active > 0 ? '🟢' : '⚪'}
                  {' '}({stats.active} active)
                </option>
              );
            })}
          </select>
        </div>

        {/* Time Window Selector - Only show when client is selected */}
        {selectedViewClientId && (
          <div className="w-[25%]">
            <label className="text-xs text-gray-600 block mb-1 font-medium">Time Window</label>
            <select
              value={timeWindowWeeks}
              onChange={(e) => setTimeWindowWeeks(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="1">Last 1 week + Next 1 week</option>
              <option value="2">Last 2 weeks + Next 2 weeks</option>
              <option value="3">Last 3 weeks + Next 3 weeks</option>
              <option value="4">Last 4 weeks + Next 4 weeks</option>
            </select>
          </div>
        )}
        
        {/* Search - Only show when client is selected */}
        {selectedViewClientId && (
          <div className="flex-1">
            <label className="text-xs text-gray-600 block mb-1 font-medium">Search Workouts</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by workout, description, or notes..."
                value={assignmentSearchQuery}
                onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}
        
        {/* Status Filter - Only show when client is selected */}
        {selectedViewClientId && (
          <div className="w-[20%]">
            <label className="text-xs text-gray-600 block mb-1 font-medium">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {(selectedViewClientId || statusFilter !== 'all' || assignmentSearchQuery) && (
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">
            Showing <strong>{filteredWorkoutsData.length}</strong> workout{filteredWorkoutsData.length !== 1 ? 's' : ''}
            {selectedViewClientId && (() => {
              const client = clients.find(c => c.id === selectedViewClientId);
              return client ? ` for ${client.name}` : '';
            })()}
            {selectedViewClientId && ` (${timeWindowWeeks} weeks back/forward)`}
          </span>
        </div>
      )}
    </div>
  );
}
