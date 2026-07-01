"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, Timestamp, addDoc, updateDoc, doc, getDocs, where, writeBatch } from 'firebase/firestore';
import { TrainingLocation, LocationFormData, LocationWithCount } from '@/types/location';
import { Button } from '@/components/ui/button';
import { Plus, MapPin, Info } from 'lucide-react';
import LocationCard from '@/components/locations/LocationCard';
import LocationModal from '@/components/locations/LocationModal';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminTrainingLocationsPage() {
  const router = useRouter();
  const { user, loading: authLoading, canAccessAdminDashboard } = useAuth();
  const [locations, setLocations] = useState<LocationWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<TrainingLocation | null>(null);

  useEffect(() => {
    // Wait for auth to resolve before guarding — otherwise a hard reload (when
    // user/role are momentarily null) would bounce the admin to /dashboard/trainer.
    if (authLoading) return;
    if (!user || !canAccessAdminDashboard) {
      router.push('/dashboard/trainer');
      return;
    }

    const locationsQuery = query(
      collection(db, 'training_locations'),
      orderBy('isDefault', 'desc'),
      orderBy('isActive', 'desc'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(locationsQuery, async (snapshot) => {
      const locationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TrainingLocation[];

      const locationsWithCounts = await Promise.all(
        locationsList.map(async (location) => {
          const upcomingQuery = query(
            collection(db, 'sessions'),
            where('locationId', '==', location.id),
            where('status', '==', 'scheduled'),
            where('scheduledDate', '>=', Timestamp.now())
          );
          const upcomingSnapshot = await getDocs(upcomingQuery);

          const totalQuery = query(
            collection(db, 'sessions'),
            where('locationId', '==', location.id)
          );
          const totalSnapshot = await getDocs(totalQuery);

          return {
            ...location,
            upcomingSessionCount: upcomingSnapshot.size,
            totalSessionCount: totalSnapshot.size
          };
        })
      );

      setLocations(locationsWithCounts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, canAccessAdminDashboard, router]);

  const handleAddLocation = () => {
    setEditingLocation(null);
    setIsModalOpen(true);
  };

  const handleEditLocation = (location: TrainingLocation) => {
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const handleSaveLocation = async (formData: LocationFormData) => {
    try {
      if (editingLocation) {
        const oldLocationId = editingLocation.id;
        const wasDefault = editingLocation.isDefault;
        
        const newLocationRef = await addDoc(collection(db, 'training_locations'), {
          ...formData,
          isDefault: wasDefault,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        const newLocationId = newLocationRef.id;
        
        const oldLocationRef = doc(db, 'training_locations', oldLocationId);
        await updateDoc(oldLocationRef, {
          isActive: false,
          isDefault: false,
          updatedAt: Timestamp.now()
        });
        
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('locationId', '==', oldLocationId),
          where('status', '==', 'scheduled'),
          where('scheduledDate', '>=', Timestamp.now())
        );
        
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const batch = writeBatch(db);
        
        sessionsSnapshot.docs.forEach((sessionDoc) => {
          batch.update(sessionDoc.ref, {
            locationId: newLocationId,
            updatedAt: Timestamp.now()
          });
        });
        
        await batch.commit();
        
      } else {
        await addDoc(collection(db, 'training_locations'), {
          ...formData,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      setIsModalOpen(false);
      setEditingLocation(null);
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  };

  const handleSetDefault = async (locationId: string) => {
    try {
      const locationsSnapshot = await getDocs(collection(db, 'training_locations'));
      const batch = writeBatch(db);
      
      locationsSnapshot.docs.forEach((docSnapshot) => {
        batch.update(docSnapshot.ref, { isDefault: false });
      });

      const newDefaultRef = doc(db, 'training_locations', locationId);
      batch.update(newDefaultRef, { isDefault: true });

      await batch.commit();
    } catch (error) {
      console.error('Error setting default location:', error);
    }
  };

  const handleToggleActive = async (locationId: string, currentActive: boolean) => {
    try {
      const locationRef = doc(db, 'training_locations', locationId);
      await updateDoc(locationRef, {
        isActive: !currentActive,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error toggling location active status:', error);
    }
  };

  const activeLocations = locations.filter(loc => loc.isActive);
  const inactiveLocations = locations.filter(loc => !loc.isActive);

  if (loading) {
    return (
      <SidebarProvider>
        <AdminSidebar currentPage="locations" />
        <SidebarInset>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
            <div className="max-w-5xl mx-auto">
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading locations...</p>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar currentPage="locations" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Training Locations</h1>
                <p className="text-muted-foreground mt-2">
                  Manage training locations for in-person sessions
                </p>
              </div>
              <Button onClick={handleAddLocation} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Quick Reference</h3>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div>
                      <span className="font-medium">Default:</span> Used when a Calendly booking location doesn't match any defined location. Ensures all sessions have a valid location.
                    </div>
                    <div>
                      <span className="font-medium">Active:</span> Visible to clients and available for scheduling sessions. These locations appear in your booking system.
                    </div>
                    <div>
                      <span className="font-medium">Inactive:</span> Hidden from clients but preserved for historical sessions. Use this to phase out locations without losing data.
                    </div>
                    <div>
                      <span className="font-medium">Editing Locations:</span> When you edit a location's address, all upcoming sessions will automatically reference the new address. Completed sessions preserve the original address for historical accuracy.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {activeLocations.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No locations yet</p>
                  <Button onClick={handleAddLocation}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Location
                  </Button>
                </div>
              ) : (
                activeLocations.map(location => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onEdit={handleEditLocation}
                    onSetDefault={handleSetDefault}
                    onToggleActive={handleToggleActive}
                  />
                ))
              )}
            </div>

            {inactiveLocations.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-border"></div>
                  <span className="text-sm text-muted-foreground font-medium">
                    Inactive Locations
                  </span>
                  <div className="h-px flex-1 bg-border"></div>
                </div>
                <div className="space-y-4">
                  {inactiveLocations.map(location => (
                    <LocationCard
                      key={location.id}
                      location={location}
                      onEdit={handleEditLocation}
                      onSetDefault={handleSetDefault}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <LocationModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingLocation(null);
            }}
            onSave={handleSaveLocation}
            location={editingLocation}
            existingLocations={locations}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
