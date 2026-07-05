'use client';

import React from 'react';
import { SessionBalance, SessionPackage } from '@/types/session';

interface SessionBalanceCardProps {
  balance: SessionBalance;
  packages: SessionPackage[];
  loading?: boolean;
}

export default function SessionBalanceCard({ balance, packages, loading }: SessionBalanceCardProps) {
  if (loading) {
    return (
      <div className="dashboard-card rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-muted rounded w-1/3"></div>
      </div>
    );
  }

  // Helper to convert to milliseconds
  const toMillis = (date: number | any) => {
    return typeof date === 'number' ? date : date.toMillis();
  };

  // Find next expiration
  const activePackages = packages.filter(pkg => !pkg.expired && pkg.remaining > 0);
  const nextExpiration = activePackages.length > 0
    ? activePackages.reduce((earliest, pkg) => 
        toMillis(pkg.expirationDate) < toMillis(earliest) ? toMillis(pkg.expirationDate) : toMillis(earliest)
      , toMillis(activePackages[0].expirationDate))
    : null;

  // Find packages expiring soon (within 7 days)
  const now = Date.now();
  const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
  const expiringSoon = activePackages.filter(pkg => 
    toMillis(pkg.expirationDate) <= sevenDaysFromNow
  );

  return (
    <div className="dashboard-card rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <span className="text-2xl mr-2">📊</span>
          Your Session Balance
        </h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-primary">{balance.available}</span>
          <span className="ml-2 text-muted-foreground">session{balance.available !== 1 ? 's' : ''} available</span>
        </div>
        
        {nextExpiration && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Next expiration:</span>{' '}
            {new Date(nextExpiration).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        )}

        {expiringSoon.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start">
            <span className="text-amber-500 text-xl mr-2">⚠️</span>
            <div className="text-sm">
              <span className="font-medium text-amber-800">
                {expiringSoon.reduce((sum, pkg) => sum + pkg.remaining, 0)} session{expiringSoon.reduce((sum, pkg) => sum + pkg.remaining, 0) !== 1 ? 's' : ''} expire
                {expiringSoon.reduce((sum, pkg) => sum + pkg.remaining, 0) === 1 ? 's' : ''} soon
              </span>
              <span className="text-amber-700"> - Use them before they're gone!</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
          <div>
            <div className="text-2xl font-bold text-foreground">{balance.purchased}</div>
            <div className="text-xs text-muted-foreground">Total Purchased</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{balance.used}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-muted-foreground">{balance.expired}</div>
            <div className="text-xs text-muted-foreground">Expired</div>
          </div>
        </div>
      </div>
    </div>
  );
}
