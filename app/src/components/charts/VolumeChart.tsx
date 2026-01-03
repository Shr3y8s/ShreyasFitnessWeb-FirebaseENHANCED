'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useVolumeData } from '@/hooks/useVolumeData';

interface VolumeChartProps {
  clientId: string;
  weeksBack?: number;
}

/**
 * Volume Trends Chart
 * Displays weekly training volume (weight × reps) over time
 */
export function VolumeChart({ clientId, weeksBack = 12 }: VolumeChartProps) {
  const { data, loading, error } = useVolumeData(clientId, weeksBack);

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading volume data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-red-50 rounded-lg">
        <div className="text-center px-4">
          <p className="text-red-600 font-semibold mb-2">Error loading volume data</p>
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Volume Data Available</h3>
          <p className="text-gray-500 text-sm">
            No completed strength workouts found in the last {weeksBack} weeks
          </p>
        </div>
      </div>
    );
  }

  // Format large numbers with K suffix (e.g., 15750 -> "15.8K")
  const formatVolume = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{data.week}</p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Total Volume:</span>{' '}
            {data.volume.toLocaleString()} lbs
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {data.workoutCount} workout{data.workoutCount !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Weekly Training Volume</h3>
        <p className="text-sm text-gray-600">
          Total weight × reps lifted per week (last {weeksBack} weeks)
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          <XAxis
            dataKey="week"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tickFormatter={formatVolume}
            label={{ 
              value: 'Volume (lbs)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: '12px', fill: '#6b7280' }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            formatter={() => 'Training Volume'}
          />
          
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#volumeGradient)"
            name="Volume"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
