'use client';

import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Session } from '@/types/session';

interface SessionCardProps {
  session: Session;
  locations?: Map<string, string>; // locationId -> location name
  packageExpirations?: Map<string, Date>; // packageId -> expiration date
  onMarkComplete?: (sessionId: string) => void;
  onMarkNoShow?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
}

export function SessionCard({ 
  session, 
  locations, 
  packageExpirations,
  onMarkComplete, 
  onMarkNoShow, 
  onCancel 
}: SessionCardProps) {
  const sessionDate = session.scheduledDate.toDate();
  const isPast = sessionDate < new Date();
  const isToday = format(sessionDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  // Get package expiration if available (only for training sessions)
  const packageExpiration = session.sessionType === 'training' && 'packageId' in session
    ? packageExpirations?.get(session.packageId)
    : undefined;

  // Status badge color
  const getStatusColor = () => {
    switch (session.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'no-show':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'canceled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Session type badge
  const getTypeColor = () => {
    return session.sessionType === 'training'
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-teal-100 text-teal-800 border-teal-200';
  };

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
      isToday ? 'border-primary border-2' : 'border border-gray-200'
    }`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left Section - Session Info (Compact 4-row layout) */}
          <div className="flex-1 space-y-2">
            {/* Row 1: Client Name with Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-semibold">{session.clientName}</span>
              <Badge className={getStatusColor()}>
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </Badge>
              <Badge className={getTypeColor()}>
                {session.sessionType === 'training' ? 'Training' : 'Check-in'}
              </Badge>
              {isToday && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Today
                </Badge>
              )}
            </div>

            {/* Row 2: Date, Time & Duration (all on one line) */}
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{format(sessionDate, 'EEE, MMM d, yyyy')}</span>
              </div>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{format(sessionDate, 'h:mm a')}</span>
              </div>
              <span className="text-gray-400">•</span>
              <span>{session.duration} min</span>
            </div>

            {/* Row 3: Location (if available for training sessions) */}
            {session.sessionType === 'training' && 'locationId' in session && session.locationId && (
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>
                  {session.locationId === 'private' 
                    ? 'Private Location' 
                    : locations?.get(session.locationId) || `Location: ${session.locationId}`
                  }
                </span>
              </div>
            )}

            {/* Row 4: Created & Expiration Dates */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Created: {format(session.createdAt.toDate(), 'MMM d, yyyy')}</span>
              {packageExpiration && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    <span>Expires: {format(packageExpiration, 'MMM d, yyyy')}</span>
                  </div>
                </>
              )}
            </div>

            {/* Notes (if available) - Collapsible for space */}
            {session.notes && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                <span className="font-medium">Notes: </span>
                {session.notes}
              </div>
            )}
          </div>

          {/* Right Section - Action Buttons (Compact) */}
          {session.status === 'scheduled' && isPast && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onMarkComplete?.(session.id)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors whitespace-nowrap"
              >
                Complete
              </button>
              <button
                onClick={() => onMarkNoShow?.(session.id)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors whitespace-nowrap"
              >
                No-Show
              </button>
            </div>
          )}

          {session.status === 'scheduled' && !isPast && (
            <div>
              <button
                onClick={() => onCancel?.(session.id)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
