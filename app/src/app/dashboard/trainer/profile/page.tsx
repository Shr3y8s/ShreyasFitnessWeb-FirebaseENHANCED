'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db, auth } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Shield, Camera, Loader2, Briefcase } from 'lucide-react';
import { ImageCropModal } from '@/components/profile/ImageCropModal';
import { processAndUploadProfilePhoto } from '@/lib/imageUtils';
import { validateAndFormatPhone, formatPhoneForDisplay } from '@/lib/phoneUtils';

export default function TrainerProfilePage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, updateUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Personal Information edit state
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedPhoneError, setEditedPhoneError] = useState<string | null>(null);
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Professional Profile edit state
  const [isEditingProfessional, setIsEditingProfessional] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [editedProfessionalTitle, setEditedProfessionalTitle] = useState('');
  const [editedYearsExperience, setEditedYearsExperience] = useState('');
  const [savingProfessional, setSavingProfessional] = useState(false);

  // Security Settings edit state
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!userData) {
      console.log('[TrainerProfile] No user data, redirecting to login');
      router.push('/login');
      return;
    }

    // Only admins and trainers should access this page
    if (userData.role !== 'admin' && userData.role !== 'trainer') {
      console.log('[TrainerProfile] User is not admin/trainer, redirecting');
      router.push('/dashboard');
      return;
    }

    setLoading(false);
  }, [userData, authLoading, router]);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedArea: any) => {
    setCroppedAreaPixels(croppedArea);
    handleUpload(croppedArea);
  };

  const handleUpload = async (cropArea?: any) => {
    const pixels = cropArea || croppedAreaPixels;
    if (!imageSrc || !pixels || !user) return;

    setUploading(true);
    try {
      // Note: Photos stored in profile-photos/{uid}/ - same path structure for admins
      const { small, large } = await processAndUploadProfilePhoto(
        user.uid,
        imageSrc,
        pixels
      );

      await updateDoc(doc(db, 'admins', user.uid), {
        profilePhotoSmall: small,
        profilePhotoLarge: large,
      });

      updateUserData({
        profilePhotoSmall: small,
        profilePhotoLarge: large,
      });

      alert('Profile photo updated successfully!');
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
    setEditedName(userData?.name || '');
    const formattedPhone = formatPhoneForDisplay(userData?.phone || '') || '';
    setEditedPhone(formattedPhone);
    setIsEditingPersonal(true);
  };

  const handleCancelPersonal = () => {
    setIsEditingPersonal(false);
    setEditedName('');
    setEditedPhone('');
    setEditedPhoneError(null);
  };

  const handlePersonalPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedPhone(e.target.value);
    if (editedPhoneError) setEditedPhoneError(null);
  };

  const handlePersonalPhoneBlur = () => {
    if (!editedPhone.trim()) {
      setEditedPhoneError(null);
      return;
    }

    const validation = validateAndFormatPhone(editedPhone);
    if (!validation.isValid) {
      setEditedPhoneError(validation.errorMessage || 'Invalid phone number');
    } else {
      setEditedPhoneError(null);
      setEditedPhone(validation.formatted);
    }
  };

  const handleSavePersonal = async () => {
    if (!user) return;

    if (!editedName.trim()) {
      alert('Name is required');
      return;
    }

    if (editedPhone.trim()) {
      const phoneValidation = validateAndFormatPhone(editedPhone);
      if (!phoneValidation.isValid) {
        setEditedPhoneError(phoneValidation.errorMessage || 'Invalid phone number');
        return;
      }
    }

    setSavingPersonal(true);
    try {
      const phoneValidation = validateAndFormatPhone(editedPhone);
      const phoneToStore = phoneValidation.isValid ? phoneValidation.e164 : null;

      const updatedData = {
        name: editedName.trim(),
        phone: phoneToStore,
      };

      await updateDoc(doc(db, 'admins', user.uid), updatedData);
      updateUserData(updatedData);

      alert('Personal information updated successfully!');
      setIsEditingPersonal(false);
      setEditedPhoneError(null);
    } catch (error) {
      console.error('Error updating personal information:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleEditProfessional = () => {
    setEditedBio(userData?.bio || '');
    setEditedProfessionalTitle(userData?.professionalTitle || '');
    setEditedYearsExperience(userData?.yearsExperience?.toString() || '');
    setIsEditingProfessional(true);
  };

  const handleCancelProfessional = () => {
    setIsEditingProfessional(false);
    setEditedBio('');
    setEditedProfessionalTitle('');
    setEditedYearsExperience('');
  };

  const handleSaveProfessional = async () => {
    if (!user) return;

    // Validate years of experience if provided
    if (editedYearsExperience && (isNaN(Number(editedYearsExperience)) || Number(editedYearsExperience) < 0)) {
      alert('Please enter a valid number for years of experience');
      return;
    }

    // Validate bio length
    if (editedBio.length > 500) {
      alert('Bio must be 500 characters or less');
      return;
    }

    setSavingProfessional(true);
    try {
      const updatedData = {
        bio: editedBio.trim() || null,
        professionalTitle: editedProfessionalTitle.trim() || null,
        yearsExperience: editedYearsExperience ? Number(editedYearsExperience) : null,
      };

      await updateDoc(doc(db, 'admins', user.uid), updatedData);
      updateUserData(updatedData);

      alert('Professional profile updated successfully!');
      setIsEditingProfessional(false);
    } catch (error) {
      console.error('Error updating professional profile:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSavingProfessional(false);
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

    setPasswordError('');

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
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      alert('Password updated successfully!');
      setIsEditingSecurity(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="profile" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Trainer Profile</h1>
              <p className="text-muted-foreground mt-2">
                Manage your professional profile and account settings
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
                      {userData?.profilePhotoLarge ? (
                        <img
                          src={userData.profilePhotoLarge}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-3xl font-bold">
                          {userData?.name?.charAt(0).toUpperCase() || 'A'}
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
                    <h2 className="text-2xl font-bold text-foreground">{userData?.name || 'Trainer'}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary capitalize">
                        {userData?.role || 'admin'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {userData?.professionalTitle || 'Personal Trainer'}
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
                          Email (Read-only)
                        </label>
                        <input
                          type="email"
                          value={userData?.email || ''}
                          disabled
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={editedPhone}
                          onChange={handlePersonalPhoneChange}
                          onBlur={handlePersonalPhoneBlur}
                          className={`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                            editedPhoneError ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="(555) 123-4567"
                        />
                        {editedPhoneError && (
                          <p className="text-xs text-red-600 mt-1">{editedPhoneError}</p>
                        )}
                      </div>
                    </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <p className="text-base font-medium">{userData?.name || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-base font-medium">{userData?.email || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                      <p className="text-base font-medium">
                        {formatPhoneForDisplay(userData?.phone || '') || 'Not set'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Profile Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Professional Profile
                  </CardTitle>
                  {!isEditingProfessional && (
                    <button
                      onClick={handleEditProfessional}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingProfessional ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Professional Title
                        </label>
                        <input
                          type="text"
                          value={editedProfessionalTitle}
                          onChange={(e) => setEditedProfessionalTitle(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="NASM-CPT, CSCS, Nutrition Specialist"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Years of Experience
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={editedYearsExperience}
                          onChange={(e) => setEditedYearsExperience(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="8"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Professional Bio ({editedBio.length}/500)
                        </label>
                        <textarea
                          value={editedBio}
                          onChange={(e) => setEditedBio(e.target.value)}
                          rows={4}
                          maxLength={500}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          placeholder="NASM-certified trainer with 8 years experience specializing in strength training and athletic performance. Passionate about helping clients achieve sustainable results through science-based programming."
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          A brief description of your expertise and training philosophy (max 500 characters)
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={handleCancelProfessional}
                        disabled={savingProfessional}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfessional}
                        disabled={savingProfessional}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingProfessional && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingProfessional ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Professional Title</label>
                      <p className="text-base font-medium">{userData?.professionalTitle || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Years of Experience</label>
                      <p className="text-base font-medium">
                        {userData?.yearsExperience ? `${userData.yearsExperience} years` : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Professional Bio</label>
                      <p className="text-base">{userData?.bio || 'Not set'}</p>
                    </div>
                  </div>
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
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Enter your current password and choose a new password for your account.
                      </p>
                      
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
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Password</h3>
                      <p className="text-sm text-muted-foreground">
                        Click "Change Password" above to update your password
                      </p>
                    </div>
                  </div>
                )}
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
