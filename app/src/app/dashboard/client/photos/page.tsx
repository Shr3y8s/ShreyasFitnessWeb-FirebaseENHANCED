'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Loader2, Camera, Upload, CheckCircle, XCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PhotoUploader } from '@/components/progress-photos/PhotoUploader';
import { PhotoLightbox } from '@/components/progress-photos/PhotoLightbox';
import { getUserProgressPhotos, deleteProgressPhotoAngle } from '@/lib/progress-photo-api';
import type { ProgressPhotoWithId, PhotoAngle } from '@/types/progress-photo';
import { useToast } from '@/hooks/use-toast';

export default function MonthlyPhotosPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhotoWithId[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    date: string;
    angle: PhotoAngle;
    metrics?: any;
  } | null>(null);
  const { toast } = useToast();

  // Redirect if not authenticated or not a client
  useEffect(() => {
    if (authLoading) return;
    
    if (!userData) {
      router.push('/login');
      return;
    }

    if (userData.role !== 'client') {
      router.push('/dashboard');
      return;
    }

    if (!userData.accountActivated) {
      router.push('/payment');
      return;
    }
  }, [userData, authLoading, router]);

  // Load user's progress photos
  useEffect(() => {
    const loadPhotos = async () => {
      if (!user) return;
      
      setLoadingPhotos(true);
      const userPhotos = await getUserProgressPhotos(user.uid);
      setPhotos(userPhotos);
      setLoadingPhotos(false);
    };
    
    loadPhotos();
  }, [user, refreshKey]);

  const handleUploadComplete = () => {
    // Refresh photos after upload
    setRefreshKey(prev => prev + 1);
  };

  const handlePhotoClick = (url: string, date: string, angle: PhotoAngle, metrics?: any) => {
    setSelectedPhoto({ url, date, angle, metrics });
    setLightboxOpen(true);
  };

  const handleDeletePhoto = async () => {
    if (!user || !selectedPhoto) return;

    try {
      const result = await deleteProgressPhotoAngle(
        user.uid,
        selectedPhoto.date,
        selectedPhoto.angle
      );

      if (result.success) {
        toast({
          title: 'Photo deleted',
          description: 'Progress photo has been permanently deleted.',
        });
        // Refresh photos
        setRefreshKey(prev => prev + 1);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete photo',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete photo. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    const { signOutUser } = await import('@/lib/firebase');
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (authLoading || !userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData.name}
        userTier={userData.tier}
        userProfilePhoto={userData.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Monthly Progress Photos</h1>
              <p className="text-muted-foreground mt-1">Track your transformation journey with visual progress</p>
            </div>

            {/* Info Alert */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Why progress photos?</strong> Visual progress is one of the most powerful motivators! 
                Take photos monthly in consistent conditions to see your transformation over time.
              </AlertDescription>
            </Alert>

            {/* Photo Guidelines Card */}
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Taking the Perfect Progress Photo
                </CardTitle>
                <CardDescription>
                  Follow these guidelines for the best results and accurate progress tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* DO's Column */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <h4 className="font-semibold text-green-700">DO:</h4>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span>Take photos in the <strong>morning before eating or drinking</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span>Use <strong>consistent lighting</strong> (natural light works best)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span>Take photos in the <strong>same location</strong> each time</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span>Wear <strong>similar form-fitting clothing</strong> (shorts, sports bra, etc.)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span>Stand <strong>naturally relaxed</strong>, arms at your sides</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span>Take <strong>3 angles:</strong> Front, Side, and Back</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">•</span>
                        <span>Use a <strong>plain background</strong> (wall or door)</span>
                      </li>
                    </ul>
                  </div>

                  {/* DON'T's Column */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <h4 className="font-semibold text-red-700">DON&apos;T:</h4>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span><strong>Don&apos;t flex</strong> or pose unnaturally</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span><strong>Don&apos;t use filters</strong> or editing apps</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span><strong>Don&apos;t change</strong> your location or lighting</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span><strong>Don&apos;t take photos</strong> at different times of day</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span><strong>Don&apos;t wear baggy</strong> or loose clothing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span><strong>Don&apos;t take photos</strong> after meals or workouts</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold mt-0.5">•</span>
                        <span><strong>Don&apos;t use mirrors</strong> (use timer or helper)</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Pro Tip */}
                <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm">
                    <strong className="text-primary">💡 Pro Tip:</strong> Set a monthly reminder on the same day each month 
                    (e.g., 1st of the month). Consistency is key for accurate progress tracking!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Upload Section */}
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Progress Photos
                </CardTitle>
                <CardDescription>
                  Upload your monthly progress photos (Front, Side, and Back views)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user && <PhotoUploader userId={user.uid} onUploadComplete={handleUploadComplete} />}
              </CardContent>
            </Card>

            {/* Gallery Section */}
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle>Your Progress Gallery</CardTitle>
                <CardDescription>
                  View all your progress photos in chronological order
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPhotos ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : photos.length === 0 ? (
                  <div className="text-center py-12">
                    <Camera className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No photos uploaded yet</p>
                    <p className="text-sm text-muted-foreground">
                      Upload your first progress photo above to start tracking your transformation journey!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {photos.map((photo) => (
                      <div key={photo.id} className="border-b pb-6 last:border-0">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold">
                            {new Date(photo.date + 'T00:00:00').toLocaleDateString('en-US', { 
                              weekday: 'long',
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </h3>
                          {photo.associatedMetrics && (
                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                              {photo.associatedMetrics.weight && (
                                <span>Weight: {photo.associatedMetrics.weight} {photo.associatedMetrics.weightUnit}</span>
                              )}
                              {photo.associatedMetrics.bodyFat && (
                                <span>Body Fat: {photo.associatedMetrics.bodyFat}%</span>
                              )}
                              {photo.associatedMetrics.bmi && (
                                <span>BMI: {photo.associatedMetrics.bmi.toFixed(1)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {photo.photos.front && (
                            <div className="space-y-2 flex flex-col items-center">
                              <img
                                src={photo.photos.front.thumbnailUrl}
                                alt="Front view"
                                className="w-full max-w-xs aspect-[3/4] object-cover rounded-lg border hover:opacity-90 transition cursor-pointer"
                                onClick={() => handlePhotoClick(
                                  photo.photos.front!.url,
                                  photo.date,
                                  'front',
                                  photo.associatedMetrics
                                )}
                              />
                              <p className="text-sm text-center font-medium">Front</p>
                            </div>
                          )}
                          {photo.photos.side && (
                            <div className="space-y-2 flex flex-col items-center">
                              <img
                                src={photo.photos.side.thumbnailUrl}
                                alt="Side view"
                                className="w-full max-w-xs aspect-[3/4] object-cover rounded-lg border hover:opacity-90 transition cursor-pointer"
                                onClick={() => handlePhotoClick(
                                  photo.photos.side!.url,
                                  photo.date,
                                  'side',
                                  photo.associatedMetrics
                                )}
                              />
                              <p className="text-sm text-center font-medium">Side</p>
                            </div>
                          )}
                          {photo.photos.back && (
                            <div className="space-y-2 flex flex-col items-center">
                              <img
                                src={photo.photos.back.thumbnailUrl}
                                alt="Back view"
                                className="w-full max-w-xs aspect-[3/4] object-cover rounded-lg border hover:opacity-90 transition cursor-pointer"
                                onClick={() => handlePhotoClick(
                                  photo.photos.back!.url,
                                  photo.date,
                                  'back',
                                  photo.associatedMetrics
                                )}
                              />
                              <p className="text-sm text-center font-medium">Back</p>
                            </div>
                          )}
                        </div>
                        
                        {photo.notes && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm">{photo.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          photoUrl={selectedPhoto.url}
          date={selectedPhoto.date}
          angle={selectedPhoto.angle}
          associatedMetrics={selectedPhoto.metrics}
          onDelete={handleDeletePhoto}
        />
      )}
    </SidebarProvider>
  );
}
