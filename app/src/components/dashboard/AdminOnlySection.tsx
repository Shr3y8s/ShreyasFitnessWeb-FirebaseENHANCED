import React from 'react';
import { Shield } from 'lucide-react';

interface AdminOnlySectionProps {
  title: string;
  children: React.ReactNode;
  canAccessAdminDashboard: boolean;
}

export function AdminOnlySection({ 
  title, 
  children, 
  canAccessAdminDashboard 
}: AdminOnlySectionProps) {
  if (!canAccessAdminDashboard) return null;
  
  return (
    <div className="relative">
      <div className="absolute -left-1 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
      <div className="border-l-4 border-blue-200 bg-gradient-to-r from-blue-50/50 to-purple-50/30 rounded-r-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Admin View Only
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  );
}
