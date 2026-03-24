'use client';

import React from 'react';
import { useActivityFeed } from '@/context/ActivityFeedContext';
import ActivityFeedPanel from './ActivityFeedPanel';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Activity, ExternalLink } from 'lucide-react';
import Link from 'next/link';

/**
 * ActivityFeedSheet — Right-side slide-out panel for the activity feed.
 * Uses shadcn/ui Sheet component. Controlled by ActivityFeedContext.
 * Rendered globally in the trainer layout so it's accessible from any page.
 */
export default function ActivityFeedSheet() {
  const { isSheetOpen, closeSheet } = useActivityFeed();

  return (
    <Sheet open={isSheetOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent side="right" className="w-[400px] sm:w-[440px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-emerald-600" />
              Client Activity Feed
            </SheetTitle>
            <Link 
              href="/dashboard/trainer/activity" 
              onClick={closeSheet}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              View Full Page
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <ActivityFeedPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
