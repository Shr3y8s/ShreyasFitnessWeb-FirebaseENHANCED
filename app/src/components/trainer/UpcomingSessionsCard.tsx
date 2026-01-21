'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Session {
  id: string;
  sessionType: 'training' | 'checkin' | 'onboarding';
  clientId: string;
  clientName: string;
  clientEmail: string;
  scheduledDate: Timestamp;
  duration: number;
  status: string;
  locationId?: string;
  locationType?: string;
  calendlyEventId?: string;
}

type FilterType = 'today' | 'week' | 'all';

const SESSION_TYPE_CONFIG = {
  training: {
    icon: '💪',
    label: 'Training Session',
    color: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-700',
  },
  checkin: {
    icon: '✅',
    label: 'Weekly Check-in',
    color: 'bg-green-50 border-green-200',
    textColor: 'text-green-700',
  },
  onboarding: {
    icon: '🎯',
    label: 'Onboarding Call',
    color: 'bg-purple-50 border-purple-200',
    textColor: 'text-purple-700',
  },
};

export default function UpcomingSessionsCard({ trainerId }: { trainerId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [locations, setLocations] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('week');
  const [cancellingSession, setCancellingSession] = useState<Session | null>(null);
  const { toast } = useToast();

  // Fetch sessions with real-time updates
  useEffect(() => {
    const now = Timestamp.now();
    
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('status', '==', 'scheduled'),
      where('scheduledDate', '>=', now),
      orderBy('scheduledDate', 'asc')
    );

    const unsubscribe = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const sessionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Session[];

        // Filter to only show the three session types we want
        const filteredSessions = sessionsData.filter(
          s => s.sessionType === 'training' || 
               s.sessionType === 'checkin' || 
               s.sessionType === 'onboarding'
        );

        setSessions(filteredSessions);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching sessions:', err);
        setError('Failed to load sessions');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [trainerId]);

  // Fetch locations for training sessions
  useEffect(() => {
    const fetchLocations = async () => {
      const locationMap = new Map<string, string>();
      
      const trainingSessions = sessions.filter(s => s.sessionType === 'training' && s.locationId);
      
      for (const session of trainingSessions) {
        if (!session.locationId) continue;
        
        // Check if already fetched
        if (locationMap.has(session.locationId)) continue;
        
        try {
          if (session.locationId === 'private') {
            locationMap.set('private', 'Private Address');
          } else {
            const locationDoc = await getDoc(doc(db, 'training_locations', session.locationId));
            if (locationDoc.exists()) {
              const locationData = locationDoc.data();
              locationMap.set(session.locationId, locationData.displayName || locationData.name);
            }
          }
        } catch (err) {
          console.error(`Error fetching location ${session.locationId}:`, err);
        }
      }
      
      setLocations(locationMap);
    };

    if (sessions.length > 0) {
      fetchLocations();
    }
  }, [sessions]);

  // Filter sessions based on active filter
  const getFilteredSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    switch (activeFilter) {
      case 'today':
        return sessions.filter(session => {
          const sessionDate = session.scheduledDate.toDate();
          const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
          return sessionDay.getTime() === today.getTime();
        });
      case 'week':
        return sessions.filter(session => {
          const sessionDate = session.scheduledDate.toDate();
          return sessionDate < weekFromNow;
        });
      case 'all':
        return sessions.slice(0, 7); // Limit to 7 sessions
      default:
        return sessions;
    }
  };

  const filteredSessions = getFilteredSessions();

  // Format date/time for display
  const formatSessionDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    if (sessionDate.getTime() === today.getTime()) {
      return `Today at ${timeStr}`;
    } else if (sessionDate.getTime() === tomorrow.getTime()) {
      return `Tomorrow at ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      return `${dateStr} at ${timeStr}`;
    }
  };

  // Handle session cancellation
  const handleCancelSession = async (session: Session) => {
    try {
      // TODO: Call cancelSession cloud function
      // For now, just show success message
      toast({
        title: "Session Canceled",
        description: `${session.clientName}'s ${SESSION_TYPE_CONFIG[session.sessionType].label.toLowerCase()} has been canceled.`,
      });
      setCancellingSession(null);
    } catch (err) {
      console.error('Error canceling session:', err);
      toast({
        title: "Error",
        description: "Failed to cancel session. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading sessions...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border border-red-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-red-600">{error}</div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Upcoming Sessions & Meetings
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Your scheduled appointments with clients
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeFilter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('today')}
            className={activeFilter === 'today' ? '' : 'bg-white'}
          >
            Today
            {activeFilter === 'today' && sessions.filter(s => {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const sessionDate = s.scheduledDate.toDate();
              const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
              return sessionDay.getTime() === today.getTime();
            }).length > 0 && (
              <span className="ml-1 bg-white text-primary rounded-full px-1.5 py-0.5 text-xs font-semibold">
                {sessions.filter(s => {
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const sessionDate = s.scheduledDate.toDate();
                  const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
                  return sessionDay.getTime() === today.getTime();
                }).length}
              </span>
            )}
          </Button>
          <Button
            variant={activeFilter === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('week')}
            className={activeFilter === 'week' ? '' : 'bg-white'}
          >
            This Week
          </Button>
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('all')}
            className={activeFilter === 'all' ? '' : 'bg-white'}
          >
            All
          </Button>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 font-medium">
                {activeFilter === 'today' && 'No sessions scheduled for today'}
                {activeFilter === 'week' && 'No sessions scheduled this week'}
                {activeFilter === 'all' && 'No upcoming sessions scheduled'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Sessions will appear here once clients book appointments
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const config = SESSION_TYPE_CONFIG[session.sessionType];
              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${config.color}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl">{config.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${config.textColor} bg-white`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900">{session.clientName}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatSessionDate(session.scheduledDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>•</span>
                            <span>{session.duration} min</span>
                          </div>
                          {session.sessionType === 'training' && session.locationId && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{locations.get(session.locationId) || 'Loading...'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancellingSession(session)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancellingSession} onOpenChange={(open) => !open && setCancellingSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session with {cancellingSession?.clientName}?
              {cancellingSession?.sessionType === 'training' && (
                <span className="block mt-2 text-sm">
                  The session credit will be returned to the client&apos;s balance.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Session</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancellingSession && handleCancelSession(cancellingSession)}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
