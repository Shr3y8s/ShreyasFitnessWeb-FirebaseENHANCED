'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithTier, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Check, UserPlus, Crown, Star, Target, Clock } from 'lucide-react';
import AccountInfoStep from './components/AccountInfoStep';
import ServiceTierStep from './components/ServiceTierStep';
import { Footer } from '@/components/Footer';
import { AuthHeader } from '@/components/AuthHeader';

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
  const router = useRouter();

  // Check URL parameters and load data (from sessionStorage or existing user)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const stepParam = searchParams.get('step');
    
    // First, check if there's pending signup data in sessionStorage
    const pendingData = sessionStorage.getItem('pendingSignup');
    if (pendingData) {
      console.log("Loading pending signup data from sessionStorage");
      const savedData = JSON.parse(pendingData);
      setFormData({
        name: savedData.name,
        email: savedData.email,
        phone: savedData.phone,
        password: savedData.password,
        confirmPassword: savedData.password, // Set same as password
        tier: savedData.tier && savedData.tierName ? {
          id: savedData.tier,
          name: savedData.tierName,
          price: 0,
          features: []
        } : null,
        paymentInfo: null
      });
    }
    
    // If step parameter exists, start at that step
    if (stepParam) {
      const step = parseInt(stepParam);
      if (step === 2) {
        setCurrentStep(2);
      }
    }
  }, []);

  // Track authentication state and load existing data for package changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      console.log("Auth state changed:", user ? "User authenticated" : "No user");
      
      // If user is logged in and on signup page, load their existing data
      if (user) {
        try {
          const { db } = await import('@/lib/firebase');
          const { doc, getDoc } = await import('firebase/firestore');
          
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("Loading existing user data for package change");
            
            // Pre-fill form with existing data (not passwords)
            setFormData(prev => ({
              ...prev,
              name: userData.name || '',
              email: userData.email || user.email || '',
              phone: userData.phone || ''
            }));
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  const updateFormData = (data: Partial<FormData>) => {
    const newFormData = { ...formData, ...data };
    setFormData(newFormData);
    setError(''); // Clear errors when form data changes
    
    // Update sessionStorage whenever form data changes
    // This ensures data persists when navigating back and forth
    if (newFormData.name && newFormData.email) {
      const pendingData = {
        name: newFormData.name,
        email: newFormData.email,
        phone: newFormData.phone,
        password: newFormData.password,
        tier: newFormData.tier?.id || '',
        tierName: newFormData.tier?.name || ''
      };
      sessionStorage.setItem('pendingSignup', JSON.stringify(pendingData));
      console.log("Updated sessionStorage with form data");
    }
  };

  const nextStep = () => {
    // Save current form data to sessionStorage before moving to next step
    if (formData.name && formData.email) {
      const pendingData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        tier: formData.tier?.id || '',
        tierName: formData.tier?.name || ''
      };
      sessionStorage.setItem('pendingSignup', JSON.stringify(pendingData));
      console.log("Saved form data to sessionStorage on nextStep");
    }
    setCurrentStep(currentStep + 1);
  };
  
  const prevStep = () => setCurrentStep(currentStep - 1);

  // Store signup data and redirect to payment (account created later)
  const handleTierSelectionComplete = async () => {
    setIsSubmitting(true);
    setError('');
    
    if (!formData.tier) {
      setError('Please select a service tier');
      setIsSubmitting(false);
      return;
    }
    
    // Validate all required fields
    if (!formData.email || !formData.name || !formData.password) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }
    
    try {
      console.log("Tier selected, proceeding to payment page");
      
      // Store signup data in sessionStorage for payment page
      // Account will be created when user clicks "Complete Payment"
      sessionStorage.setItem('pendingSignup', JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        tier: formData.tier.id,
        tierName: formData.tier.name
      }));
      
      console.log("Redirecting to payment page");
      
      // Redirect to payment page (no account created yet)
      router.push('/payment');
      
    } catch (error) {
      console.error('Navigation error:', error);
      setError((error as Error).message);
      setIsSubmitting(false);
    }
  };

  // Render the current step (only 2 steps now: Account Info → Tier Selection)
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
            nextStep={handleTierSelectionComplete} 
            prevStep={prevStep}
            error={error}
            isSubmitting={isSubmitting}
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

  const stepIcons = [UserPlus, Crown];
  const stepTitles = ['Account Info', 'Select Plan'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <AuthHeader />
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
                    <div className="flex items-center justify-center gap-8">
                      {[1, 2].map((step, index) => {
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
                            {step < 2 && (
                              <div className={`
                                w-24 h-0.5 transition-all duration-200
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
      <Footer />
    </div>
  );
}
