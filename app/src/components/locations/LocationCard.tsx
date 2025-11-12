"use client";

import { LocationWithCount } from '@/types/location';
import { Button } from '@/components/ui/button';
import { MapPin, Edit, CheckCircle2, XCircle } from 'lucide-react';

interface LocationCardProps {
  location: LocationWithCount;
  onEdit: (location: LocationWithCount) => void;
  onSetDefault: (locationId: string) => void;
  onToggleActive: (locationId: string, currentActive: boolean) => void;
}

export default function LocationCard({
  location,
  onEdit,
  onSetDefault,
  onToggleActive
}: LocationCardProps) {
  return (
    <div className={`rounded-xl border shadow-sm p-6 transition-all ${
      location.isActive 
        ? 'bg-white border-emerald-200/60' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        {/* Left Side: Icon and Info */}
        <div className="flex gap-4 flex-1">
          <div className={`p-3 rounded-full flex-shrink-0 ${
            location.isActive ? 'bg-primary/10' : 'bg-gray-200'
          }`}>
            <MapPin className={`w-6 h-6 ${
              location.isActive ? 'text-primary' : 'text-gray-400'
            }`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-semibold truncate">
                {location.displayName}
              </h3>
              {location.isDefault && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex-shrink-0">
                  DEFAULT
                </span>
              )}
              {!location.isActive && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full flex-shrink-0">
                  INACTIVE
                </span>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {location.address}
            </p>

            {/* Status and Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                {location.isActive ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-muted-foreground">
                  {location.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {location.totalSessionCount > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {location.upcomingSessionCount} upcoming session{location.upcomingSessionCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {location.totalSessionCount} total session{location.totalSessionCount !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(location)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>

          {!location.isDefault && location.isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetDefault(location.id)}
            >
              Set as Default
            </Button>
          )}

          {location.isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleActive(location.id, location.isActive)}
              disabled={location.isDefault}
              title={location.isDefault ? "Can't deactivate default location" : "Mark as inactive"}
            >
              Mark Inactive
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleActive(location.id, location.isActive)}
            >
              Reactivate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
