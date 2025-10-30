'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
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
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Contact Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground italic">Notification settings - Coming soon</p>
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
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground italic">Password and security settings - Coming soon</p>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Account deactivation and data download options - Coming soon</p>
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
