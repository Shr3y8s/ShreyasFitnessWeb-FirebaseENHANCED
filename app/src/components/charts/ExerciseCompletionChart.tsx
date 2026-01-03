'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useExerciseCompletionData } from '@/hooks/useExerciseCompletionData';

interface ExerciseCompletionChartProps {
  clientId: string;
  monthsBack?: number;
}

/**
 * Exercise Completion Rates Chart
 * Shows which exercises are consistently completed vs frequently skipped
 * Sorted with lowest completion rates first (problem exercises)
 */
export function ExerciseCompletionChart({ clientId, monthsBack = 3 }: ExerciseCompletionChartProps) {
  const { data, loading, error } = useExerciseCompletionData(clientId, monthsBack);

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading completion data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-red-50 rounded-lg">
        <div className="text-center px-4">
          <p className="text-red-600 font-semibold mb-2">Error loading completion data</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Completion Data Available</h3>
          <p className="text-gray-500 text-sm">
            No completed workouts found in the last {monthsBack} months
          </p>
        </div>
      </div>
    );
  }

  // Color bars based on completion rate
  const getBarColor = (completionRate: number) => {
    if (completionRate >= 80) return '#10b981'; // Green - Good
    if (completionRate >= 60) return '#f59e0b'; // Orange - Moderate
    return '#ef4444'; // Red - Needs attention
  };

  // Limit to top 10 exercises (to prevent chart overflow)
  const displayData = data.slice(0, 10);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{item.exerciseName}</p>
          <p className="text-sm text-gray-700 mb-1">
            <span className="font-medium">Completion Rate:</span> {item.completionRate}%
          </p>
          <p className="text-sm text-gray-600">
            {item.timesCompleted} of {item.timesAssigned} times completed
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Avg completion: {item.avgCompletionPercentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Exercise Completion Rates</h3>
        <p className="text-sm text-gray-600">
          Which exercises are completed vs frequently skipped (last {monthsBack} months)
        </p>
        <p className="text-xs text-gray-500 mt-1">
          🔴 Red: Needs attention (&lt;60%) • 🟠 Orange: Moderate (60-79%) • 🟢 Green: Good (≥80%)
        </p>
      </div>
      
      {data.length > 10 && (
        <div className="mb-2">
          <p className="text-xs text-gray-500">
            Showing 10 of {data.length} exercises (sorted by completion rate)
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={displayData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          
          <YAxis
            type="category"
            dataKey="exerciseName"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            width={140}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Bar
            dataKey="completionRate"
            radius={[0, 4, 4, 0]}
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.completionRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">Total Exercises</p>
          <p className="text-2xl font-bold text-gray-900">{data.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">High Completion (≥80%)</p>
          <p className="text-2xl font-bold text-green-700">
            {data.filter(e => e.completionRate >= 80).length}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">Needs Attention (&lt;60%)</p>
          <p className="text-2xl font-bold text-red-700">
            {data.filter(e => e.completionRate < 60).length}
          </p>
        </div>
      </div>
    </div>
  );
}
