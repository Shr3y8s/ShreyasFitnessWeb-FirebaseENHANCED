'use client';

import React, { useState } from 'react';
import { useConsistencyData } from '@/hooks/useConsistencyData';
import { format, getDay } from 'date-fns';

interface DayData {
  date: string;
  dateObj: Date;
  workoutCount: number;
  workouts: Array<{
    id: string;
    name: string;
  }>;
}

interface ConsistencyHeatmapProps {
  clientId: string;
  daysBack?: number;
}

/**
 * Consistency Heatmap
 * Calendar-style heatmap showing workout completion patterns (like GitHub contributions)
 */
export function ConsistencyHeatmap({ clientId, daysBack = 90 }: ConsistencyHeatmapProps) {
  const { days, loading, error, totalWorkouts, activeDays } = useConsistencyData(clientId, daysBack);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading consistency data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-red-50 rounded-lg">
        <div className="text-center px-4">
          <p className="text-red-600 font-semibold mb-2">Error loading consistency data</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!days || days.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center px-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Consistency Data Available</h3>
          <p className="text-gray-500 text-sm">
            No workout data found in the last {daysBack} days
          </p>
        </div>
      </div>
    );
  }

  // Get cell color based on workout count
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count === 2) return 'bg-green-400';
    return 'bg-green-600';
  };

  // Organize days into weeks starting from Monday
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];
  
  // Pad beginning with empty cells to align first day
  const firstDayOfWeek = getDay(days[0].dateObj);
  const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday = 0
  
  for (let i = 0; i < paddingDays; i++) {
    currentWeek.push({
      date: '',
      dateObj: new Date(),
      workoutCount: -1, // Flag for empty cell
      workouts: []
    });
  }

  // Add all days
  days.forEach((day, index) => {
    currentWeek.push(day);
    
    // Start new week after Sunday (or when week is full)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Add final week if it has days
  if (currentWeek.length > 0) {
    // Pad end with empty cells
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: '',
        dateObj: new Date(),
        workoutCount: -1,
        workouts: []
      });
    }
    weeks.push(currentWeek);
  }

  // Get hovered day data
  const hoveredDayData = days.find(d => d.date === hoveredDay);

  // Calculate consistency percentage
  const consistencyRate = days.length > 0 ? Math.round((activeDays / days.length) * 100) : 0;

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Workout Consistency Heatmap</h3>
        <p className="text-sm text-gray-600">
          90-day calendar view showing training patterns
        </p>
      </div>

      {/* Summary Stats */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">Total Workouts</p>
          <p className="text-2xl font-bold text-gray-900">{totalWorkouts}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">Active Days</p>
          <p className="text-2xl font-bold text-green-700">{activeDays}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">Consistency Rate</p>
          <p className="text-2xl font-bold text-blue-700">{consistencyRate}%</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-2 text-xs text-gray-600">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
          <div className="w-4 h-4 bg-green-200 border border-gray-300 rounded"></div>
          <div className="w-4 h-4 bg-green-400 border border-gray-300 rounded"></div>
          <div className="w-4 h-4 bg-green-600 border border-gray-300 rounded"></div>
        </div>
        <span>More</span>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Day labels */}
          <div className="flex gap-1 mb-2">
            <div className="w-8"></div> {/* Spacer for alignment */}
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
              <div key={day} className="text-xs text-gray-500 text-center" style={{ width: '14px' }}>
                {idx % 2 === 0 ? day.charAt(0) : ''}
              </div>
            ))}
          </div>

          {/* Calendar rows */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-1 mb-1">
              {/* Week label (show month for first week of month) */}
              <div className="w-8 text-xs text-gray-500 pr-2 text-right">
                {weekIndex === 0 || 
                 (week[0].workoutCount >= 0 && format(week[0].dateObj, 'd') === '1')
                  ? format(week[0].workoutCount >= 0 ? week[0].dateObj : new Date(), 'MMM')
                  : ''}
              </div>

              {/* Days */}
              {week.map((day, dayIndex) => {
                if (day.workoutCount === -1) {
                  // Empty cell
                  return <div key={dayIndex} className="w-3.5 h-3.5"></div>;
                }

                return (
                  <div
                    key={day.date}
                    className={`w-3.5 h-3.5 rounded-sm border border-gray-300 cursor-pointer transition-all ${getCellColor(day.workoutCount)} hover:ring-2 hover:ring-primary`}
                    onMouseEnter={() => setHoveredDay(day.date)}
                    onMouseLeave={() => setHoveredDay(null)}
                    title={`${format(day.dateObj, 'MMM d, yyyy')}: ${day.workoutCount} workout${day.workoutCount !== 1 ? 's' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredDayData && (
        <div className="mt-4 p-4 bg-white border rounded-lg shadow-sm">
          <p className="font-semibold text-gray-900 mb-2">
            {format(hoveredDayData.dateObj, 'EEEE, MMMM d, yyyy')}
          </p>
          {hoveredDayData.workoutCount > 0 ? (
            <>
              <p className="text-sm text-gray-700 mb-2">
                {hoveredDayData.workoutCount} workout{hoveredDayData.workoutCount !== 1 ? 's' : ''} completed
              </p>
              <div className="space-y-1">
                {hoveredDayData.workouts.map((workout, idx) => (
                  <p key={idx} className="text-xs text-gray-600">
                    • {workout.name}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No workouts completed</p>
          )}
        </div>
      )}
    </div>
  );
}
