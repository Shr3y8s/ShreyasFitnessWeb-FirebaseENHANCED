'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Package, Check, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Session } from '@/types/session';

interface SessionCardProps {
  session: Session;
  locations?: Map<string, string>; // locationId -> location name
  packageExpirations?: Map<string, Date>; // packageId -> expiration date
  onMarkComplete?: (sessionId: string, notes: string) => Promise<void>;
  onMarkIncomplete?: (sessionId: string) => Promise<void>;
  onCancel?: (sessionId: string) => void;
  onNotesUpdate?: (sessionId: string, notes: string) => Promise<void>;
}

export function SessionCard({ 
  session, 
  locations, 
  packageExpirations,
  onMarkComplete,
  onMarkIncomplete,
  onCancel,
  onNotesUpdate
}: SessionCardProps) {
  const [notes, setNotes] = useState(session.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  
  const sessionDate = session.scheduledDate.toDate();
  const isPast = sessionDate < new Date();
  const isToday = format(sessionDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isCompleted = session.status === 'completed';

  // Calculate grace period for cancel/reschedule (1/4 duration, rounded UP to nearest minute)
  const gracePeriodMinutes = Math.ceil(session.duration / 4);
  const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
  const cancelCutoffTime = new Date(sessionDate.getTime() + gracePeriodMs);
  const canStillModify = new Date() < cancelCutoffTime;

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

  const handleNotesBlur = async () => {
    if (notes === session.notes) return; // No changes
    
    setIsSavingNotes(true);
    try {
      await onNotesUpdate?.(session.id, notes);
    } catch (error) {
      console.error('Error saving notes:', error);
      // Revert on error
      setNotes(session.notes || '');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!onMarkComplete) return;
    
    setIsMarkingComplete(true);
    try {
      await onMarkComplete(session.id, notes);
    } catch (error) {
      console.error('Error marking complete:', error);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const handleMarkIncomplete = async () => {
    if (!onMarkIncomplete) return;
    
    setIsMarkingComplete(true);
    try {
      await onMarkIncomplete(session.id);
    } catch (error) {
      console.error('Error marking incomplete:', error);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left Section - Session Info */}
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

            {/* Row 2: Date, Time & Duration */}
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

            {/* Row 3: Location */}
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

            {/* Notes Section - Always visible for editing */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Session Notes {isSavingNotes && <span className="text-blue-600">(saving...)</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add notes about this session (visible to you only)..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={2}
                disabled={isSavingNotes}
              />
            </div>
          </div>

          {/* Right Section - Action Controls */}
          <div className="flex flex-col gap-3 items-end">
            {/* Mark Complete/Incomplete Checkbox - For past sessions */}
            {isPast && (session.status === 'scheduled' || session.status === 'completed') && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={session.status === 'completed'}
                    onChange={session.status === 'completed' ? handleMarkIncomplete : handleMarkComplete}
                    disabled={isMarkingComplete}
                    className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-green-600 whitespace-nowrap">
                    {isMarkingComplete 
                      ? (session.status === 'completed' ? 'Reverting...' : 'Completing...') 
                      : (session.status === 'completed' ? 'Completed' : 'Mark Complete')
                    }
                  </span>
                  <Check className="h-4 w-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </label>
              </div>
            )}

            {/* Cancel/Reschedule Buttons - Only for CHECK-INS within grace period with Calendly URLs */}
            {session.status === 'scheduled' && 
             canStillModify && 
             session.sessionType === 'checkin' && 
             (session.cancelUrl || session.rescheduleUrl) && (
              <div className="flex gap-2">
                {session.rescheduleUrl && (
                  <button
                    onClick={() => window.open(session.rescheduleUrl, '_blank')}
                    className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Reschedule
                  </button>
                )}
                {session.cancelUrl && (
                  <button
                    onClick={() => window.open(session.cancelUrl, '_blank')}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Cancel
                  </button>
                )}
              </div>
            )}

            {/* Cancel Button - Only for future scheduled TRAINING sessions (old behavior) */}
            {session.status === 'scheduled' && 
             !isPast && 
             session.sessionType === 'training' && (
              <button
                onClick={() => onCancel?.(session.id)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
