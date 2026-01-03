'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useStrengthProgressionData } from '@/hooks/useStrengthProgressionData';

interface StrengthProgressionChartProps {
  clientId: string;
  weeksBack?: number;
  topN?: number;
}

/**
 * Strength Progression Chart
 * Multi-line chart showing weight progression for top exercises over time
 * Each exercise gets its own colored line
 */
export function StrengthProgressionChart({ 
  clientId, 
  weeksBack = 12,
  topN = 6 
}: StrengthProgressionChartProps) {
  const { data, loading, error, allExercises } = useStrengthProgressionData(clientId, weeksBack, topN);

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading strength progression data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-red-50 rounded-lg">
        <div className="text-center px-4">
          <p className="text-red-600 font-semibold mb-2">Error loading progression data</p>
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
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Strength Data Available</h3>
          <p className="text-gray-500 text-sm">
            No strength training workouts found in the last {weeksBack} weeks
          </p>
        </div>
      </div>
    );
  }

  // Merge all data points into unified timeline
  // This allows multiple exercises to share the same X-axis
  const allDates = new Set<string>();
  data.forEach(exercise => {
    exercise.dataPoints.forEach(point => {
      allDates.add(point.date);
    });
  });

  const sortedDates = Array.from(allDates).sort((a, b) => {
    // Sort by actual date (find first dataPoint with this date)
    const aTimestamp = data.flatMap(e => e.dataPoints).find(p => p.date === a)?.timestamp;
    const bTimestamp = data.flatMap(e => e.dataPoints).find(p => p.date === b)?.timestamp;
    if (!aTimestamp || !bTimestamp) return 0;
    return aTimestamp.getTime() - bTimestamp.getTime();
  });

  // Create unified data structure for chart
  const chartData = sortedDates.map(date => {
    const dataPoint: any = { date };
    
    data.forEach(exercise => {
      const exercisePoint = exercise.dataPoints.find(p => p.date === date);
      if (exercisePoint) {
        dataPoint[exercise.exerciseId] = exercisePoint.weight;
      }
    });
    
    return dataPoint;
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const exercise = data.find(e => e.exerciseId === entry.dataKey);
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                <span className="font-medium">{exercise?.exerciseName}:</span>{' '}
                {entry.value} lbs
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Strength Progression</h3>
        <p className="text-sm text-gray-600">
          Track weight progression for key exercises (top {topN} most performed, last {weeksBack} weeks)
        </p>
        {allExercises.length > topN && (
          <p className="text-xs text-gray-500 mt-1">
            Showing {topN} of {allExercises.length} exercises
          </p>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ 
              value: 'Weight (lbs)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: '12px', fill: '#6b7280' }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => {
              const exercise = data.find(e => e.exerciseId === value);
              return exercise ? exercise.exerciseName : value;
            }}
          />
          
          {data.map(exercise => (
            <Line
              key={exercise.exerciseId}
              type="monotone"
              dataKey={exercise.exerciseId}
              stroke={exercise.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={exercise.exerciseId}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Exercise Summary */}
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Tracked Exercises:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {data.map(exercise => (
            <div key={exercise.exerciseId} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: exercise.color }}
              />
              <span className="text-gray-700">
                {exercise.exerciseName} <span className="text-gray-500">({exercise.timesPerformed}x)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
