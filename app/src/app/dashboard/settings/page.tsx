'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db, auth as firebaseAuth } from '@/lib/firebase';
import { 
  updateEmail, 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Shield,
  Phone
} from 'lucide-react';

interface UserData {
  name: string;
  email: string;
  phone?: string;
  role: string;
  collection?: string; // Track which collection the user is in
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, userData: authUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Profile update
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (user && authUserData) {
        // Use userData from auth context which already checked both collections
        const collection = authUserData.role === 'admin' ? 'admins' : 'users';
        setUserData({ ...authUserData, collection });
        setName(authUserData.name || '');
        setPhone(authUserData.phone || '');
      }
      setLoading(false);
    };

    loadUserData();
  }, [user, authUserData]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Name is required');
      return;
    }

    setIsUpdatingProfile(true);

    try {
      if (user && userData) {
        // Update in the correct collection
        const collection = userData.collection || 'users';
        
        await updateDoc(doc(db, collection, user.uid), {
          name: name.trim(),
          phone: phone.trim()
        });

        setUserData(prev => prev ? { ...prev, name: name.trim(), phone: phone.trim() } : null);
        setProfileSuccess('✅ Profile updated successfully');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setProfileError(`Failed to update profile: ${error.message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    if (!newEmail.trim() || !newEmail.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!emailPassword) {
      setEmailError('Current password is required to change email');
      return;
    }

    if (!user || !user.email) {
      setEmailError('User not authenticated');
      return;
    }

    setIsUpdatingEmail(true);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, credential);

      // Update email in Firebase Auth
      await updateEmail(user, newEmail.trim());

      // Send verification email
      await sendEmailVerification(user);

      // Update email in Firestore (correct collection)
      if (userData) {
        const collection = userData.collection || 'users';
        await updateDoc(doc(db, collection, user.uid), {
          email: newEmail.trim(),
          emailVerified: false
        });
      }

      setEmailSuccess('✅ Email updated! Please check your inbox to verify your new email address.');
      setNewEmail('');
      setEmailPassword('');
      
      if (userData) {
        setUserData({ ...userData, email: newEmail.trim() });
      }
    } catch (error: any) {
      console.error('Error updating email:', error);
      
      if (error.code === 'auth/wrong-password') {
        setEmailError('Incorrect password');
      } else if (error.code === 'auth/email-already-in-use') {
        setEmailError('This email is already in use by another account');
      } else if (error.code === 'auth/invalid-email') {
        setEmailError('Invalid email address');
      } else if (error.code === 'auth/requires-recent-login') {
        setEmailError('For security, please log out and log back in before changing your email');
      } else {
        setEmailError(`Failed to update email: ${error.message}`);
      }
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (!user || !user.email) {
      setPasswordError('User not authenticated');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setPasswordSuccess('✅ Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('New password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordError('For security, please log out and log back in before changing your password');
      } else {
        setPasswordError(`Failed to update password: ${error.message}`);
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading settings...</div>
      </div>
    );
  }

  const isTrainer = userData?.role === 'trainer' || userData?.role === 'admin';

  return (
    <div className="min-h-screen bg-stone-50">
      {isTrainer && <TrainerSidebar currentPage="overview" />}

      <div className={`${isTrainer ? 'ml-64' : ''} p-8`}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account information and security settings</p>
          </div>

          {/* Profile Information */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Profile Information</h2>
                  <p className="text-sm text-gray-600">Update your name and contact information</p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileError && (
                  <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Email</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">{userData?.email}</span>
                    {user?.emailVerified ? (
                      <span className="ml-auto px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Verified
                      </span>
                    ) : (
                      <span className="ml-auto px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        Not Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Account Role</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700 capitalize">{userData?.role}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Email */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Change Email Address</h2>
                  <p className="text-sm text-gray-600">Update your email and verify the new address</p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                {emailError && (
                  <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}

                {emailSuccess && (
                  <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <span>{emailSuccess}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newEmail">New Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="pl-10"
                      placeholder="Enter new email address"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailPassword">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="emailPassword"
                      type={showEmailPassword ? 'text' : 'password'}
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="pl-10 pr-10"
                      placeholder="Confirm with current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showEmailPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p>⚠️ After changing your email, you'll need to verify the new address before it becomes active.</p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isUpdatingEmail}
                >
                  {isUpdatingEmail ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating Email...
                    </div>
                  ) : (
                    'Update Email Address'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Change Password</h2>
                  <p className="text-sm text-gray-600">Update your account password</p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {passwordError && (
                  <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 pr-10"
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      placeholder="Enter new password (min 6 characters)"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmNewPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      placeholder="Confirm new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating Password...
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => router.push(isTrainer ? '/dashboard/trainer' : '/dashboard/client')}
            >
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
