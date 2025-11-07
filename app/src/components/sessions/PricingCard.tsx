'use client';

import React from 'react';
import { SessionPackageType } from '@/types/session';

interface PricingCardProps {
  type: SessionPackageType;
  price: number;
  sessionsIncluded: number;
  pricePerSession: number;
  savings?: number;
  stripePriceId: string;
  onPurchase: (priceId: string) => void;
  loading?: boolean;
  featured?: boolean;
}

export default function PricingCard({
  type,
  price,
  sessionsIncluded,
  pricePerSession,
  savings,
  stripePriceId,
  onPurchase,
  loading,
  featured
}: PricingCardProps) {
  return (
    <div className={`relative rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 h-full bg-card ${
      featured 
        ? 'border-2 border-primary' 
        : 'border border-border'
    }`}>
      {featured && (
        <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-md">
          BEST VALUE
        </div>
      )}
      
      <div className="p-6 h-full flex flex-col">
        <h3 className="text-xl font-bold mb-2 text-foreground">
          {type === '4-pack' ? '4-Pack Sessions' : 'Single Session'}
        </h3>
        
        <div className="mb-4">
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-foreground">
              ${price}
            </span>
            {type === '4-pack' && (
              <span className="ml-2 text-sm text-muted-foreground">
                / {sessionsIncluded} sessions
              </span>
            )}
          </div>
          
          <div className="text-sm mt-1 text-muted-foreground">
            ${pricePerSession} per session
          </div>
          
          {(savings ?? 0) > 0 && (
            <div className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
              Save ${savings}!
            </div>
          )}
        </div>
        
        <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
          <li className="flex items-start">
            <span className="mr-2">{featured ? '✓' : '•'}</span>
            <span>{sessionsIncluded === 1 ? 'One training session' : `${sessionsIncluded} training sessions`}</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">{featured ? '✓' : '•'}</span>
            <span>60 days to use</span>
          </li>
          {type === '4-pack' && (
            <>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span className="font-medium">14% discount</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Best for regular training</span>
              </li>
            </>
          )}
          {type === 'single' && (
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Perfect for trying out</span>
            </li>
          )}
        </ul>
        
        <button
          onClick={() => onPurchase(stripePriceId)}
          disabled={loading}
          className="w-full py-3 px-4 rounded-lg font-semibold transition-colors mt-auto bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Buy Now'}
        </button>
      </div>
    </div>
  );
}
