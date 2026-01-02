'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Mail, Smartphone, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Breadcrumb } from '@/components/Breadcrumb';
import { LoginHistoryCard } from '@/components/security/LoginHistoryCard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, auth } from '@/lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function SecurityPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  // Email change state
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailStep, setEmailStep] = useState<'enter-details' | 'verify-otp' | 'complete'>('enter-details');
  const [currentPasswordEmail, setCurrentPasswordEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // OTP input refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Security', href: '/dashboard/client/security' },
  ];

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userData) {
      router.push('/login');
      return;
    }

    if (userData.role !== 'client') {
      router.push('/dashboard/trainer');
      return;
    }

    if (!userData.accountActivated) {
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
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleStartPasswordChange = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setIsChangingPassword(true);
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;

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

    setSavingPassword(true);
    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully!",
      });
      setIsChangingPassword(false);
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
      setSavingPassword(false);
    }
  };

  // Countdown timer for resend button
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [resendTimer, resendDisabled]);

  // Auto-focus first OTP input when entering verify step
  useEffect(() => {
    if (emailStep === 'verify-otp' && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [emailStep]);

  // Auto-submit OTP when all 6 digits are entered
  useEffect(() => {
    if (emailStep === 'verify-otp' && otp.every(digit => digit !== '')) {
      handleVerifyOTP();
    }
  }, [otp, emailStep]);

  const handleStartEmailChange = () => {
    setEmailStep('enter-details');
    setCurrentPasswordEmail('');
    setNewEmail('');
    setConfirmEmail('');
    setOtp(['', '', '', '', '', '']);
    setEmailError('');
    setIsChangingEmail(true);
  };

  const handleCancelEmailChange = () => {
    setIsChangingEmail(false);
    setEmailStep('enter-details');
    setCurrentPasswordEmail('');
    setNewEmail('');
    setConfirmEmail('');
    setOtp(['', '', '', '', '', '']);
    setEmailError('');
    setResendDisabled(false);
    setResendTimer(0);
  };

  // STEP 1: Send OTP to new email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    // Validation
    if (!currentPasswordEmail.trim()) {
      setEmailError('Current password is required');
      return;
    }

    if (!newEmail.trim() || !confirmEmail.trim()) {
      setEmailError('Please enter and confirm your new email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!isValidEmail(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (newEmail !== confirmEmail) {
      setEmailError('Email addresses do not match');
      return;
    }

    if (newEmail.toLowerCase() === userData?.email?.toLowerCase()) {
      setEmailError('New email must be different from current email');
      return;
    }

    setLoadingEmail(true);
    
    try {
      const { sendEmailChangeOTP } = await import('@/lib/profile-api');
      
      const result = await sendEmailChangeOTP(currentPasswordEmail, newEmail);

      if (result.success) {
        setEmailStep('verify-otp');
        setEmailError('');
        setResendDisabled(true);
        setResendTimer(60);
      } else {
        setEmailError(result.error || 'Failed to send verification code');
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setEmailError(err.message || 'An unexpected error occurred');
    } finally {
      setLoadingEmail(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setEmailError('Please enter all 6 digits');
      return;
    }

    setLoadingEmail(true);
    setEmailError('');

    try {
      const { verifyEmailChangeOTP, completeEmailChange } = await import('@/lib/profile-api');
      
      // Verify OTP
      const verifyResult = await verifyEmailChangeOTP(newEmail, otpCode);

      if (!verifyResult.success) {
        setEmailError(verifyResult.error || 'Invalid verification code');
        setLoadingEmail(false);
        return;
      }

      // Complete email change
      const completeResult = await completeEmailChange(newEmail);

      if (completeResult.success) {
        setEmailStep('complete');
        setTimeout(() => {
          handleCancelEmailChange();
        }, 2000);
      } else {
        setEmailError(completeResult.error || 'Failed to complete email change');
      }
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setEmailError(err.message || 'An unexpected error occurred');
    } finally {
      setLoadingEmail(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Clear error when user starts typing
    if (emailError) setEmailError('');
  };

  // Handle OTP input keydown (backspace)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP input paste
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only process if it's 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendDisabled) return;

    setEmailError('');
    setLoadingEmail(true);

    try {
      const { sendEmailChangeOTP } = await import('@/lib/profile-api');
      
      const result = await sendEmailChangeOTP(currentPasswordEmail, newEmail);

      if (result.success) {
        setOtp(['', '', '', '', '', '']);
        setResendDisabled(true);
        setResendTimer(60);
        otpRefs.current[0]?.focus();
      } else {
        setEmailError(result.error || 'Failed to resend code');
      }
    } catch (err: any) {
      console.error('Error resending OTP:', err);
      setEmailError(err.message || 'Failed to resend code');
    } finally {
      setLoadingEmail(false);
    }
  };

  // Back to step 1
  const handleBackToEmailDetails = () => {
    setEmailStep('enter-details');
    setOtp(['', '', '', '', '', '']);
    setEmailError('');
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Account Security</h1>
                <p className="text-gray-600 mt-1">
                  Manage your security settings and monitor account activity
                </p>
              </div>
            </div>

            {/* Security Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-emerald-200 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-emerald-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Key className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Password</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Last changed: {userData?.security?.passwordLastChanged 
                    ? new Date(userData.security.passwordLastChanged.seconds * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : 'Never'}
                </p>
                <button 
                  onClick={handleStartPasswordChange}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Change Password
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-emerald-200 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-emerald-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Email</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">{userData?.email}</p>
                <div className="flex items-center gap-2 mb-4">
                  {userData?.emailVerified ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      ⚠ Unverified
                    </span>
                  )}
                </div>
                <button 
                  onClick={handleStartEmailChange}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Change Email
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-emerald-200 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-emerald-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Smartphone className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Two-Factor Auth</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Not enabled
                </p>
                <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                  Enable 2FA (Coming Soon)
                </button>
              </div>
            </div>

            {/* Password Change Form */}
            {isChangingPassword && (
              <div className="bg-white rounded-lg shadow-sm border border-emerald-200 p-6 transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-800">{passwordError}</p>
                  </div>
                )}

                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={handleCancelPasswordChange}
                    disabled={savingPassword}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={savingPassword}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}

            {/* Email Change Form */}
            {isChangingEmail && (
              <div className="bg-white rounded-lg shadow-sm border border-emerald-200 p-6 transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Change Email Address
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {emailStep === 'enter-details' && "Enter your new email address. We'll send you a verification code."}
                  {emailStep === 'verify-otp' && `Enter the 6-digit code sent to ${newEmail}`}
                  {emailStep === 'complete' && 'Email address changed successfully!'}
                </p>

                {/* STEP 1: Enter Details */}
                {emailStep === 'enter-details' && (
                  <form onSubmit={handleSendOTP}>
                    <div className="space-y-4">
                      {/* Current Email (Read-only) */}
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Current Email
                        </label>
                        <input
                          type="email"
                          value={userData?.email || ''}
                          disabled
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
                        />
                      </div>

                      {/* Current Password */}
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Current Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={currentPasswordEmail}
                          onChange={(e) => setCurrentPasswordEmail(e.target.value)}
                          disabled={loadingEmail}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Enter your current password"
                          autoComplete="current-password"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Required for security verification
                        </p>
                      </div>

                      {/* New Email */}
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          New Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          disabled={loadingEmail}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="your.new.email@example.com"
                          autoComplete="off"
                        />
                      </div>

                      {/* Confirm New Email */}
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Confirm New Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={confirmEmail}
                          onChange={(e) => setConfirmEmail(e.target.value)}
                          disabled={loadingEmail}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Confirm your new email"
                          autoComplete="off"
                        />
                      </div>

                      {/* Error Alert */}
                      {emailError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-800">{emailError}</p>
                        </div>
                      )}

                      {/* Info Alert */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <Mail className="w-4 h-4 inline mr-1" />
                          We'll send a 6-digit verification code to your new email address.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        type="button"
                        onClick={handleCancelEmailChange}
                        disabled={loadingEmail}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loadingEmail}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {loadingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loadingEmail ? 'Sending Code...' : 'Send Verification Code'}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2: Verify OTP */}
                {emailStep === 'verify-otp' && (
                  <div className="space-y-6">
                    {/* OTP Input */}
                    <div>
                      <label className="text-sm font-medium text-gray-900 mb-3 block text-center">
                        Enter Verification Code
                      </label>
                      <div className="flex justify-center gap-2">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => { otpRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={index === 0 ? handleOtpPaste : undefined}
                            disabled={loadingEmail}
                            className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50"
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-3">
                        Code sent to {newEmail}
                      </p>
                    </div>

                    {/* Error Alert */}
                    {emailError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{emailError}</p>
                      </div>
                    )}

                    {/* Resend Code */}
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">
                        Didn't receive the code?
                      </p>
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={resendDisabled || loadingEmail}
                        className="text-sm text-primary hover:text-primary/80 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {resendDisabled
                          ? `Resend code in ${resendTimer}s`
                          : 'Resend code'}
                      </button>
                    </div>

                    {/* Loading State */}
                    {loadingEmail && (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying code...</span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleBackToEmailDetails}
                        disabled={loadingEmail}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Complete */}
                {emailStep === 'complete' && (
                  <div className="space-y-6 py-4">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-center mb-2">
                        Email Changed Successfully!
                      </h3>
                      <p className="text-sm text-gray-600 text-center">
                        Your email has been updated to <strong>{newEmail}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Login History Section */}
            <div>
              <LoginHistoryCard />
            </div>

            {/* Security Tips */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <h3 className="font-semibold text-emerald-900 mb-3">Security Tips</h3>
              <ul className="space-y-2 text-sm text-emerald-800">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>Use a strong, unique password for your account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>Review your login history regularly for suspicious activity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>Never share your password or login credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>Log out from shared or public devices</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
