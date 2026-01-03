'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Calendar, CheckCircle, ChevronRight } from 'lucide-react';
import { Workout } from '@/types/workout';

interface ClientData {
  id: string;
  name: string;
  email: string;
}

interface AllClientsOverviewDashboardProps {
  clients: ClientData[];
  assignments: Workout[];
  onSelectClient: (clientId: string) => void;
}

export function AllClientsOverviewDashboard({
  clients,
  assignments,
  onSelectClient,
}: AllClientsOverviewDashboardProps) {
  
  // Calculate stats for each client
  const getClientStats = (clientId: string) => {
    const clientAssignments = assignments.filter(a => a.clientId === clientId);
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const active = clientAssignments.filter(a => a.status !== 'completed').length;
    const overdue = clientAssignments.filter(a => 
      a.status !== 'completed' && a.dueDate && a.dueDate < now
    ).length;
    const completedThisWeek = clientAssignments.filter(a => 
      a.status === 'completed' && 
      a.completedAt && 
      a.completedAt >= oneWeekAgo
    ).length;
    const dueThisWeek = clientAssignments.filter(a =>
      a.status !== 'completed' &&
      a.dueDate &&
      a.dueDate >= now &&
      a.dueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    ).length;
    
    return { active, overdue, completedThisWeek, dueThisWeek, total: clientAssignments.length };
  };

  // Get clients with issues
  const clientsWithIssues = clients
    .map(client => ({
      client,
      stats: getClientStats(client.id),
      overdueWorkouts: assignments.filter(a => 
        a.clientId === client.id &&
        a.status !== 'completed' && 
        a.dueDate &&
        a.dueDate < new Date()
      )
    }))
    .filter(item => item.stats.overdue > 0)
    .sort((a, b) => b.stats.overdue - a.stats.overdue);

  // Overall stats
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const thisWeekAssignments = assignments.filter(a => 
    a.createdAt >= oneWeekAgo
  );
  const completedThisWeek = thisWeekAssignments.filter(a => a.status === 'completed').length;
  const completionRate = thisWeekAssignments.length > 0 
    ? Math.round((completedThisWeek / thisWeekAssignments.length) * 100)
    : 0;
  
  const upcomingCount = assignments.filter(a =>
    a.status !== 'completed' &&
    a.dueDate &&
    a.dueDate >= now &&
    a.dueDate <= oneWeekFromNow
  ).length;

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {clientsWithIssues.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-red-900">
                Needs Attention ({clientsWithIssues.length} client{clientsWithIssues.length !== 1 ? 's' : ''})
              </h3>
            </div>
            <div className="space-y-3">
              {clientsWithIssues.map(({ client, stats, overdueWorkouts }) => (
                <div 
                  key={client.id}
                  className="bg-white rounded-lg p-4 border border-red-200 hover:border-red-400 transition-colors cursor-pointer"
                  onClick={() => onSelectClient(client.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-red-900">{client.name}</p>
                        <p className="text-sm text-red-700">
                          {stats.overdue} overdue workout{stats.overdue !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="pl-10 space-y-1">
                    {overdueWorkouts.slice(0, 2).map(workout => {
                      const daysOverdue = workout.dueDate ? Math.floor(
                        (now.getTime() - workout.dueDate.getTime()) / (1000 * 60 * 60 * 24)
                      ) : 0;
                      return (
                        <p key={workout.id} className="text-sm text-red-700">
                          • {workout.name} - {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                        </p>
                      );
                    })}
                    {overdueWorkouts.length > 2 && (
                      <p className="text-sm text-red-600 font-medium">
                        +{overdueWorkouts.length - 2} more overdue
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">This Week</p>
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{thisWeekAssignments.length}</p>
            <p className="text-sm text-gray-600 mt-1">Workouts assigned</p>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Completion</p>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
            <p className="text-sm text-gray-600 mt-1">
              {completedThisWeek} of {thisWeekAssignments.length} completed
            </p>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Upcoming</p>
              <CheckCircle className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{upcomingCount}</p>
            <p className="text-sm text-gray-600 mt-1">Due next 7 days</p>
          </div>
        </Card>
      </div>

      {/* Client Grid */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">All Clients ({clients.length})</h3>
          <div className="grid grid-cols-3 gap-4">
            {clients.map(client => {
              const stats = getClientStats(client.id);
              const statusIcon = stats.overdue > 0 ? '🔴' : stats.active > 0 ? '🟢' : '⚪';
              
              return (
                <div
                  key={client.id}
                  className="border rounded-lg p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                  onClick={() => onSelectClient(client.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{client.name}</p>
                      <p className="text-xs text-gray-600">{statusIcon} {stats.active} active</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {stats.overdue > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Overdue:</span>
                        <span className="font-semibold">{stats.overdue}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>Completed:</span>
                      <span className="font-semibold">{stats.completedThisWeek} this week</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Due soon:</span>
                      <span className="font-semibold">{stats.dueThisWeek}</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClient(client.id);
                    }}
                  >
                    View Workouts <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
