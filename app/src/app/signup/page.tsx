'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithTier, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Check, UserPlus, Crown, CreditCard, CheckCircle, Star, Target, Clock } from 'lucide-react';
import AccountInfoStep from './components/AccountInfoStep';
import ServiceTierStep from './components/ServiceTierStep';
import PaymentStep from './components/PaymentStep';
import ConfirmationStep from './components/ConfirmationStep';

// Service tier type - matching Firebase interface
export interface ServiceTier {
  id: string;
  name: string;
  price: number;
  features: string[];
  title?: string;
  description?: string;
  details?: string;
}

// Form data interface
export interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  tier: ServiceTier | null;
  paymentInfo: Record<string, unknown> | null;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  tier: null,
  paymentInfo: null
};

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // State removed: const [paymentComplete, setPaymentComplete] = useState(false);
  const router = useRouter();

  // Track authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      console.log("Auth state changed:", user ? "User authenticated" : "No user");
    });
    
    return () => unsubscribe();
  }, []);

  const updateFormData = (data: Partial<FormData>) => {
    setFormData({ ...formData, ...data });
    setError(''); // Clear errors when form data changes
  };

  const nextStep = () => setCurrentStep(currentStep + 1);
  const prevStep = () => setCurrentStep(currentStep - 1);

  // Create user account before proceeding to payment
  const handleCreateAccount = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      
      if (!formData.tier) {
        setError('Please select a service tier');
        setIsSubmitting(false);
        return;
      }
      
      // Create user with tier info
      const result = await createUserWithTier(
        formData.email,
        formData.password,
        formData.name,
        formData.phone,
        formData.tier
      );
      
      if (!result.success) {
        // Handle specific Firebase auth errors
        const errorCode = result.error?.message || '';
        
        if (errorCode.includes('auth/email-already-in-use')) {
          setError('This email is already registered. Please sign in instead or use a different email address.');
        } else if (errorCode.includes('auth/weak-password')) {
          setError('Password is too weak. Please choose a stronger password (at least 6 characters).');
        } else if (errorCode.includes('auth/invalid-email')) {
          setError('Please enter a valid email address.');
        } else if (errorCode.includes('auth/operation-not-allowed')) {
          setError('Email/password accounts are not enabled. Please contact support.');
        } else {
          setError(result.error?.message || 'Failed to create account. Please try again.');
        }
        
        setIsSubmitting(false);
        return; // Stop the signup process
      }
      
      console.log("Account created successfully");
      setIsSubmitting(false);
      nextStep(); // Proceed to payment step
    } catch (error) {
      console.error('Account creation error:', error);
      
      // Handle unexpected errors
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('auth/email-already-in-use')) {
        setError('This email is already registered. Please sign in instead or use a different email address.');
      } else if (errorMessage.includes('auth/weak-password')) {
        setError('Password is too weak. Please choose a stronger password (at least 6 characters).');
      } else if (errorMessage.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      setIsSubmitting(false);
    }
  };

  // Function to handle payment completion
  const handlePaymentComplete = () => {
    console.log("Payment completed successfully");
    // State update removed: setPaymentComplete(true);
    nextStep();
  };

  // Final submit after payment and confirmation
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      console.log("Signup flow complete");
      
      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Signup error:', error);
      setError((error as Error).message);
      setIsSubmitting(false);
    }
  };

  // Render the current step
  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <AccountInfoStep 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep}
            error={error}
          />
        );
      case 2:
        return (
          <ServiceTierStep 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={handleCreateAccount} 
            prevStep={prevStep}
            error={error}
            isSubmitting={isSubmitting}
          />
        );
      case 3:
        return (
          <PaymentStep 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={handlePaymentComplete} 
            prevStep={prevStep}
            error={error}
            currentUser={currentUser}
          />
        );
      case 4:
        return (
          <ConfirmationStep 
            formData={formData} 
            handleSubmit={handleSubmit} 
            prevStep={prevStep}
            isSubmitting={isSubmitting}
            error={error}
          />
        );
      default:
        return (
          <AccountInfoStep 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep}
            error={error}
          />
        );
    }
  };

  const stepIcons = [UserPlus, Crown, CreditCard, CheckCircle];
  const stepTitles = ['Account', 'Select Plan', 'Payment', 'Confirm'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join SHREY.FIT</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Start your transformation journey with personalized fitness coaching
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Benefits Sidebar */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="sticky top-8">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white p-8 rounded-2xl shadow-xl">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-3">Why Join SHREY.FIT?</h3>
                    <p className="text-emerald-100 leading-relaxed">
                      Transform your life with personalized coaching that actually works for busy people.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      {
                        icon: Target,
                        title: 'Personalized Programs',
                        description: 'Custom workouts and nutrition plans designed specifically for your goals and lifestyle.'
                      },
                      {
                        icon: Clock,
                        title: 'Flexible Scheduling',
                        description: 'Sessions that work with your busy schedule - early morning, lunch breaks, or evenings.'
                      },
                      {
                        icon: Star,
                        title: 'Proven Results',
                        description: 'Join hundreds who have transformed their health with sustainable, lasting changes.'
                      }
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                          <benefit.icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-1">{benefit.title}</h4>
                          <p className="text-emerald-100 text-sm leading-relaxed">{benefit.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-emerald-500/30">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">30-Day</div>
                      <div className="text-emerald-100 text-sm">Money-Back Guarantee</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Signup Form */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  {/* Progress indicator */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      {[1, 2, 3, 4].map((step, index) => {
                        const StepIcon = stepIcons[index];
                        return (
                          <div key={step} className="flex items-center">
                            <div className="flex flex-col items-center">
                              <div className={`
                                flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
                                ${currentStep >= step 
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                                  : 'bg-gray-100 text-gray-400'
                                }
                              `}>
                                {currentStep > step ? (
                                  <Check className="w-6 h-6" />
                                ) : (
                                  <StepIcon className="w-6 h-6" />
                                )}
                              </div>
                              <div className="mt-2 text-xs font-medium text-gray-600">
                                {stepTitles[index]}
                              </div>
                            </div>
                            {step < 4 && (
                              <div className={`
                                w-16 h-0.5 mx-4 transition-all duration-200
                                ${currentStep > step 
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
                                  : 'bg-gray-200'
                                }
                              `} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {renderStep()}
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
