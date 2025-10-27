"use client";

import { Pin } from 'lucide-react';

interface CoachNotesProps {
  coachName: string;
  message: string;
}

export function CoachNotes({ coachName, message }: CoachNotesProps) {
  return (
    <div className="rounded-xl border text-card-foreground shadow-sm bg-primary/5 border-primary/50 hover:shadow-glow">
      <div className="flex flex-col space-y-1.5 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {coachName.charAt(0)}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold leading-none tracking-tight">
                A Note From {coachName}
              </h3>
              <p className="text-sm text-muted-foreground">Your weekly check-in & motivation</p>
            </div>
          </div>
          <Pin className="h-5 w-5 text-primary/50" />
        </div>
      </div>
      <div className="p-6 pt-0">
        <p className="text-sm italic text-foreground/90">&quot;{message}&quot;</p>
      </div>
    </div>
  );
}
