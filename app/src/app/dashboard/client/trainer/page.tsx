'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MessageSquare,
  Mail,
  Phone,
  Award,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';

interface TrainerData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePhotoLarge?: string;
  profilePhotoSmall?: string;
  professionalTitle?: string;
  yearsExperience?: number;
  bio?: string;
}

export default function YourTrainerPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trainerData, setTrainerData] = useState<TrainerData | null>(null);

  useEffect(() => {
    const fetchTrainer = async () => {
      if (authLoading) return;

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const assignedTrainerId = userData?.assignedTrainerId;

        if (assignedTrainerId) {
          const trainerDoc = await getDoc(doc(db, 'admins', assignedTrainerId));

          if (trainerDoc.exists()) {
            const data = trainerDoc.data();
            setTrainerData({
              id: trainerDoc.id,
              name: data.name || 'Your Coach',
              email: data.email || '',
              phone: data.phone,
              profilePhotoLarge: data.profilePhotoLarge,
              profilePhotoSmall: data.profilePhotoSmall,
              professionalTitle: data.professionalTitle,
              yearsExperience: data.yearsExperience,
              bio: data.bio,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching trainer:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainer();
  }, [user, userData, authLoading, router]);

  const handleLogout = async () => {
    try {
      const { signOutUser } = await import('@/lib/firebase');
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!trainerData) {
    return (
      <SidebarProvider>
        <ClientSidebar
          userName={userData?.name}
          userTier={userData?.tier}
          userTierName={userData?.tierName}
          userProfilePhoto={userData?.profilePhotoSmall || undefined}
          onLogout={handleLogout}
        />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <User className="h-16 w-16 text-gray-400 mb-4 mx-auto" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Trainer Assigned</h3>
                <p className="text-gray-600 mb-4">You don't have a trainer assigned yet.</p>
                <Button onClick={() => router.push('/dashboard/client')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        userTierName={userData?.tierName}
        userProfilePhoto={userData?.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Your Trainer</h1>
              <p className="text-muted-foreground mt-2">
                Get to know your personal trainer
              </p>
            </div>

            {/* Hero Section - Trainer Profile Card */}
            <Card className="border-2 border-primary/20 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-blue-50 to-primary/5 p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  {/* Profile Photo */}
                  <div className="relative">
                    {trainerData.profilePhotoLarge ? (
                      <img
                        src={trainerData.profilePhotoLarge}
                        alt={trainerData.name}
                        className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-white"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white">
                        {trainerData.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {trainerData.yearsExperience && (
                      <div className="absolute -bottom-2 -right-2 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
                        {trainerData.yearsExperience}+ years
                      </div>
                    )}
                  </div>

                  {/* Trainer Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                      {trainerData.name}
                    </h2>
                    {trainerData.professionalTitle && (
                      <p className="text-lg text-primary font-medium mb-3">
                        {trainerData.professionalTitle}
                      </p>
                    )}
                    {trainerData.yearsExperience && (
                      <div className="flex items-center gap-2 text-muted-foreground justify-center md:justify-start mb-4">
                        <Award className="h-5 w-5 text-primary" />
                        <span className="font-medium">
                          {trainerData.yearsExperience}+ Years of Experience
                        </span>
                      </div>
                    )}

                    {/* Primary CTA */}
                    <Button
                      size="lg"
                      onClick={() => router.push('/dashboard/client/messages')}
                      className="w-full md:w-auto shadow-md"
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Message Your Coach
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* About Your Trainer */}
            {trainerData.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    About Your Trainer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                    {trainerData.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Get in Touch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  The best way to reach your trainer is through the Coach Chat for quick responses and ongoing support.
                </p>

                {/* Primary Contact Method */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Preferred Contact Method</p>
                      <p className="text-sm text-muted-foreground">Fastest response time</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/dashboard/client/messages')}
                    className="w-full"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Open Coach Chat
                  </Button>
                </div>

                {/* Additional Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {trainerData.email && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-600">{trainerData.email}</p>
                      </div>
                    </div>
                  )}
                  {trainerData.phone && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phone</p>
                        <p className="text-sm text-gray-600">
                          {formatPhoneForDisplay(trainerData.phone) || trainerData.phone}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start text-left"
                    onClick={() => router.push('/dashboard/client/plan')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span className="font-semibold">View My Plan</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      See your personalized training program
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start text-left"
                    onClick={() => router.push('/dashboard/client/sessions/schedule')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">Schedule Session</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Book your next training session
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start text-left"
                    onClick={() => router.push('/dashboard/client/progress')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Track Progress</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      View your metrics and achievements
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start text-left"
                    onClick={() => router.push('/dashboard/client/resources')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold">Resources</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Access training materials and guides
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
