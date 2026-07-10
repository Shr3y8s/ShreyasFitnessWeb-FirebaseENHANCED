'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, trackEvent } from '@/lib/firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getCheckoutKeyForProductCadence } from '@/lib/constants';

import { loadRecaptcha, executeRecaptcha } from '@/lib/recaptcha';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Check, UserPlus, Crown, Star, Target, Clock, Mail, User } from 'lucide-react';
import EmailStep from './components/EmailStep';
import OTPVerificationStep from './components/OTPVerificationStep';
import DetailsStep from './components/DetailsStep';
import ServiceTierStep from './components/ServiceTierStep';
import { Footer } from '@/components/Footer';
import { MarketingNav } from '@/components/MarketingNav';


// Service tier type - matching Firebase interface
export interface ServiceTier {
  id: string;
  name: string;
  price: number;
  features: string[];
  title?: string;
  description?: string;
  details?: string;
  /** Selected billing cadence (prepay-plans Phase B): 1 = monthly, 3 = quarterly.
   * Subscriptions only; one-time tiers leave this undefined (treated as 1). */
  intervalCount?: number;
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
  // When the chosen email already has an account, we surface an explicit
  // "Go to Login" CTA (Option A) instead of a silent auto-redirect. This holds
  // the checkout-carrying login URL so the button lands the user on payment.
  const [existingAccountLoginUrl, setExistingAccountLoginUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
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
    
    // If step parameter exists, start at that step. `step=plan` (returning from
    // /checkout via the Back button) lands on the 4-package Plan step (step 4).
    if (stepParam) {
      if (stepParam === 'plan') {
        setCurrentStep(4);
      } else {
        const step = parseInt(stepParam);
        if (step === 2) {
          setCurrentStep(2);
        }
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
            
            // Pre-fill form with existing data (not passwords). Also rehydrate the
            // selected tier so that when a just-created, un-activated user returns
            // from /checkout via Back (?step=plan), the 4-package step renders with
            // their prior pick highlighted and they can re-choose.
            setFormData(prev => ({
              ...prev,
              name: userData.name || '',
              email: userData.email || user.email || '',
              phone: userData.phone || '',
              // Rehydrate the tier from Firestore, but PRESERVE the in-memory
              // selection when it's the same product — the user doc only stores
              // tier/tierName (NOT the chosen cadence), so naively rebuilding here
              // would drop `intervalCount` and flash the card back to Monthly on
              // Continue (prepay-plans Phase B). Keep prev.tier when ids match so
              // the quarterly selection (+ features/price) survives.
              tier:
                prev.tier && userData.tier && prev.tier.id === userData.tier
                  ? prev.tier
                  : userData.tier
                    ? {
                        id: userData.tier,
                        name: userData.tierName || '',
                        price: 0,
                        features: [],
                      }
                    : prev.tier,
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

  // Create the Firebase account, then hand off to the GENERIC checkout flow.
  // Per the reusability rule, /checkout assumes an authenticated user and contains
  // NO account-creation logic — so we do reCAPTCHA + auth + the users/{uid} doc
  // HERE, then route to /checkout?item=<key>. `formData.tier.id` is the app
  // product id; CHECKOUT_ITEMS is keyed by app id via getCheckoutKeyForProduct.
  const handleTierSelectionComplete = async () => {
    setIsSubmitting(true);
    setError('');

    if (!formData.tier) {
      setError('Please select a service tier');
      setIsSubmitting(false);
      return;
    }

    // Resolve the checkout item (app id + cadence → CHECKOUT_ITEMS key) before
    // creating anything. The selected BillingPeriod (1 monthly / 3 quarterly) picks
    // the quarterly variant key when applicable (prepay-plans Phase B).
    const itemKey = getCheckoutKeyForProductCadence(
      formData.tier.id,
      formData.tier.intervalCount || 1
    );

    if (!itemKey) {
      setError('This plan is not available for checkout.');
      setIsSubmitting(false);
      return;
    }

    // Two DISTINCT post-checkout destinations (the checkout page reads them as
    // separate params so Back ≠ after-payment):
    //   return → Back/cancel target = the signup Plan step (NOT /dashboard, which
    //            would bounce an un-activated client back to /checkout = loop).
    //   next   → after-PAYMENT target = /dashboard?payment=success, which triggers
    //            the post-signup Welcome landing (plain /dashboard skips straight
    //            to /dashboard/client and never shows Welcome).
    const checkoutBack =
      `/checkout?item=${itemKey}` +
      `&return=${encodeURIComponent('/signup?step=plan')}` +
      `&next=${encodeURIComponent('/dashboard?payment=success')}`;


    // RE-ENTRY PATH (checked FIRST, before field validation): the user returned
    // from /checkout via Back and may have picked a DIFFERENT package. Their
    // account already exists and they're still authenticated, but the form's
    // password isn't in state on re-entry — so we must NOT run the new-signup
    // validation or recreate the account. Use the LIVE auth value (auth.currentUser)
    // to avoid any dependency on the currentUser React-state timing. Just persist
    // the (possibly new) tier and continue to checkout.
    const existingUser = auth.currentUser;
    if (existingUser) {
      try {
        await setDoc(
          doc(db, 'users', existingUser.uid),
          {
            tier: formData.tier.id,
            tierName: formData.tier.name,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        router.push(checkoutBack);
      } catch (e) {
        console.error('Failed to update tier on re-entry:', e);
        setError((e as Error).message);
        setIsSubmitting(false);
      }
      return;
    }

    // NEW SIGNUP: validate all required fields, then create the account.
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
      // reCAPTCHA (best-effort; not fatal if it fails to load).

      let recaptchaToken: string | null = null;
      try {
        await loadRecaptcha();
        recaptchaToken = await executeRecaptcha('create_account');
      } catch (e) {
        console.error('reCAPTCHA failed (continuing):', e);
      }

      // Create the Firebase Auth account.
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
      } catch (authError: any) {
        if (authError?.code === 'auth/email-already-in-use') {
          // Expected, handled case — an account already exists (e.g. a prior signup
          // whose payment failed, or the user signed up before). This is NOT a crash,
          // so log it as info to avoid a scary red console error. Instead of a silent
          // auto-redirect (which the user never sees behind the long plan list), we
          // surface an explicit "Go to Login" CTA (Option A) that carries the checkout
          // target so they land straight on payment after logging in.
          // return='/signup?step=plan' so checkout Back takes them to the 4-package
          // step to re-pick (account already exists → Continue updates tier + returns
          // to checkout); next='/dashboard?payment=success' (Welcome landing after pay).
          console.info('Signup: email already in use — prompting user to log in.');
          const nextUrl =
            `/checkout?item=${itemKey}` +
            `&return=${encodeURIComponent('/signup?step=plan')}` +
            `&next=${encodeURIComponent('/dashboard?payment=success')}`;

          setExistingAccountLoginUrl(`/login?next=${encodeURIComponent(nextUrl)}`);
          setError(
            `An account already exists for ${formData.email}. Please log in to continue — ` +
            `we'll take you straight to checkout.`
          );
        } else {
          console.error('Firebase Auth error:', authError);
          setError(authError?.message || 'Failed to create your account.');
        }
        setIsSubmitting(false);
        return;
      }

      const newUserId = userCredential.user.uid;

      // Write the user doc (account created, payment NOT yet completed).
      await setDoc(doc(db, 'users', newUserId), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        tier: formData.tier.id,        // app product id
        tierName: formData.tier.name,
        emailVerified: emailVerified,
        accountActivated: false,
        gdprDeleted: false,
        role: 'client',
        recaptchaToken: recaptchaToken || null,
        recaptchaVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // GA4 begin_checkout
      trackEvent('begin_checkout', {
        tier: formData.tier.name,
        value: formData.tier.price || 0,
      });

      sessionStorage.removeItem('pendingSignup');

      // Hand off to the generic, reusable checkout (auth now guaranteed).
      router.push(checkoutBack);
    } catch (error) {

      console.error('Account creation / checkout handoff error:', error);
      setError((error as Error).message);
      setIsSubmitting(false);
    }
  };


  // Render the current step (4 steps: Email → OTP → Details → Tier Selection)
  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <EmailStep
            email={formData.email}
            onEmailUpdate={(email) => updateFormData({ email })}
            onCodeSent={nextStep}
          />
        );
      case 2:
        return (
          <OTPVerificationStep
            email={formData.email}
            onVerified={() => {
              setEmailVerified(true);
              nextStep();
            }}
            prevStep={prevStep}
          />
        );
      case 3:
        return (
          <DetailsStep
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
            error={error}
          />
        );
      case 4:
        return (
          <ServiceTierStep 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={handleTierSelectionComplete} 
            prevStep={prevStep}
            error={error}
            loginUrl={existingAccountLoginUrl}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return (
          <EmailStep
            email={formData.email}
            onEmailUpdate={(email) => updateFormData({ email })}
            onCodeSent={nextStep}
          />
        );
    }
  };

  const stepIcons = [UserPlus, Mail, User, Crown];
  const stepTitles = ['Email', 'Verify', 'Details', 'Plan'];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <MarketingNav />
      <div className="container mx-auto flex-1 px-4 pb-8 pt-28">


        
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
              <Card className="shadow-xl border border-emerald-600/20 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]">
                <CardHeader className="pb-6">

                  {/* Progress indicator */}
                  <div className="mb-6">
                    <div className="flex items-center justify-center gap-2 sm:gap-4">
                      {[1, 2, 3, 4].map((step, index) => {
                        const StepIcon = stepIcons[index];
                        return (
                          <div key={step} className="flex items-center">
                            <div className="flex flex-col items-center">
                              <div className={`
                                flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-200
                                ${currentStep >= step 
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' 
                                  : 'bg-gray-100 text-gray-400'
                                }
                              `}>
                                {currentStep > step ? (
                                  <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                                ) : (
                                  <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                )}
                              </div>
                              <div className="mt-2 text-xs font-medium text-gray-600">
                                {stepTitles[index]}
                              </div>
                            </div>
                            {step < 4 && (
                              <div className={`
                                w-8 sm:w-16 h-0.5 transition-all duration-200
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
