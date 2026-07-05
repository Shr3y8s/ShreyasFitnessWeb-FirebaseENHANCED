'use client';

import React from 'react';
import { SessionPackage } from '@/types/session';

interface PurchaseHistoryProps {
  packages: SessionPackage[];
  loading?: boolean;
}

export default function PurchaseHistory({ packages, loading }: PurchaseHistoryProps) {
  if (loading) {
    return (
      <div className="dashboard-card rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Session Purchase History</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="dashboard-card rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Session Purchase History</h3>
        <p className="text-muted-foreground text-center py-8">No purchases yet. Buy your first session package above!</p>
      </div>
    );
  }

  const getStatusBadge = (pkg: SessionPackage) => {
    if (pkg.expired) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Expired</span>;
    }
    if (pkg.remaining === 0) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Complete</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Active</span>;
  };

  // Sort packages by purchase date (newest first)
  const sortedPackages = [...packages].sort((a, b) => {
    const aTime = typeof a.purchaseDate === 'number' ? a.purchaseDate : a.purchaseDate.toMillis();
    const bTime = typeof b.purchaseDate === 'number' ? b.purchaseDate : b.purchaseDate.toMillis();
    return bTime - aTime; // Descending order (newest first)
  });

  return (
    <div className="dashboard-card rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Session Purchase History</h3>
      
      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Purchase Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Package Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Expiration Date</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount Paid</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Used</th>
            </tr>
          </thead>
          <tbody>
            {sortedPackages.map((pkg) => (
              <tr key={pkg.id} className="border-b border-border/50 hover:bg-muted/50">
                <td className="py-3 px-4 text-sm">
                  {new Date(typeof pkg.purchaseDate === 'number' ? pkg.purchaseDate : pkg.purchaseDate.toMillis()).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}
                </td>
                <td className="py-3 px-4 text-sm font-medium">
                  {pkg.productName || pkg.stripeProductName || 'Session Package'}
                </td>

                <td className="py-3 px-4 text-sm">
                  {new Date(typeof pkg.expirationDate === 'number' ? pkg.expirationDate : pkg.expirationDate.toMillis()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  <span className="text-muted-foreground text-xs ml-1">
                    (11:59 PM {new Date(typeof pkg.expirationDate === 'number' ? pkg.expirationDate : pkg.expirationDate.toMillis()).toLocaleTimeString('en-US', {
                      timeZoneName: 'short'
                    }).split(' ').pop()})
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-right font-medium">
                  {pkg.amount ? `$${(pkg.amount / 100).toFixed(2)}` : 'N/A'}
                </td>
                <td className="py-3 px-4 text-sm">
                  {getStatusBadge(pkg)}
                </td>
                <td className="py-3 px-4 text-sm">
                  <span className="font-medium">{pkg.quantity - pkg.remaining}</span>
                  <span className="text-muted-foreground"> / {pkg.quantity}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-3">
        {sortedPackages.map((pkg) => (
          <div key={pkg.id} className="border border-border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-medium text-sm text-foreground">
                  {pkg.productName || pkg.stripeProductName || 'Session Package'}
                </div>

                <div className="text-xs text-muted-foreground">
                  {new Date(typeof pkg.purchaseDate === 'number' ? pkg.purchaseDate : pkg.purchaseDate.toMillis()).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}
                </div>
              </div>
              {getStatusBadge(pkg)}
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Expires:</span>
              <span className={pkg.expired ? 'text-red-600' : ''}>
                {new Date(typeof pkg.expirationDate === 'number' ? pkg.expirationDate : pkg.expirationDate.toMillis()).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
                <span className="text-xs ml-1">
                  (11:59 PM {new Date(typeof pkg.expirationDate === 'number' ? pkg.expirationDate : pkg.expirationDate.toMillis()).toLocaleTimeString('en-US', {
                    timeZoneName: 'short'
                  }).split(' ').pop()})
                </span>
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-medium">{pkg.amount ? `$${(pkg.amount / 100).toFixed(2)}` : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Used:</span>
              <span className="font-medium">{pkg.quantity - pkg.remaining} / {pkg.quantity}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
