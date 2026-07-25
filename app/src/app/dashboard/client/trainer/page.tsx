'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ClientPageShell } from '@/components/dashboard/ClientPageShell';
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
  ExternalLink,
  Linkedin,
  Youtube,
  Instagram,
  Facebook,
} from 'lucide-react';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';

interface TrainerData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePhotoLarge?: string;
  profilePhotoSmall?: string;
  // Education
  educationDegree?: string;
  educationMajor?: string;
  educationMinor?: string;
  educationInstitution?: string;
  // Certifications
  fitnessCertifications?: string;
  nutritionCertifications?: string;
  specialtyCertifications?: string;
  fitnessCertificationUrls?: string[];
  nutritionCertificationUrls?: string[];
  specialtyCertificationUrls?: string[];
  // Experience
  yearsExperience?: number;
  specializations?: string;
  // Philosophy
  trainingPhilosophy?: string;
  areasOfExpertise?: string;
  // Social Media
  linkedinUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  // Legacy fields
  professionalTitle?: string;
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
        const assignedTrainerCollection = userData?.assignedTrainerCollection;
        
        // Strict mode: Both fields are now required (no fallback)
        if (!assignedTrainerId || !assignedTrainerCollection) {
          console.error('[ClientTrainer] Missing trainer assignment fields', {
            userId: user.uid,
            hasAssignedTrainerId: !!assignedTrainerId,
            hasAssignedTrainerCollection: !!assignedTrainerCollection,
          });
          setLoading(false);
          return;
        }
        
        if (assignedTrainerId && assignedTrainerCollection) {
          const trainerDoc = await getDoc(doc(db, assignedTrainerCollection, assignedTrainerId));

          if (trainerDoc.exists()) {
            const data = trainerDoc.data();
            setTrainerData({
              id: trainerDoc.id,
              name: data.name || 'Your Coach',
              email: data.email || '',
              phone: data.phone,
              profilePhotoLarge: data.profilePhotoLarge,
              profilePhotoSmall: data.profilePhotoSmall,
              // Education
              educationDegree: data.educationDegree,
              educationMajor: data.educationMajor,
              educationMinor: data.educationMinor,
              educationInstitution: data.educationInstitution,
              // Certifications
              fitnessCertifications: data.fitnessCertifications,
              nutritionCertifications: data.nutritionCertifications,
              specialtyCertifications: data.specialtyCertifications,
              fitnessCertificationUrls: data.fitnessCertificationUrls || [],
              nutritionCertificationUrls: data.nutritionCertificationUrls || [],
              specialtyCertificationUrls: data.specialtyCertificationUrls || [],
              // Experience
              yearsExperience: data.yearsExperience,
              specializations: data.specializations,
              // Philosophy
              trainingPhilosophy: data.trainingPhilosophy,
              areasOfExpertise: data.areasOfExpertise,
              // Social Media
              linkedinUrl: data.linkedinUrl,
              youtubeUrl: data.youtubeUrl,
              instagramUrl: data.instagramUrl,
              facebookUrl: data.facebookUrl,
              // Legacy
              professionalTitle: data.professionalTitle,
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

  // Helper function to render certification badges
  const renderCertificationBadges = (
    certificationsText: string,
    urls: string[],
    colorClass: string
  ) => {
    // Parse certifications by comma, semicolon, or pipe
    const certs = certificationsText
      .split(/[,;|]/)
      .map(cert => cert.trim())
      .filter(cert => cert.length > 0);

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {certs.map((cert, index) => {
          const url = urls[index];
          const BadgeContent = (
            <>
              <span className="font-medium">{cert}</span>
              {url && <ExternalLink className="h-3 w-3 ml-1" />}
            </>
          );

          if (url) {
            return (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm ${colorClass} hover:opacity-80 transition-opacity cursor-pointer shadow-sm`}
              >
                {BadgeContent}
              </a>
            );
          }

          return (
            <span
              key={index}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm ${colorClass} shadow-sm`}
            >
              {BadgeContent}
            </span>
          );
        })}
      </div>
    );
  };

  if (loading || authLoading) {
    return (
      <div className="client-surface flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!trainerData) {
    return (
      <ClientPageShell>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <User className="h-16 w-16 text-gray-400 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Trainer Assigned</h3>
            <p className="text-gray-600 mb-4">You don&apos;t have a trainer assigned yet.</p>
            <Button onClick={() => router.push('/dashboard/client')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </ClientPageShell>
    );
  }

  return (
    <ClientPageShell>
      <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Your Trainer</h1>
              <p className="text-muted-foreground mt-2">
                Get to know your personal trainer
              </p>
            </div>

            {/* Hero Section - Trainer Profile Card */}
            <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50 overflow-hidden p-0">
              <CardContent className="bg-gradient-to-r from-primary/10 via-blue-50 to-primary/5 p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  {/* Profile Photo & Social Links */}
                  <div className="flex flex-col items-center gap-3">
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
                    </div>
                    
                    {/* Social Media Icons */}
                    {(trainerData.linkedinUrl || trainerData.facebookUrl || trainerData.youtubeUrl || trainerData.instagramUrl) && (
                      <div className="flex items-center gap-2">
                        {trainerData.linkedinUrl && (
                          <a
                            href={trainerData.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow hover:bg-blue-50"
                            aria-label="LinkedIn"
                          >
                            <Linkedin className="h-5 w-5 text-blue-600" />
                          </a>
                        )}
                        {trainerData.facebookUrl && (
                          <a
                            href={trainerData.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow hover:bg-blue-50"
                            aria-label="Facebook"
                          >
                            <Facebook className="h-5 w-5 text-blue-700" />
                          </a>
                        )}
                        {trainerData.youtubeUrl && (
                          <a
                            href={trainerData.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow hover:bg-red-50"
                            aria-label="YouTube"
                          >
                            <Youtube className="h-5 w-5 text-red-600" />
                          </a>
                        )}
                        {trainerData.instagramUrl && (
                          <a
                            href={trainerData.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow hover:bg-pink-50"
                            aria-label="Instagram"
                          >
                            <Instagram className="h-5 w-5 text-pink-600" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Trainer Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                      {trainerData.name}
                    </h2>
                    {trainerData.fitnessCertifications && (
                      <p className="text-lg text-primary font-medium mb-3">
                        {trainerData.fitnessCertifications}
                      </p>
                    )}
                    {trainerData.yearsExperience && (
                      <div className="flex items-center gap-2 text-muted-foreground justify-center md:justify-start mb-2">
                        <Award className="h-5 w-5 text-primary" />
                        <span className="font-medium">
                          {trainerData.yearsExperience}+ Years of Experience
                        </span>
                      </div>
                    )}
                    {trainerData.specializations && (
                      <p className="text-sm text-muted-foreground mb-4">
                        Specializing in: {trainerData.specializations}
                      </p>
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
              </CardContent>
            </Card>

            {/* Education & Credentials */}
            {(trainerData.educationDegree || trainerData.fitnessCertifications || trainerData.nutritionCertifications || trainerData.specialtyCertifications) && (
              <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Education & Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trainerData.educationDegree && trainerData.educationMajor && trainerData.educationInstitution && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Education</h4>
                      <p className="text-base">
                        {trainerData.educationDegree} {trainerData.educationMajor}
                        {trainerData.educationMinor && ` (Minor: ${trainerData.educationMinor})`}
                      </p>
                      <p className="text-sm text-muted-foreground">{trainerData.educationInstitution}</p>
                    </div>
                  )}
                  
                  {(trainerData.fitnessCertifications || trainerData.nutritionCertifications || trainerData.specialtyCertifications) && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Certifications</h4>
                      <div className="space-y-4">
                        {trainerData.fitnessCertifications && (
                          <div>
                            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-1.5">
                              💪 Fitness Certifications
                            </p>
                            {renderCertificationBadges(
                              trainerData.fitnessCertifications,
                              trainerData.fitnessCertificationUrls || [],
                              'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            )}
                          </div>
                        )}
                        {trainerData.nutritionCertifications && (
                          <div>
                            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1.5">
                              🥗 Nutrition Certifications
                            </p>
                            {renderCertificationBadges(
                              trainerData.nutritionCertifications,
                              trainerData.nutritionCertificationUrls || [],
                              'bg-blue-100 text-blue-800 border border-blue-200'
                            )}
                          </div>
                        )}
                        {trainerData.specialtyCertifications && (
                          <div>
                            <p className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-1.5">
                              ⭐ Specialty Certifications
                            </p>
                            {renderCertificationBadges(
                              trainerData.specialtyCertifications,
                              trainerData.specialtyCertificationUrls || [],
                              'bg-purple-100 text-purple-800 border border-purple-200'
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Training Philosophy & Expertise */}
            {(trainerData.trainingPhilosophy || trainerData.areasOfExpertise) && (
              <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Training Approach
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trainerData.trainingPhilosophy && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Coaching Philosophy</h4>
                      <p className="text-base text-foreground leading-relaxed">
                        {trainerData.trainingPhilosophy}
                      </p>
                    </div>
                  )}
                  {trainerData.areasOfExpertise && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-foreground mb-2">Areas of Expertise</h4>
                      <p className="text-base text-foreground leading-relaxed">
                        {trainerData.areasOfExpertise}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
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
                  <div className="flex justify-center md:justify-start">
                    <Button
                      onClick={() => router.push('/dashboard/client/messages')}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open Coach Chat
                    </Button>
                  </div>
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

      </div>
    </ClientPageShell>
  );
}
