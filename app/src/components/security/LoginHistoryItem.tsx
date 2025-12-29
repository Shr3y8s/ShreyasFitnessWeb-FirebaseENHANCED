import React from 'react';
import { LoginHistoryEntry } from '@/types/login-history';
import { CheckCircle2, XCircle, Monitor, Smartphone, Tablet } from 'lucide-react';

interface LoginHistoryItemProps {
  entry: LoginHistoryEntry;
  suspicious?: boolean;
}

export function LoginHistoryItem({ entry, suspicious }: LoginHistoryItemProps) {
  const date = entry.timestamp.toDate();
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const DeviceIcon = entry.device.type === 'mobile' ? Smartphone :
                     entry.device.type === 'tablet' ? Tablet : Monitor;

  return (
    <div className={`border rounded-lg p-4 ${
      suspicious ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-1">
          {entry.success ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Status & Date */}
          <div className="flex items-center justify-between mb-1">
            <h4 className={`font-semibold ${
              entry.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {entry.success ? 'Successful Login' : 'Failed Login'}
              {entry.failureReason && ` (${entry.failureReason.replace(/-/g, ' ')})`}
            </h4>
            {suspicious && (
              <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full">
                Suspicious
              </span>
            )}
          </div>

          {/* Date & Time */}
          <p className="text-sm text-gray-600 mb-2">
            {dateStr} at {timeStr}
          </p>

          {/* Device & Location */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <DeviceIcon className="w-4 h-4" />
              <span>{entry.device.browser} on {entry.device.os}</span>
            </div>
            <span className="text-gray-300">•</span>
            <span>
              {entry.location.city}, {entry.location.state}
            </span>
          </div>

          {/* IP Address */}
          <p className="text-xs text-gray-400 mt-1">
            IP: {entry.location.ip}
          </p>
        </div>
      </div>
    </div>
  );
}
