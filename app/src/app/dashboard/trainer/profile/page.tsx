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
import { User, Shield, Camera, Loader2, Briefcase, Link, Plus, X } from 'lucide-react';
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

  // Education & Credentials edit state
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [editedEducationDegree, setEditedEducationDegree] = useState('');
  const [editedEducationMajor, setEditedEducationMajor] = useState('');
  const [editedEducationMinor, setEditedEducationMinor] = useState('');
  const [editedEducationInstitution, setEditedEducationInstitution] = useState('');
  const [editedFitnessCertifications, setEditedFitnessCertifications] = useState('');
  const [editedNutritionCertifications, setEditedNutritionCertifications] = useState('');
  const [editedSpecialtyCertifications, setEditedSpecialtyCertifications] = useState('');
  const [editedFitnessUrls, setEditedFitnessUrls] = useState<string[]>(['']);
  const [editedNutritionUrls, setEditedNutritionUrls] = useState<string[]>(['']);
  const [editedSpecialtyUrls, setEditedSpecialtyUrls] = useState<string[]>(['']);
  const [savingEducation, setSavingEducation] = useState(false);

  // Experience & Expertise edit state
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [editedYearsExperience, setEditedYearsExperience] = useState('');
  const [editedSpecializations, setEditedSpecializations] = useState('');
  const [savingExperience, setSavingExperience] = useState(false);

  // Training Philosophy edit state
  const [isEditingPhilosophy, setIsEditingPhilosophy] = useState(false);
  const [editedTrainingPhilosophy, setEditedTrainingPhilosophy] = useState('');
  const [editedAreasOfExpertise, setEditedAreasOfExpertise] = useState('');
  const [savingPhilosophy, setSavingPhilosophy] = useState(false);

  // Social Media edit state
  const [isEditingSocialMedia, setIsEditingSocialMedia] = useState(false);
  const [editedLinkedinUrl, setEditedLinkedinUrl] = useState('');
  const [editedFacebookUrl, setEditedFacebookUrl] = useState('');
  const [editedYoutubeUrl, setEditedYoutubeUrl] = useState('');
  const [editedInstagramUrl, setEditedInstagramUrl] = useState('');
  const [savingSocialMedia, setSavingSocialMedia] = useState(false);

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

  const handleEditEducation = () => {
    setEditedEducationDegree(userData?.educationDegree || '');
    setEditedEducationMajor(userData?.educationMajor || '');
    setEditedEducationMinor(userData?.educationMinor || '');
    setEditedEducationInstitution(userData?.educationInstitution || '');
    setEditedFitnessCertifications(userData?.fitnessCertifications || '');
    setEditedNutritionCertifications(userData?.nutritionCertifications || '');
    setEditedSpecialtyCertifications(userData?.specialtyCertifications || '');
    setEditedFitnessUrls(userData?.fitnessCertificationUrls && userData.fitnessCertificationUrls.length > 0 ? userData.fitnessCertificationUrls : ['']);
    setEditedNutritionUrls(userData?.nutritionCertificationUrls && userData.nutritionCertificationUrls.length > 0 ? userData.nutritionCertificationUrls : ['']);
    setEditedSpecialtyUrls(userData?.specialtyCertificationUrls && userData.specialtyCertificationUrls.length > 0 ? userData.specialtyCertificationUrls : ['']);
    setIsEditingEducation(true);
  };

  const handleCancelEducation = () => {
    setIsEditingEducation(false);
    setEditedEducationDegree('');
    setEditedEducationMajor('');
    setEditedEducationMinor('');
    setEditedEducationInstitution('');
    setEditedFitnessCertifications('');
    setEditedNutritionCertifications('');
    setEditedSpecialtyCertifications('');
    setEditedFitnessUrls(['']);
    setEditedNutritionUrls(['']);
    setEditedSpecialtyUrls(['']);
  };

  // URL validation helper
  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is okay
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  // URL management helpers
  const addUrlField = (type: 'fitness' | 'nutrition' | 'specialty') => {
    if (type === 'fitness') {
      setEditedFitnessUrls([...editedFitnessUrls, '']);
    } else if (type === 'nutrition') {
      setEditedNutritionUrls([...editedNutritionUrls, '']);
    } else {
      setEditedSpecialtyUrls([...editedSpecialtyUrls, '']);
    }
  };

  const removeUrlField = (type: 'fitness' | 'nutrition' | 'specialty', index: number) => {
    if (type === 'fitness') {
      setEditedFitnessUrls(editedFitnessUrls.filter((_, i) => i !== index));
    } else if (type === 'nutrition') {
      setEditedNutritionUrls(editedNutritionUrls.filter((_, i) => i !== index));
    } else {
      setEditedSpecialtyUrls(editedSpecialtyUrls.filter((_, i) => i !== index));
    }
  };

  const updateUrlField = (type: 'fitness' | 'nutrition' | 'specialty', index: number, value: string) => {
    if (type === 'fitness') {
      const newUrls = [...editedFitnessUrls];
      newUrls[index] = value;
      setEditedFitnessUrls(newUrls);
    } else if (type === 'nutrition') {
      const newUrls = [...editedNutritionUrls];
      newUrls[index] = value;
      setEditedNutritionUrls(newUrls);
    } else {
      const newUrls = [...editedSpecialtyUrls];
      newUrls[index] = value;
      setEditedSpecialtyUrls(newUrls);
    }
  };

  const handleSaveEducation = async () => {
    if (!user) return;

    // Validate required fields
    if (!editedEducationDegree.trim()) {
      alert('Degree is required');
      return;
    }
    if (!editedEducationMajor.trim()) {
      alert('Major is required');
      return;
    }
    if (!editedEducationInstitution.trim()) {
      alert('Institution is required');
      return;
    }

    // Validate field lengths
    if (editedEducationDegree.length > 50) {
      alert('Degree must be 50 characters or less');
      return;
    }
    if (editedEducationMajor.length > 100) {
      alert('Major must be 100 characters or less');
      return;
    }
    if (editedEducationMinor.length > 100) {
      alert('Minor must be 100 characters or less');
      return;
    }
    if (editedEducationInstitution.length > 150) {
      alert('Institution must be 150 characters or less');
      return;
    }
    if (editedFitnessCertifications.length > 300) {
      alert('Fitness certifications must be 300 characters or less');
      return;
    }
    if (editedNutritionCertifications.length > 300) {
      alert('Nutrition certifications must be 300 characters or less');
      return;
    }
    if (editedSpecialtyCertifications.length > 300) {
      alert('Specialty certifications must be 300 characters or less');
      return;
    }

    // Validate URLs
    const allUrls = [...editedFitnessUrls, ...editedNutritionUrls, ...editedSpecialtyUrls];
    for (const url of allUrls) {
      if (url.trim() && !isValidUrl(url)) {
        alert('Please enter valid URLs (must start with http:// or https://)');
        return;
      }
    }

    setSavingEducation(true);
    try {
      // Filter out empty URLs
      const fitnessUrls = editedFitnessUrls.filter(url => url.trim());
      const nutritionUrls = editedNutritionUrls.filter(url => url.trim());
      const specialtyUrls = editedSpecialtyUrls.filter(url => url.trim());

      const updatedData: any = {
        educationDegree: editedEducationDegree.trim(),
        educationMajor: editedEducationMajor.trim(),
        educationMinor: editedEducationMinor.trim() || null,
        educationInstitution: editedEducationInstitution.trim(),
        fitnessCertifications: editedFitnessCertifications.trim() || null,
        nutritionCertifications: editedNutritionCertifications.trim() || null,
        specialtyCertifications: editedSpecialtyCertifications.trim() || null,
        fitnessCertificationUrls: fitnessUrls.length > 0 ? fitnessUrls : [],
        nutritionCertificationUrls: nutritionUrls.length > 0 ? nutritionUrls : [],
        specialtyCertificationUrls: specialtyUrls.length > 0 ? specialtyUrls : [],
      };

      await updateDoc(doc(db, 'admins', user.uid), updatedData);
      updateUserData(updatedData);

      alert('Education & credentials updated successfully!');
      setIsEditingEducation(false);
    } catch (error) {
      console.error('Error updating education:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSavingEducation(false);
    }
  };

  const handleEditExperience = () => {
    setEditedYearsExperience(userData?.yearsExperience?.toString() || '');
    // Handle specializations - convert array to string if needed
    const specs = userData?.specializations;
    const specsString = Array.isArray(specs) ? specs.join(', ') : (specs || '');
    setEditedSpecializations(specsString);
    setIsEditingExperience(true);
  };

  const handleCancelExperience = () => {
    setIsEditingExperience(false);
    setEditedYearsExperience('');
    setEditedSpecializations('');
  };

  const handleSaveExperience = async () => {
    if (!user) return;

    // Validate required fields
    if (!editedYearsExperience) {
      alert('Years of experience is required');
      return;
    }
    if (!editedSpecializations.trim()) {
      alert('Specializations are required');
      return;
    }

    // Validate years of experience
    if (isNaN(Number(editedYearsExperience)) || Number(editedYearsExperience) < 0) {
      alert('Please enter a valid number for years of experience');
      return;
    }

    // Validate field length
    if (editedSpecializations.length > 300) {
      alert('Specializations must be 300 characters or less');
      return;
    }

    setSavingExperience(true);
    try {
      const updatedData = {
        yearsExperience: Number(editedYearsExperience),
        specializations: editedSpecializations.trim(),
      };

      await updateDoc(doc(db, 'admins', user.uid), updatedData);
      updateUserData(updatedData);

      alert('Experience & expertise updated successfully!');
      setIsEditingExperience(false);
    } catch (error) {
      console.error('Error updating experience:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSavingExperience(false);
    }
  };

  const handleEditPhilosophy = () => {
    setEditedTrainingPhilosophy(userData?.trainingPhilosophy || '');
    setEditedAreasOfExpertise(userData?.areasOfExpertise || '');
    setIsEditingPhilosophy(true);
  };

  const handleCancelPhilosophy = () => {
    setIsEditingPhilosophy(false);
    setEditedTrainingPhilosophy('');
    setEditedAreasOfExpertise('');
  };

  const handleSavePhilosophy = async () => {
    if (!user) return;

    // Validate required fields
    if (!editedTrainingPhilosophy.trim()) {
      alert('Training philosophy is required');
      return;
    }
    if (!editedAreasOfExpertise.trim()) {
      alert('Areas of expertise are required');
      return;
    }

    // Validate field lengths
    if (editedTrainingPhilosophy.length > 400) {
      alert('Training philosophy must be 400 characters or less');
      return;
    }
    if (editedAreasOfExpertise.length > 400) {
      alert('Areas of expertise must be 400 characters or less');
      return;
    }

    setSavingPhilosophy(true);
    try {
      const updatedData = {
        trainingPhilosophy: editedTrainingPhilosophy.trim(),
        areasOfExpertise: editedAreasOfExpertise.trim(),
      };

      await updateDoc(doc(db, 'admins', user.uid), updatedData);
      updateUserData(updatedData);

      alert('Training philosophy updated successfully!');
      setIsEditingPhilosophy(false);
    } catch (error) {
      console.error('Error updating philosophy:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSavingPhilosophy(false);
    }
  };

  const handleEditSecurity = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setIsEditingSecurity(true);
  };

  const handleEditSocialMedia = () => {
    setEditedLinkedinUrl(userData?.linkedinUrl || '');
    setEditedFacebookUrl(userData?.facebookUrl || '');
    setEditedYoutubeUrl(userData?.youtubeUrl || '');
    setEditedInstagramUrl(userData?.instagramUrl || '');
    setIsEditingSocialMedia(true);
  };

  const handleCancelSocialMedia = () => {
    setIsEditingSocialMedia(false);
    setEditedLinkedinUrl('');
    setEditedFacebookUrl('');
    setEditedYoutubeUrl('');
    setEditedInstagramUrl('');
  };

  const handleSaveSocialMedia = async () => {
    if (!user) return;

    // Validate URLs if provided
    if (editedLinkedinUrl.trim() && !isValidUrl(editedLinkedinUrl)) {
      alert('Please enter a valid LinkedIn URL (must start with http:// or https://)');
      return;
    }
    if (editedFacebookUrl.trim() && !isValidUrl(editedFacebookUrl)) {
      alert('Please enter a valid Facebook URL (must start with http:// or https://)');
      return;
    }
    if (editedYoutubeUrl.trim() && !isValidUrl(editedYoutubeUrl)) {
      alert('Please enter a valid YouTube URL (must start with http:// or https://)');
      return;
    }
    if (editedInstagramUrl.trim() && !isValidUrl(editedInstagramUrl)) {
      alert('Please enter a valid Instagram URL (must start with http:// or https://)');
      return;
    }

    setSavingSocialMedia(true);
    try {
      const updatedData = {
        linkedinUrl: editedLinkedinUrl.trim() || null,
        facebookUrl: editedFacebookUrl.trim() || null,
        youtubeUrl: editedYoutubeUrl.trim() || null,
        instagramUrl: editedInstagramUrl.trim() || null,
      };

      await updateDoc(doc(db, 'admins', user.uid), updatedData);
      updateUserData(updatedData);

      alert('Social media links updated successfully!');
      setIsEditingSocialMedia(false);
    } catch (error) {
      console.error('Error updating social media:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setSavingSocialMedia(false);
    }
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
                      <label className="text-sm text-muted-foreground">Full Name</label>
                      <p className="text-base font-medium">{userData?.name || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Email</label>
                      <p className="text-base font-medium">{userData?.email || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Phone Number</label>
                      <p className="text-base font-medium">
                        {formatPhoneForDisplay(userData?.phone || '') || 'Not set'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Education & Credentials Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Education & Credentials
                  </CardTitle>
                  {!isEditingEducation && (
                    <button
                      onClick={handleEditEducation}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingEducation ? (
                  <>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Degree <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editedEducationDegree}
                            onChange={(e) => setEditedEducationDegree(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="B.S., M.S., Ph.D."
                            maxLength={50}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Institution <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editedEducationInstitution}
                            onChange={(e) => setEditedEducationInstitution(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="UCLA, Penn State"
                            maxLength={150}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Major <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editedEducationMajor}
                            onChange={(e) => setEditedEducationMajor(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Exercise Science, Kinesiology"
                            maxLength={100}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Minor
                          </label>
                          <input
                            type="text"
                            value={editedEducationMinor}
                            onChange={(e) => setEditedEducationMinor(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Nutrition, Biology"
                            maxLength={100}
                          />
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold text-foreground mb-3">Certifications</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Fitness Certifications
                            </label>
                            <input
                              type="text"
                              value={editedFitnessCertifications}
                              onChange={(e) => setEditedFitnessCertifications(e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="NASM-CPT, NSCA-CSCS"
                              maxLength={300}
                            />
                            <p className="text-xs text-muted-foreground mt-1">{editedFitnessCertifications.length}/300 characters</p>
                            
                            {/* Verification Links */}
                            <div className="mt-2 space-y-2">
                              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Link className="h-3 w-3" />
                                Verification Links (Optional)
                              </label>
                              {editedFitnessUrls.map((url, index) => (
                                <div key={index} className="flex gap-2">
                                  <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => updateUrlField('fitness', index, e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="https://verify.nasm.org/..."
                                  />
                                  {editedFitnessUrls.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeUrlField('fitness', index)}
                                      className="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-md"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {editedFitnessUrls.length < 3 && (
                                <button
                                  type="button"
                                  onClick={() => addUrlField('fitness')}
                                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Link
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Nutrition Certifications
                            </label>
                            <input
                              type="text"
                              value={editedNutritionCertifications}
                              onChange={(e) => setEditedNutritionCertifications(e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Precision Nutrition L1, NASM-CNC"
                              maxLength={300}
                            />
                            <p className="text-xs text-muted-foreground mt-1">{editedNutritionCertifications.length}/300 characters</p>
                            
                            {/* Verification Links */}
                            <div className="mt-2 space-y-2">
                              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Link className="h-3 w-3" />
                                Verification Links (Optional)
                              </label>
                              {editedNutritionUrls.map((url, index) => (
                                <div key={index} className="flex gap-2">
                                  <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => updateUrlField('nutrition', index, e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="https://www.credly.com/badges/..."
                                  />
                                  {editedNutritionUrls.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeUrlField('nutrition', index)}
                                      className="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-md"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {editedNutritionUrls.length < 3 && (
                                <button
                                  type="button"
                                  onClick={() => addUrlField('nutrition')}
                                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Link
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">
                              Specialty Certifications
                            </label>
                            <input
                              type="text"
                              value={editedSpecialtyCertifications}
                              onChange={(e) => setEditedSpecialtyCertifications(e.target.value)}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="CPR/AED, TRX Certified"
                              maxLength={300}
                            />
                            <p className="text-xs text-muted-foreground mt-1">{editedSpecialtyCertifications.length}/300 characters</p>
                            
                            {/* Verification Links */}
                            <div className="mt-2 space-y-2">
                              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Link className="h-3 w-3" />
                                Verification Links (Optional)
                              </label>
                              {editedSpecialtyUrls.map((url, index) => (
                                <div key={index} className="flex gap-2">
                                  <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => updateUrlField('specialty', index, e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="https://redcross.org/verify/..."
                                  />
                                  {editedSpecialtyUrls.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeUrlField('specialty', index)}
                                      className="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-md"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {editedSpecialtyUrls.length < 3 && (
                                <button
                                  type="button"
                                  onClick={() => addUrlField('specialty')}
                                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Link
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={handleCancelEducation}
                        disabled={savingEducation}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEducation}
                        disabled={savingEducation}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingEducation && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingEducation ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm text-muted-foreground mb-2">Education</h4>
                      <p className="text-base font-medium">
                        {userData?.educationDegree && userData?.educationMajor && userData?.educationInstitution ? (
                          <>
                            {userData.educationDegree} {userData.educationMajor}
                            {userData.educationMinor && ` (Minor: ${userData.educationMinor})`}
                            <br />
                            <span className="font-normal">{userData.educationInstitution}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground font-normal">Not set</span>
                        )}
                      </p>
                    </div>
                    {(userData?.fitnessCertifications || userData?.nutritionCertifications || userData?.specialtyCertifications) && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm text-muted-foreground mb-2">Certifications</h4>
                        <div className="space-y-2">
                          {userData?.fitnessCertifications && (
                            <div>
                              <p className="text-xs text-muted-foreground">Fitness:</p>
                              <p className="text-base font-medium">{userData.fitnessCertifications}</p>
                            </div>
                          )}
                          {userData?.nutritionCertifications && (
                            <div>
                              <p className="text-xs text-muted-foreground">Nutrition:</p>
                              <p className="text-base font-medium">{userData.nutritionCertifications}</p>
                            </div>
                          )}
                          {userData?.specialtyCertifications && (
                            <div>
                              <p className="text-xs text-muted-foreground">Specialty:</p>
                              <p className="text-base font-medium">{userData.specialtyCertifications}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Experience & Expertise Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Experience & Expertise
                  </CardTitle>
                  {!isEditingExperience && (
                    <button
                      onClick={handleEditExperience}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingExperience ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Years of Experience <span className="text-red-500">*</span>
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
                          Specializations <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editedSpecializations}
                          onChange={(e) => setEditedSpecializations(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Strength Training, Weight Loss, Athletic Performance"
                          maxLength={300}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{editedSpecializations.length}/300 characters</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={handleCancelExperience}
                        disabled={savingExperience}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveExperience}
                        disabled={savingExperience}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingExperience && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingExperience ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Years of Experience</label>
                      <p className="text-base font-medium">
                        {userData?.yearsExperience ? `${userData.yearsExperience} years` : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Specializations</label>
                      <p className="text-base font-medium">{userData?.specializations || 'Not set'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Training Philosophy Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Training Philosophy
                  </CardTitle>
                  {!isEditingPhilosophy && (
                    <button
                      onClick={handleEditPhilosophy}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingPhilosophy ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Your Coaching Philosophy <span className="text-red-500">*</span> ({editedTrainingPhilosophy.length}/400)
                        </label>
                        <textarea
                          value={editedTrainingPhilosophy}
                          onChange={(e) => setEditedTrainingPhilosophy(e.target.value)}
                          rows={4}
                          maxLength={400}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          placeholder="I believe in sustainable, science-based programming that builds long-term habits..."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Areas of Expertise <span className="text-red-500">*</span> ({editedAreasOfExpertise.length}/400)
                        </label>
                        <textarea
                          value={editedAreasOfExpertise}
                          onChange={(e) => setEditedAreasOfExpertise(e.target.value)}
                          rows={4}
                          maxLength={400}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          placeholder="Specializing in strength training, body recomposition, metabolic conditioning..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={handleCancelPhilosophy}
                        disabled={savingPhilosophy}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePhilosophy}
                        disabled={savingPhilosophy}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingPhilosophy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingPhilosophy ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Your Coaching Philosophy</label>
                      <p className="text-base font-medium">{userData?.trainingPhilosophy || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Areas of Expertise</label>
                      <p className="text-base font-medium">{userData?.areasOfExpertise || 'Not set'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Media Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5 text-primary" />
                    Social Media
                  </CardTitle>
                  {!isEditingSocialMedia && (
                    <button
                      onClick={handleEditSocialMedia}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingSocialMedia ? (
                  <>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Add links to your professional social media profiles. These will be displayed to clients viewing your trainer profile.
                      </p>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn Profile
                        </label>
                        <input
                          type="url"
                          value={editedLinkedinUrl}
                          onChange={(e) => setEditedLinkedinUrl(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="https://linkedin.com/in/yourprofile"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <svg className="h-4 w-4 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook Profile
                        </label>
                        <input
                          type="url"
                          value={editedFacebookUrl}
                          onChange={(e) => setEditedFacebookUrl(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="https://facebook.com/yourprofile"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          YouTube Channel
                        </label>
                        <input
                          type="url"
                          value={editedYoutubeUrl}
                          onChange={(e) => setEditedYoutubeUrl(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="https://youtube.com/@yourchannel"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <svg className="h-4 w-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          Instagram Profile
                        </label>
                        <input
                          type="url"
                          value={editedInstagramUrl}
                          onChange={(e) => setEditedInstagramUrl(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="https://instagram.com/yourprofile"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        onClick={handleCancelSocialMedia}
                        disabled={savingSocialMedia}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveSocialMedia}
                        disabled={savingSocialMedia}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingSocialMedia && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingSocialMedia ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Your social media links will be displayed to clients on your trainer profile page.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground flex items-center gap-2">
                          <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </label>
                        <p className="text-base font-medium ml-6">
                          {userData?.linkedinUrl ? (
                            <a href={userData.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {userData.linkedinUrl}
                            </a>
                          ) : (
                            'Not set'
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground flex items-center gap-2">
                          <svg className="h-4 w-4 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook
                        </label>
                        <p className="text-base font-medium ml-6">
                          {userData?.facebookUrl ? (
                            <a href={userData.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {userData.facebookUrl}
                            </a>
                          ) : (
                            'Not set'
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground flex items-center gap-2">
                          <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          YouTube
                        </label>
                        <p className="text-base font-medium ml-6">
                          {userData?.youtubeUrl ? (
                            <a href={userData.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {userData.youtubeUrl}
                            </a>
                          ) : (
                            'Not set'
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground flex items-center gap-2">
                          <svg className="h-4 w-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          Instagram
                        </label>
                        <p className="text-base font-medium ml-6">
                          {userData?.instagramUrl ? (
                            <a href={userData.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {userData.instagramUrl}
                            </a>
                          ) : (
                            'Not set'
                          )}
                        </p>
                      </div>
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
                      <h3 className="text-sm text-muted-foreground mb-2">Password</h3>
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
