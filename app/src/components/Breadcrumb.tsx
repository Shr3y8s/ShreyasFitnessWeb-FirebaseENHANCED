'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;  // If provided, item is clickable
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const router = useRouter();

  return (
    <div className="flex items-center text-sm text-gray-600 mb-2">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.href ? (
            <button
              onClick={() => router.push(item.href!)}
              className="text-gray-900 font-medium hover:text-primary transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <ChevronRight className="h-4 w-4 mx-2" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
