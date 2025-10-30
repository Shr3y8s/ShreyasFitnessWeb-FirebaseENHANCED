'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db, auth } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, MapPin, Bell, Phone, Shield, AlertTriangle, Camera, Loader2 } from 'lucide-react';
import { ImageCropModal } from '@/components/profile/ImageCropModal';
import { AddressAutocomplete } from '@/components/profile/AddressAutocomplete';
import { processAndUploadProfilePhoto } from '@/lib/imageUtils';

export default function ProfilePage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Local state for immediate photo display
  const [currentPhotoLarge, setCurrentPhotoLarge] = useState<string | null>(null);
  
  // Personal Information edit state
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPreferredName, setEditedPreferredName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedDateOfBirth, setEditedDateOfBirth] = useState('');
  const [editedGender, setEditedGender] = useState('');
  const [savingPersonal, setSavingPersonal] = useState(false);
  
  // Local state for immediate display after save
  const [currentPersonalInfo, setCurrentPersonalInfo] = useState<{
    name?: string;
    preferredName?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
  } | null>(null);

  // Location edit state
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedStreet, setEditedStreet] = useState('');
  const [editedCity, setEditedCity] = useState('');
  const [editedState, setEditedState] = useState('');
  const [editedCountry, setEditedCountry] = useState('');
  const [editedZipCode, setEditedZipCode] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  // Local state for immediate location display
  const [currentLocationInfo, setCurrentLocationInfo] = useState<{
    street?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zipCode?: string | null;
  } | null>(null);

  // Emergency Contact edit state
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [editedEmergencyName, setEditedEmergencyName] = useState('');
  const [editedEmergencyPhone, setEditedEmergencyPhone] = useState('');
  const [editedEmergencyRelationship, setEditedEmergencyRelationship] = useState('');
  const [editedEmergencyMedicalNotes, setEditedEmergencyMedicalNotes] = useState('');
  const [savingEmergency, setSavingEmergency] = useState(false);

  // Local state for immediate emergency contact display
  const [currentEmergencyInfo, setCurrentEmergencyInfo] = useState<{
    name?: string | null;
    phone?: string | null;
    relationship?: string | null;
    medicalNotes?: string | null;
  } | null>(null);

  // Contact Preferences edit state
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [editedWorkoutReminders, setEditedWorkoutReminders] = useState(true);
  const [editedNewAssignments, setEditedNewAssignments] = useState(true);
  const [editedProgressUpdates, setEditedProgressUpdates] = useState(true);
  const [editedTrainerMessages, setEditedTrainerMessages] = useState(true);
  const [editedMarketing, setEditedMarketing] = useState(false);
  const [editedFrequency, setEditedFrequency] = useState('real-time');
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Local state for immediate preferences display
  const [currentPreferences, setCurrentPreferences] = useState<{
    workoutReminders?: boolean;
    newAssignments?: boolean;
    progressUpdates?: boolean;
    trainerMessages?: boolean;
    marketing?: boolean;
    frequency?: string;
  } | null>(null);

  // Security Settings edit state
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Account & Data Management state
  const [downloadingData, setDownloadingData] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userData) {
      console.log('[Profile] No user data, redirecting to login');
      router.push('/login');
      return;
    }

    // CRITICAL: Only clients should access profile
    if (userData.role !== 'client') {
      console.log('[Profile] User is not a client, redirecting');
      if (userData.role === 'trainer' || userData.role === 'admin') {
        router.push('/dashboard/trainer');
      } else {
        router.push('/dashboard');
      }
      return;
    }

    // CRITICAL: Check payment status
    if (userData.paymentStatus !== 'active') {
      console.log('[Profile] Payment not complete, redirecting to payment');
      router.push('/payment');
      return;
    }

    setLoading(false);
  }, [userData, authLoading, router]);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getTierDisplayName = (tier?: string) => {
    if (!tier) return 'Client';
    
    switch (tier) {
      case 'in-person-training':
      case '4-pack-training':
        return 'In-Person Training';
      case 'online-coaching':
        return 'Online Coaching';
      case 'complete-transformation':
        return 'Complete Transformation';
      default:
        return 'Client';
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB');
      return;
    }

    // Read file and show crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedArea: any) => {
    setCroppedAreaPixels(croppedArea);
    handleUpload();
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;

    setUploading(true);
    try {
      // Process and upload photo
      const { small, large } = await processAndUploadProfilePhoto(
        user.uid,
        imageSrc,
        croppedAreaPixels
      );

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        profilePhotoSmall: small,
        profilePhotoLarge: large,
      });

      // Update local state immediately for instant display
      setCurrentPhotoLarge(large);

      alert('Profile photo updated successfully!');

      // Close modal
      setImageSrc(null);
      setCroppedAreaPixels(null);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelCrop = () => {
    setImageSrc(null);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditPersonal = () => {
    // Load current values into edit state
    setEditedName(userData?.name || '');
    setEditedPreferredName(userData?.preferredName || '');
    setEditedPhone(userData?.phone || '');
    setEditedDateOfBirth(userData?.dateOfBirth || '');
    setEditedGender(userData?.gender || '');
    setIsEditingPersonal(true);
  };

  const handleCancelPersonal = () => {
    setIsEditingPersonal(false);
    // Clear edit state
    setEditedName('');
    setEditedPreferredName('');
    setEditedPhone('');
    setEditedDateOfBirth('');
    setEditedGender('');
  };

  const handleSavePersonal = async () => {
    if (!user) return;

    // Validate required fields
    if (!editedName.trim()) {
      alert('Name is required');
      return;
    }

    setSavingPersonal(true);
    try {
      const updatedData = {
        name: editedName.trim(),
        preferredName: editedPreferredName.trim() || null,
        phone: editedPhone.trim() || null,
        dateOfBirth: editedDateOfBirth || null,
        gender: editedGender || null,
      };

      await updateDoc(doc(db, 'users', user.uid), updatedData);

      // Update local state immediately for instant display
      setCurrentPersonalInfo(updatedData);

      alert('Personal information updated successfully!');
      setIsEditingPersonal(false);
    } catch (error) {
      console.error('Error updating personal information:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleEditLocation = () => {
    // Load current values from nested address object
    setEditedStreet(userData?.address?.street || '');
    setEditedCity(userData?.address?.city || '');
    setEditedState(userData?.address?.state || '');
    setEditedCountry(userData?.address?.country || '');
    setEditedZipCode(userData?.address?.zipCode || '');
    setIsEditingLocation(true);
  };

  const handleAddressSelect = (addressData: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  }) => {
    // Auto-populate fields from autocomplete
    setEditedStreet(addressData.street);
    setEditedCity(addressData.city);
    setEditedState(addressData.state);
    setEditedCountry(addressData.country);
    setEditedZipCode(addressData.zipCode);
  };

  const handleCancelLocation = () => {
    setIsEditingLocation(false);
    // Clear edit state
    setEditedStreet('');
    setEditedCity('');
    setEditedState('');
    setEditedCountry('');
    setEditedZipCode('');
  };

  const handleSaveLocation = async () => {
    if (!user) return;

    setSavingLocation(true);
    try {
      const updatedData = {
        street: editedStreet.trim() || null,
        city: editedCity.trim() || null,
        state: editedState || null,
        country: editedCountry || null,
        zipCode: editedZipCode.trim() || null,
      };

      // Store in nested address object
      await updateDoc(doc(db, 'users', user.uid), {
        address: updatedData,
      });

      // Update local state immediately for instant display
      setCurrentLocationInfo(updatedData);

      alert('Location information updated successfully!');
      setIsEditingLocation(false);
    } catch (error) {
      console.error('Error updating location information:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleEditEmergency = () => {
    // Load current values from nested emergencyContact object
    setEditedEmergencyName(userData?.emergencyContact?.name || '');
    setEditedEmergencyPhone(userData?.emergencyContact?.phone || '');
    setEditedEmergencyRelationship(userData?.emergencyContact?.relationship || '');
    setEditedEmergencyMedicalNotes(userData?.emergencyContact?.medicalNotes || '');
    setIsEditingEmergency(true);
  };

  const handleCancelEmergency = () => {
    setIsEditingEmergency(false);
    // Clear edit state
    setEditedEmergencyName('');
    setEditedEmergencyPhone('');
    setEditedEmergencyRelationship('');
    setEditedEmergencyMedicalNotes('');
  };

  const handleSaveEmergency = async () => {
    if (!user) return;

    setSavingEmergency(true);
    try {
      const updatedData = {
        name: editedEmergencyName.trim() || null,
        phone: editedEmergencyPhone.trim() || null,
        relationship: editedEmergencyRelationship.trim() || null,
        medicalNotes: editedEmergencyMedicalNotes.trim() || null,
      };

      // Store in nested emergencyContact object
      await updateDoc(doc(db, 'users', user.uid), {
        emergencyContact: updatedData,
      });

      // Update local state immediately for instant display
      setCurrentEmergencyInfo(updatedData);

      alert('Emergency contact information updated successfully!');
      setIsEditingEmergency(false);
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSavingEmergency(false);
    }
  };

  const handleEditPreferences = () => {
    // Load current values from nested notificationPreferences object
    setEditedWorkoutReminders(userData?.notificationPreferences?.workoutReminders ?? true);
    setEditedNewAssignments(userData?.notificationPreferences?.newAssignments ?? true);
    setEditedProgressUpdates(userData?.notificationPreferences?.progressUpdates ?? true);
    setEditedTrainerMessages(userData?.notificationPreferences?.trainerMessages ?? true);
    setEditedMarketing(userData?.notificationPreferences?.marketing ?? false);
    setEditedFrequency(userData?.notificationPreferences?.frequency || 'real-time');
    setIsEditingPreferences(true);
  };

  const handleCancelPreferences = () => {
    setIsEditingPreferences(false);
    // Clear edit state
    setEditedWorkoutReminders(true);
    setEditedNewAssignments(true);
    setEditedProgressUpdates(true);
    setEditedTrainerMessages(true);
    setEditedMarketing(false);
    setEditedFrequency('real-time');
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setSavingPreferences(true);
    try {
      const updatedData = {
        workoutReminders: editedWorkoutReminders,
        newAssignments: editedNewAssignments,
        progressUpdates: editedProgressUpdates,
        trainerMessages: editedTrainerMessages,
        marketing: editedMarketing,
        frequency: editedFrequency,
      };

      // Store in nested notificationPreferences object
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPreferences: updatedData,
      });

      // Update local state immediately for instant display
      setCurrentPreferences(updatedData);

      alert('Contact preferences updated successfully!');
      setIsEditingPreferences(false);
    } catch (error) {
      console.error('Error updating contact preferences:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleEditSecurity = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setIsEditingSecurity(true);
  };

  const handleCancelSecurity = () => {
    setIsEditingSecurity(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;

    // Clear previous errors
    setPasswordError('');

    // Validate passwords
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setSavingSecurity(true);
    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      alert('Password updated successfully!');
      setIsEditingSecurity(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      
      // Handle specific error codes
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/too-many-requests') {
        setPasswordError('Too many attempts. Please try again later');
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordError('Please log out and log back in, then try again');
      } else {
        setPasswordError('Failed to update password. Please try again');
      }
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleDownloadData = async () => {
    if (!user || !userData) return;

    setDownloadingData(true);
    try {
      // Compile all user data
      const exportData = {
        exportDate: new Date().toISOString(),
        profile: {
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          dateOfBirth: userData.dateOfBirth,
          gender: userData.gender,
          tier: userData.tier,
          createdAt: userData.createdAt,
        },
        address: userData.address || {},
        emergencyContact: userData.emergencyContact || {},
        notificationPreferences: userData.notificationPreferences || {},
        subscription: {
          tier: userData.tier,
          paymentStatus: userData.paymentStatus,
        },
      };

      // Create JSON blob
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      // Create download link
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('Your data has been downloaded successfully!');
    } catch (error) {
      console.error('Error downloading data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setDownloadingData(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Account Profile</h1>
              <p className="text-muted-foreground mt-2">
                Manage your personal information and account settings
              </p>
            </div>

            {/* Profile Header Card */}
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-6">
                  {/* Profile Photo */}
                  <div className="relative group">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div
                      onClick={handlePhotoClick}
                      className="w-24 h-24 rounded-full overflow-hidden cursor-pointer shadow-lg relative"
                    >
                      {(currentPhotoLarge || userData?.profilePhotoLarge) ? (
                        <img
                          src={currentPhotoLarge || userData?.profilePhotoLarge || ''}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-3xl font-bold">
                          {userData?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-foreground">{userData?.name || 'User'}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                        {getTierDisplayName(userData?.tier)}
                      </span>
                      {userData?.emailVerified && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Member since {userData?.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'recently'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  {!isEditingPersonal && (
                    <button
                      onClick={handleEditPersonal}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingPersonal ? (
                  <>
                    {/* Edit Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Preferred Name
                        </label>
                        <input
                          type="text"
                          value={editedPreferredName}
                          onChange={(e) => setEditedPreferredName(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Johnny"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Email (Read-only)
                        </label>
                        <input
                          type="email"
                          value={userData?.email || ''}
                          disabled
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Contact support to change email</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={editedPhone}
                          onChange={(e) => setEditedPhone(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={editedDateOfBirth}
                          onChange={(e) => setEditedDateOfBirth(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Gender
                        </label>
                        <select
                          value={editedGender}
                          onChange={(e) => setEditedGender(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select...</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={handleCancelPersonal}
                        disabled={savingPersonal}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePersonal}
                        disabled={savingPersonal}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingPersonal && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingPersonal ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                        <p className="text-base font-medium">{currentPersonalInfo?.name || userData?.name || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Preferred Name</label>
                        <p className="text-base font-medium">{currentPersonalInfo?.preferredName || userData?.preferredName || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-base font-medium">{userData?.email || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                        <p className="text-base font-medium">{currentPersonalInfo?.phone || userData?.phone || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                        <p className="text-base font-medium">
                          {(currentPersonalInfo?.dateOfBirth || userData?.dateOfBirth)
                            ? new Date(currentPersonalInfo?.dateOfBirth || userData?.dateOfBirth || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                            : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Gender</label>
                        <p className="text-base font-medium capitalize">
                          {(currentPersonalInfo?.gender || userData?.gender)?.replace('-', ' ') || 'Not set'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Location Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Location
                  </CardTitle>
                  {!isEditingLocation && (
                    <button
                      onClick={handleEditLocation}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingLocation ? (
                  <>
                    {/* Edit Mode */}
                    <div className="space-y-4">
                      {/* Address Autocomplete */}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          Search for your address
                        </label>
                        <AddressAutocomplete onAddressSelect={handleAddressSelect} />
                        <p className="text-xs text-muted-foreground mt-1">
                          Start typing to get address suggestions from Google
                        </p>
                      </div>

                      {/* Manual Edit Fields (auto-filled by autocomplete) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">
                            Street Address
                          </label>
                          <input
                            type="text"
                            value={editedStreet}
                            onChange={(e) => setEditedStreet(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="1600 Pennsylvania Avenue NW"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            City
                          </label>
                          <input
                            type="text"
                            value={editedCity}
                            onChange={(e) => setEditedCity(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="San Francisco"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            State/Province (Code)
                          </label>
                          <input
                            type="text"
                            value={editedState}
                            onChange={(e) => setEditedState(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="CA"
                          />
                          <p className="text-xs text-muted-foreground mt-1">2-letter code (e.g., CA, NY)</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Country (Code)
                          </label>
                          <input
                            type="text"
                            value={editedCountry}
                            onChange={(e) => setEditedCountry(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="US"
                          />
                          <p className="text-xs text-muted-foreground mt-1">2-letter code (e.g., US, UK)</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Zip/Postal Code
                          </label>
                          <input
                            type="text"
                            value={editedZipCode}
                            onChange={(e) => setEditedZipCode(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="94102"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={handleCancelLocation}
                        disabled={savingLocation}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveLocation}
                        disabled={savingLocation}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingLocation && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingLocation ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-muted-foreground">Street Address</label>
                        <p className="text-base font-medium">{currentLocationInfo?.street || userData?.address?.street || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">City</label>
                        <p className="text-base font-medium">{currentLocationInfo?.city || userData?.address?.city || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">State/Province</label>
                        <p className="text-base font-medium">{currentLocationInfo?.state || userData?.address?.state || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Country</label>
                        <p className="text-base font-medium">{currentLocationInfo?.country || userData?.address?.country || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Zip/Postal Code</label>
                        <p className="text-base font-medium">{currentLocationInfo?.zipCode || userData?.address?.zipCode || 'Not set'}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contact Preferences Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Contact Preferences
                  </CardTitle>
                  {!isEditingPreferences && (
                    <button
                      onClick={handleEditPreferences}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditingPreferences ? (
                  <>
                    {/* Edit Mode */}
                    <div className="space-y-6">
                      {/* Email Notifications */}
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Email Notifications</h3>
                        <div className="space-y-3">
                          {/* Workout Reminders */}
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={editedWorkoutReminders}
                              onChange={(e) => setEditedWorkoutReminders(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                Workout Reminders
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Get notified about upcoming workouts and scheduled sessions
                              </div>
                            </div>
                          </label>

                          {/* New Assignments */}
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={editedNewAssignments}
                              onChange={(e) => setEditedNewAssignments(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                New Workout Assignments
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Receive alerts when your trainer assigns new workouts
                              </div>
                            </div>
                          </label>

                          {/* Progress Updates */}
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={editedProgressUpdates}
                              onChange={(e) => setEditedProgressUpdates(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                Progress Updates
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Get notified about milestones, achievements, and progress reports
                              </div>
                            </div>
                          </label>

                          {/* Trainer Messages */}
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={editedTrainerMessages}
                              onChange={(e) => setEditedTrainerMessages(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                Trainer Messages
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Receive notifications when your trainer sends you messages
                              </div>
                            </div>
                          </label>

                          {/* Marketing */}
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={editedMarketing}
                              onChange={(e) => setEditedMarketing(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                Marketing & Promotions
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Receive newsletters, fitness tips, and special offers
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Notification Frequency */}
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Notification Frequency</h3>
                        <div className="space-y-3">
                          {/* Real-time */}
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="frequency"
                              value="real-time"
                              checked={editedFrequency === 'real-time'}
                              onChange={(e) => setEditedFrequency(e.target.value)}
                              className="mt-1 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                Real-time
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Receive notifications immediately as they happen
                              </div>
                            </div>
                          </label>

                          {/* Daily Digest - Disabled */}
                          <label className="flex items-start gap-3 opacity-50 cursor-not-allowed">
                            <input
                              type="radio"
                              name="frequency"
                              value="daily"
                              disabled
                              className="mt-1 h-4 w-4 border-gray-300"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-500 flex items-center gap-2">
                                Daily Digest
                                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-normal">
                                  Coming Soon
                                </span>
                              </div>
                              <div className="text-sm text-gray-400">
                                Receive a summary email once per day
                              </div>
                            </div>
                          </label>

                          {/* Weekly Digest - Disabled */}
                          <label className="flex items-start gap-3 opacity-50 cursor-not-allowed">
                            <input
                              type="radio"
                              name="frequency"
                              value="weekly"
                              disabled
                              className="mt-1 h-4 w-4 border-gray-300"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-500 flex items-center gap-2">
                                Weekly Digest
                                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-normal">
                                  Coming Soon
                                </span>
                              </div>
                              <div className="text-sm text-gray-400">
                                Receive a summary email once per week
                              </div>
                            </div>
                          </label>

                          {/* Off */}
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name="frequency"
                              value="off"
                              checked={editedFrequency === 'off'}
                              onChange={(e) => setEditedFrequency(e.target.value)}
                              className="mt-1 h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                                Off
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Pause all email notifications
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Info Banner */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex gap-2">
                          <Bell className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <strong>Note:</strong> Email notifications require email service integration (Phase 2). 
                            Your preferences are saved and will be applied once email notifications are enabled.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={handleCancelPreferences}
                        disabled={savingPreferences}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePreferences}
                        disabled={savingPreferences}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingPreferences && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingPreferences ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="space-y-6">
                      {/* Email Notifications Summary */}
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Email Notifications</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center ${
                              (currentPreferences?.workoutReminders ?? userData?.notificationPreferences?.workoutReminders ?? true)
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              {(currentPreferences?.workoutReminders ?? userData?.notificationPreferences?.workoutReminders ?? true) ? '✓' : '✗'}
                            </div>
                            <span className="text-sm">Workout Reminders</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center ${
                              (currentPreferences?.newAssignments ?? userData?.notificationPreferences?.newAssignments ?? true)
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              {(currentPreferences?.newAssignments ?? userData?.notificationPreferences?.newAssignments ?? true) ? '✓' : '✗'}
                            </div>
                            <span className="text-sm">New Assignments</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center ${
                              (currentPreferences?.progressUpdates ?? userData?.notificationPreferences?.progressUpdates ?? true)
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              {(currentPreferences?.progressUpdates ?? userData?.notificationPreferences?.progressUpdates ?? true) ? '✓' : '✗'}
                            </div>
                            <span className="text-sm">Progress Updates</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center ${
                              (currentPreferences?.trainerMessages ?? userData?.notificationPreferences?.trainerMessages ?? true)
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              {(currentPreferences?.trainerMessages ?? userData?.notificationPreferences?.trainerMessages ?? true) ? '✓' : '✗'}
                            </div>
                            <span className="text-sm">Trainer Messages</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center ${
                              (currentPreferences?.marketing ?? userData?.notificationPreferences?.marketing ?? false)
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              {(currentPreferences?.marketing ?? userData?.notificationPreferences?.marketing ?? false) ? '✓' : '✗'}
                            </div>
                            <span className="text-sm">Marketing & Promotions</span>
                          </div>
                        </div>
                      </div>

                      {/* Frequency Display */}
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Notification Frequency</h3>
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                          <span className="text-sm font-medium capitalize">
                            {(currentPreferences?.frequency || userData?.notificationPreferences?.frequency || 'real-time').replace('-', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Info Banner - Email service not set up */}
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex gap-2">
                          <Bell className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-amber-800">
                            <strong>Status:</strong> Email notifications are not yet configured. 
                            Your preferences are saved and will be applied once the email service is set up (Phase 2).
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Emergency Contact
                  </CardTitle>
                  {!isEditingEmergency && (
                    <button
                      onClick={handleEditEmergency}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingEmergency ? (
                  <>
                    {/* Edit Mode */}
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        This information will be used in case of an emergency during training sessions.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Emergency Contact Name
                          </label>
                          <input
                            type="text"
                            value={editedEmergencyName}
                            onChange={(e) => setEditedEmergencyName(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Jane Doe"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Emergency Contact Phone
                          </label>
                          <input
                            type="tel"
                            value={editedEmergencyPhone}
                            onChange={(e) => setEditedEmergencyPhone(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="(555) 987-6543"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Relationship
                          </label>
                          <select
                            value={editedEmergencyRelationship}
                            onChange={(e) => setEditedEmergencyRelationship(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select...</option>
                            <option value="spouse">Spouse</option>
                            <option value="partner">Partner</option>
                            <option value="parent">Parent</option>
                            <option value="sibling">Sibling</option>
                            <option value="child">Child</option>
                            <option value="friend">Friend</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">
                            Medical Notes (Optional)
                          </label>
                          <textarea
                            value={editedEmergencyMedicalNotes}
                            onChange={(e) => setEditedEmergencyMedicalNotes(e.target.value)}
                            rows={3}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            placeholder="Allergies, medical conditions, medications, or other important health information..."
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Any relevant medical information your trainer should know
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={handleCancelEmergency}
                        disabled={savingEmergency}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEmergency}
                        disabled={savingEmergency}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingEmergency && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingEmergency ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                          <p className="text-base font-medium">
                            {currentEmergencyInfo?.name || userData?.emergencyContact?.name || 'Not set'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Contact Phone</label>
                          <p className="text-base font-medium">
                            {currentEmergencyInfo?.phone || userData?.emergencyContact?.phone || 'Not set'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                          <p className="text-base font-medium capitalize">
                            {currentEmergencyInfo?.relationship || userData?.emergencyContact?.relationship || 'Not set'}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Medical Notes</label>
                          <p className="text-base">
                            {currentEmergencyInfo?.medicalNotes || userData?.emergencyContact?.medicalNotes || 'None provided'}
                          </p>
                        </div>
                      </div>
                      {(!currentEmergencyInfo?.name && !userData?.emergencyContact?.name) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-sm text-amber-800">
                            <strong>Recommendation:</strong> Please add emergency contact information for safety during training sessions.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Security
                  </CardTitle>
                  {!isEditingSecurity && (
                    <button
                      onClick={handleEditSecurity}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Change Password
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditingSecurity ? (
                  <>
                    {/* Edit Mode - Password Change */}
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Enter your current password and choose a new password for your account.
                      </p>
                      
                      {/* Error Message */}
                      {passwordError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-800">{passwordError}</p>
                        </div>
                      )}

                      <div className="space-y-4 max-w-md">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Current Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter current password"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            New Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter new password (min 6 characters)"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Confirm New Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={handleCancelSecurity}
                        disabled={savingSecurity}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleChangePassword}
                        disabled={savingSecurity}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingSecurity && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingSecurity ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="space-y-6">
                      {/* Password Section */}
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Password</h3>
                        <p className="text-sm text-muted-foreground">
                          Last changed: Never (or recently if you just changed it)
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click "Change Password" above to update your password
                        </p>
                      </div>

                      {/* Coming Soon Features */}
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Additional Security (Coming Soon)</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-4 h-4 rounded flex items-center justify-center bg-gray-100 text-gray-400">✗</div>
                            <span>Two-Factor Authentication</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-4 h-4 rounded flex items-center justify-center bg-gray-100 text-gray-400">✗</div>
                            <span>Active Sessions Management</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-4 h-4 rounded flex items-center justify-center bg-gray-100 text-gray-400">✗</div>
                            <span>Login History</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-4 h-4 rounded flex items-center justify-center bg-gray-100 text-gray-400">✗</div>
                            <span>Security Alerts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Account & Data Management */}
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                  Account & Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Download My Data */}
                <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Download My Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Export all your personal data in JSON format (GDPR compliant)
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadData}
                    disabled={downloadingData}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 ml-4"
                  >
                    {downloadingData && <Loader2 className="w-4 h-4 animate-spin" />}
                    {downloadingData ? 'Downloading...' : 'Download'}
                  </button>
                </div>

                {/* Subscription Management - Coming Soon */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Subscription Management</h3>
                  
                  {/* Pause Subscription */}
                  <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg opacity-60">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">Pause Subscription</h4>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Coming Soon</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Temporarily pause billing for 1-3 months (vacation, medical, etc.)
                      </p>
                    </div>
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed ml-4"
                    >
                      Pause
                    </button>
                  </div>

                  {/* Cancel Subscription */}
                  <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg opacity-60">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">Cancel Subscription</h4>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Coming Soon</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Stop billing but keep account and data (access until period end)
                      </p>
                    </div>
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed ml-4"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Delete Account */}
                  <div className="flex items-start justify-between p-4 border border-red-200 rounded-lg opacity-60">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-red-600">Delete Account</h4>
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Coming Soon</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete all data (cannot be undone, no refunds)
                      </p>
                    </div>
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed ml-4"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Subscription management features (Pause, Cancel, Delete) require Stripe integration and will be implemented in Phase 2. 
                    Your "Download My Data" feature is fully functional now.
                  </p>
                </div>

                {/* Refund Policy Link */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Refund Policy:</strong> All sales are final. No refunds for cancelled subscriptions or unused sessions. 
                    Case-by-case exceptions for medical emergencies and billing errors.{' '}
                    <a href="/legal/terms" target="_blank" className="text-primary hover:underline">
                      View full Terms of Service →
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </SidebarInset>

      {/* Image Crop Modal */}
      {imageSrc && !uploading && (
        <ImageCropModal
          imageSrc={imageSrc}
          onComplete={handleCropComplete}
          onCancel={handleCancelCrop}
        />
      )}
    </SidebarProvider>
  );
}
