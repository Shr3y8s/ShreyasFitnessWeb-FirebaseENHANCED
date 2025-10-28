"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CoachUpdate {
  id: number;
  type: 'workout' | 'progress' | 'sessions' | 'nutrition' | 'goals' | 'communication' | 'resources' | 'profile' | 'billing' | 'settings';
  description: string;
  timestamp: Date;
}

interface CoachUpdatesContextType {
  coachUpdates: CoachUpdate[];
  setCoachUpdates: React.Dispatch<React.SetStateAction<CoachUpdate[]>>;
  addCoachUpdate: (update: Omit<CoachUpdate, 'timestamp'>) => void;
  removeCoachUpdate: (id: number) => void;
  clearCoachUpdates: () => void;
}

const CoachUpdatesContext = createContext<CoachUpdatesContextType | undefined>(undefined);

// Initial demo notifications with varied timestamps
const initialCoachUpdates: CoachUpdate[] = [
  {
    id: 1,
    type: 'workout',
    description: 'Your workout plan has been updated for the new phase.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: 2,
    type: 'progress',
    description: 'New progress photos have been added.',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
  },
  {
    id: 3,
    type: 'workout',
    description: 'A new workout has been added to your plan.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  },
  {
    id: 4,
    type: 'nutrition',
    description: 'Your meal plan has been updated with new recipes.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: 5,
    type: 'sessions',
    description: 'Your next training session has been scheduled.',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
  },
];

export function CoachUpdatesProvider({ children }: { children: ReactNode }) {
  const [coachUpdates, setCoachUpdates] = useState<CoachUpdate[]>(initialCoachUpdates);

  const addCoachUpdate = (update: Omit<CoachUpdate, 'timestamp'>) => {
    setCoachUpdates(prev => [...prev, { ...update, timestamp: new Date() }]);
  };

  const removeCoachUpdate = (id: number) => {
    setCoachUpdates(prev => prev.filter(update => update.id !== id));
  };

  const clearCoachUpdates = () => {
    setCoachUpdates([]);
  };

  return (
    <CoachUpdatesContext.Provider
      value={{
        coachUpdates,
        setCoachUpdates,
        addCoachUpdate,
        removeCoachUpdate,
        clearCoachUpdates,
      }}
    >
      {children}
    </CoachUpdatesContext.Provider>
  );
}

export function useCoachUpdates() {
  const context = useContext(CoachUpdatesContext);
  if (context === undefined) {
    throw new Error('useCoachUpdates must be used within a CoachUpdatesProvider');
  }
  return context;
}
