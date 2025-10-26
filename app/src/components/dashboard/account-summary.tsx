"use client";

import { User, Calendar, CreditCard, CircleCheckBig } from 'lucide-react';

export function AccountSummary() {
  return (
    <div className="rounded-xl border text-card-foreground shadow-sm bg-secondary/30 flex flex-col h-full hover:shadow-lg">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Account Summary
        </h3>
      </div>
      <div className="p-6 pt-0 flex-1 flex items-center justify-around">
        <div className="grid grid-cols-3 gap-4 text-center w-full">
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
            <div className="text-primary">
              <CircleCheckBig className="h-5 w-5 text-primary" />
            </div>
            <p className="font-bold text-2xl">12</p>
            <p className="text-xs text-muted-foreground">Sessions Completed</p>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
            <div className="text-primary">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <p className="font-bold text-2xl">8</p>
            <p className="text-xs text-muted-foreground">Weeks Active</p>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
            <div className="text-primary">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <p className="font-bold text-2xl">Aug 28</p>
            <p className="text-xs text-muted-foreground">Next Payment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
