"use client";

import { useState, useEffect } from 'react';
import { TrainingLocation, LocationFormData } from '@/types/location';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LocationFormData) => Promise<void>;
  location: TrainingLocation | null;
  existingLocations: TrainingLocation[];
}

export default function LocationModal({
  isOpen,
  onClose,
  onSave,
  location,
  existingLocations
}: LocationModalProps) {
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    displayName: '',
    address: '',
    isDefault: false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [upcomingSessionCount, setUpcomingSessionCount] = useState(0);

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        displayName: location.displayName,
        address: location.address,
        isDefault: location.isDefault
      });
      
      // Calculate upcoming session count for confirmation
      const locationWithCount = existingLocations.find(loc => loc.id === location.id);
      if (locationWithCount && 'upcomingSessionCount' in locationWithCount) {
        setUpcomingSessionCount((locationWithCount as any).upcomingSessionCount || 0);
      }
    } else {
      setFormData({
        name: '',
        displayName: '',
        address: '',
        isDefault: false
      });
      setUpcomingSessionCount(0);
    }
    setError(null);
    setShowConfirmation(false);
  }, [location, existingLocations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Location name is required');
      return;
    }
    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return;
    }

    // If editing and has upcoming sessions, show confirmation
    if (location && upcomingSessionCount > 0 && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError('Failed to save location. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {!showConfirmation ? (
          // Main Form
          <>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold">
                {location ? 'Edit Location' : 'Add Training Location'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ironworks"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for matching Calendly bookings
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ironworks Gym"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shown to clients on dashboard
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                  placeholder="12708 Northup Way, Bellevue, WA 98005"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Complete address shown to clients
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="isDefault" className="text-sm font-medium">
                  Set as default location
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Location'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          // Confirmation Dialog
          <>
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <h2 className="text-2xl font-bold">Update Location Details</h2>
              </div>
              <button
                onClick={() => setShowConfirmation(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm">
                This location is used in <strong>{upcomingSessionCount} upcoming session{upcomingSessionCount !== 1 ? 's' : ''}</strong>.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-blue-900">Changes will:</p>
                <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                  <li>Update all future sessions</li>
                  <li>Notify affected clients via email & app</li>
                  <li>Show new address on their dashboards</li>
                  <li>Preserve completed session history</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={saving}
                >
                  {saving ? 'Updating...' : 'Update & Notify'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
