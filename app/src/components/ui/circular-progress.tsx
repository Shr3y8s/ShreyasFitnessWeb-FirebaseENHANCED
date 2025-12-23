import React from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CircularProgress({ 
  percentage, 
  size = 48, 
  strokeWidth = 4,
  className = "" 
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on percentage
  const getColor = () => {
    if (percentage === 0) return 'text-gray-300 dark:text-gray-600';
    if (percentage === 100) return 'text-green-500 dark:text-green-400';
    return 'text-amber-500 dark:text-amber-400';
  };

  const getStrokeColor = () => {
    if (percentage === 0) return 'stroke-gray-300 dark:stroke-gray-600';
    if (percentage === 100) return 'stroke-green-500 dark:stroke-green-400';
    return 'stroke-amber-500 dark:stroke-amber-400';
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${getStrokeColor()} transition-all duration-300 ease-in-out`}
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-bold ${getColor()}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}
