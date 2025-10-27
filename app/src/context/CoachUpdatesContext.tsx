"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CoachUpdate {
  id: number;
  type: 'new' | 'updated';
  message: string;
  workoutId?: string;
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

export function CoachUpdatesProvider({ children }: { children: ReactNode }) {
  const [coachUpdates, setCoachUpdates] = useState<CoachUpdate[]>([]);

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
