"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { MealAccordion, FoodItem, MealCategory } from '@/components/nutrition-hub/meal-accordion';
import { MealPlanView } from '@/components/nutrition-hub/meal-plan-view';
import { NutritionHabitTracker } from '@/components/nutrition-hub/nutrition-habit-tracker';
import { NutritionResources } from '@/components/nutrition-hub/nutrition-resources';
import { NutritionCommandCenter } from '@/components/nutrition-hub/nutrition-command-center';
import { TargetMacrosCard, ActiveStreaksCard, ThisWeekCard, TrendsSummaryCard } from '@/components/nutrition-hub/nutrition-trends-card';
import { Utensils, Target, Sparkles, BookOpen, CheckCircle2, UploadCloud, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion } from '@/components/ui/accordion';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { registerListener, unregisterListener } from '@/lib/listener-registry';
import { getTodayLocal, getDaysAgo } from '@/lib/date-utils';
import { FeatureLockedShell } from '@/components/dashboard/FeatureLockedShell';
import { getClientFeatureAccess } from '@/lib/constants';


const mealCategories: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

// Get today's date in YYYY-MM-DD format
const getTodayDate = getTodayLocal;

// Format date for display
const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

// Get 30 days ago
const getThirtyDaysAgo = () => getDaysAgo(30);

export default function NutritionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userData } = useAuth();
  const [dailyLog, setDailyLog] = useState<Record<MealCategory, FoodItem[]>>({
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snacks: [],
  });
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [dayComplete, setDayComplete] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dailyGoals, setDailyGoals] = useState({
    calories: 2500,
    protein: 180,
    carbs: 250,
    fat: 70
  });
  const [nutritionApproach, setNutritionApproach] = useState<any>(null);
  // True once the clientPlans fetch has completed (regardless of whether an approach
  // was found). Drives the loading gate so the page never spins forever when a client
  // has no nutrition approach configured yet.
  const [planLoaded, setPlanLoaded] = useState(false);
  // Active nutrition tab — controlled so a `?tab=` query param (e.g. from the
  // Resources hub link) can deep-link straight to a specific tab. Empty means
  // "use the approach's default".
  const [activeTab, setActiveTab] = useState('');


  const [trainerName, setTrainerName] = useState('Your Coach');
  const [approachDate, setApproachDate] = useState<Date | null>(null);
  const [streaks, setStreaks] = useState({ proteinStreak: 0, loggingStreak: 0, waterStreak: 0 });
  const [streaksLoading, setStreaksLoading] = useState(true);
  const [weeklyStats, setWeeklyStats] = useState({ avgCalories: 0, avgProtein: 0, daysLogged: 0, totalDays: 7 });
  const [trendsSummary, setTrendsSummary] = useState({ 
    longestStreak: 0, 
    bestWeekDate: '', 
    monthlyGoalsHit: 0, 
    monthlyGoalsTotal: 0 
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to determine visible tabs based on approach
  const getVisibleTabs = (approach: any) => {
    let config;
    switch(approach) {
      case 'healthy_habits':
        config = {
          tabs: ['habits', 'resources'],
          defaultTab: 'habits'
        };
        break;
      case 'macro_tracking':
        config = {
          tabs: ['tracking', 'resources'],
          defaultTab: 'tracking'
        };
        break;
      case 'meal_plan':
        config = {
          tabs: ['meal-plan', 'resources'],
          defaultTab: 'meal-plan'
        };
        break;
      default:
        // Fallback - show all tabs with meal-plan as default
        config = {
          tabs: ['tracking', 'meal-plan', 'habits', 'resources'],
          defaultTab: 'meal-plan'
        };
    }
    
    // Always prefer meal-plan as default if it's available
    if (config.tabs.includes('meal-plan')) {
      config.defaultTab = 'meal-plan';
    }
    
    return config;
  };

  const visibleTabs = getVisibleTabs(nutritionApproach);

  // Load client's nutrition plan (daily goals, approach, trainer info)
  useEffect(() => {
    if (!user) return;

    const loadNutritionPlan = async () => {
      try {
        const planRef = doc(db, 'clientPlans', user.uid);
        const planSnap = await getDoc(planRef);
        
        if (planSnap.exists()) {
          const data = planSnap.data();
          const nutritionProtocol = data.nutritionProtocol;
          
          // Load nutrition approach
          if (nutritionProtocol?.approach) {
            setNutritionApproach(nutritionProtocol.approach);
            setApproachDate(nutritionProtocol.lastUpdated?.toDate() || null);
          }
          
          // Load macro targets if they exist
          if (nutritionProtocol?.macroTracking) {
            const targets = nutritionProtocol.macroTracking;
            setDailyGoals({
              calories: Number(targets.calories) || 2500,
              protein: Number(targets.protein) || 180,
              carbs: Number(targets.carbs) || 250,
              fat: Number(targets.fats) || 70
            });
          }
          
          // Load trainer info
          if (data.trainerId) {
            try {
              // Try trainers collection first
              const trainerRef = doc(db, 'trainers', data.trainerId);
              const trainerSnap = await getDoc(trainerRef);
              
              if (trainerSnap.exists()) {
                const trainerData = trainerSnap.data();
                setTrainerName(trainerData.name || 'Your Coach');
              } else {
                // Fallback to admins collection
                const adminRef = doc(db, 'admins', data.trainerId);
                const adminSnap = await getDoc(adminRef);
                
                if (adminSnap.exists()) {
                  const adminData = adminSnap.data();
                  setTrainerName(adminData.name || 'Your Coach');
                }
              }
            } catch (error) {
              console.error('Error loading trainer info:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading nutrition plan:', error);
      } finally {
        // Mark the plan fetch as complete regardless of outcome, so the loading gate
        // resolves even when the client has no nutrition approach configured yet
        // (otherwise the page spins forever — the `!nutritionApproach` gate never clears).
        setPlanLoaded(true);
      }
    };

    loadNutritionPlan();
  }, [user]);

  // Deep-link support: honor a `?tab=` query param (e.g. from the Resources hub's
  // "Nutrition Resources" link → ?tab=resources) so we can land on a specific tab.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const param = new URLSearchParams(window.location.search).get('tab');
    if (param) setActiveTab(param);
  }, []);

  // Load nutrition log for selected date

  useEffect(() => {
    if (!user || !selectedDate) {
      setLoading(false);
      return;
    }

    const logRef = doc(db, 'nutritionLogs', user.uid, 'meals', selectedDate);

    const unsubscribe = onSnapshot(logRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDailyLog(data.meals || {
          Breakfast: [],
          Lunch: [],
          Dinner: [],
          Snacks: [],
        });
        setDayComplete(data.dayComplete || false);
        setScreenshotUrl(data.screenshotUrl || null);
      } else {
        // Initialize empty log
        setDailyLog({
          Breakfast: [],
          Lunch: [],
          Dinner: [],
          Snacks: [],
        });
        setDayComplete(false);
        setScreenshotUrl(null);
      }
      setLoading(false);
    });

    // Register listener for cleanup on sign out
    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user, selectedDate]); // Watch selectedDate changes

  // OPTIMIZED: Calculate all nutrition metrics (streaks, weekly stats, trends) in one pass
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const calculateAllMetrics = async () => {
      try {
        if (!user) return;

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Fetch all 90 days in parallel (for trends calculation)
        const datePromises = [];
        for (let i = 0; i < 90; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const logRef = doc(db, 'nutritionLogs', user.uid, 'meals', dateStr);
          datePromises.push(
            getDoc(logRef).then(snap => ({ 
              date: dateStr, 
              data: snap.exists() ? snap.data() : null 
            }))
          );
        }

        // Fetch all days in parallel
        const allLogs = await Promise.all(datePromises);
        
        if (!isMounted || !user) return;

        // === CALCULATE STREAKS (last 30 days) ===
        const last30Days = allLogs.slice(0, 30);
        
        // Protein streak
        let proteinStreak = 0;
        for (const log of last30Days) {
          if (log.data) {
            const meals = log.data.meals || {};
            const totalProtein = Object.values(meals).flat().reduce((sum: number, item: any) => sum + (item.protein || 0), 0);
            if (totalProtein >= dailyGoals.protein * 0.9) {
              proteinStreak++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        // Logging streak
        let loggingStreak = 0;
        for (const log of last30Days) {
          if (log.data && log.data.meals) {
            const meals = log.data.meals || {};
            const hasData = Object.values(meals).some((mealItems: any) => mealItems.length > 0);
            if (hasData) {
              loggingStreak++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        // === CALCULATE WEEKLY STATS (last 7 days) ===
        const last7Days = allLogs.slice(0, 7);
        let totalCalories = 0;
        let totalProtein = 0;
        let daysWithData = 0;

        for (const log of last7Days) {
          if (log.data) {
            // Use pre-calculated totals from Firestore (faster than summing meals)
            const dayCalories = log.data.totalCalories || 0;
            const dayProtein = log.data.totalProtein || 0;

            if (dayCalories > 0 || dayProtein > 0) {
              totalCalories += dayCalories;
              totalProtein += dayProtein;
              daysWithData++;
            }
          }
        }

        const avgCalories = daysWithData > 0 ? totalCalories / daysWithData : 0;
        const avgProtein = daysWithData > 0 ? totalProtein / daysWithData : 0;

        // === CALCULATE TRENDS (all 90 days) ===
        // Longest logging streak
        let longestStreak = 0;
        let currentStreakCount = 0;
        
        for (const log of allLogs) {
          if (log.data && log.data.meals) {
            const meals = log.data.meals || {};
            const hasData = Object.values(meals).some((mealItems: any) => mealItems.length > 0);
            if (hasData) {
              currentStreakCount++;
              longestStreak = Math.max(longestStreak, currentStreakCount);
            } else {
              currentStreakCount = 0;
            }
          } else {
            currentStreakCount = 0;
          }
        }

        // Best week (most days logged in 7-day period)
        let bestWeekScore = 0;
        let bestWeekDate = '';
        
        for (let i = 0; i <= allLogs.length - 7; i++) {
          const weekLogs = allLogs.slice(i, i + 7);
          const weekScore = weekLogs.filter(log => {
            if (!log.data) return false;
            const meals = log.data.meals || {};
            return Object.values(meals).some((mealItems: any) => mealItems.length > 0);
          }).length;

          if (weekScore > bestWeekScore) {
            bestWeekScore = weekScore;
            const startDate = new Date(weekLogs[0].date);
            bestWeekDate = `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          }
        }

        // Monthly goals (days this month with protein goal met)
        let monthlyGoalsHit = 0;
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysToCount = Math.min(today.getDate(), daysInMonth);

        for (let day = 1; day <= daysToCount; day++) {
          const date = new Date(currentYear, currentMonth, day);
          const dateStr = date.toISOString().split('T')[0];
          
          const log = allLogs.find(l => l.date === dateStr);
          if (log && log.data) {
            const meals = log.data.meals || {};
            const totalProteinForDay = Object.values(meals).flat().reduce((sum: number, item: any) => sum + (item.protein || 0), 0);
            if (totalProteinForDay >= dailyGoals.protein * 0.9) {
              monthlyGoalsHit++;
            }
          }
        }

        if (!isMounted || !user) return;

        // Update all state at once
        setStreaks(prev => ({ ...prev, proteinStreak, loggingStreak }));
        setWeeklyStats({
          avgCalories,
          avgProtein,
          daysLogged: daysWithData,
          totalDays: 7
        });
        setTrendsSummary({
          longestStreak,
          bestWeekDate,
          monthlyGoalsHit,
          monthlyGoalsTotal: daysToCount
        });
        setStreaksLoading(false);
      } catch (error) {
        if (isMounted && user) {
          console.error('Error calculating metrics:', error);
          setStreaksLoading(false);
        }
      }
    };

    calculateAllMetrics();

    return () => {
      isMounted = false;
    };
  }, [user, dailyGoals]);

  // Calculate water streak from Daily Activities
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const calculateWaterStreak = async () => {
      try {
        if (!user) return;

        const today = new Date();
        let waterStreak = 0;
        let foundAnyWaterData = false;

        console.log('[Water Streak] Starting calculation for user:', user.uid);

        // Check last 30 days for water goal completion
        // Data structure: dailyActivities/{userId}_{date} -> water.amount, water.goal
        for (let i = 0; i < 30; i++) {
          if (!isMounted || !user) return;

          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const docId = `${user.uid}_${dateStr}`;

          console.log(`[Water Streak] Checking day ${i}: ${dateStr}, docId: ${docId}`);

          // Fetch individual day's activities document
          const activitiesRef = doc(db, 'dailyActivities', docId);
          const activitiesSnap = await getDoc(activitiesRef);

          if (activitiesSnap.exists()) {
            const dayData = activitiesSnap.data();
            console.log(`[Water Streak] Found data for ${dateStr}:`, dayData);
            
            // Check if water data exists with nested structure
            if (dayData.water && dayData.water.amount !== undefined && dayData.water.goal !== undefined) {
              foundAnyWaterData = true;
              const waterConsumed = dayData.water.amount;
              const waterGoal = dayData.water.goal;
              const percentage = (waterConsumed / waterGoal) * 100;
              
              console.log(`[Water Streak] ${dateStr}: ${waterConsumed}/${waterGoal} oz (${percentage.toFixed(1)}%)`);
              
              // Check if water goal met (within 90%)
              // Both amount and goal are in the same unit (oz)
              if (waterConsumed >= waterGoal * 0.9) {
                waterStreak++;
                console.log(`[Water Streak] ✓ Goal met! Current streak: ${waterStreak}`);
              } else {
                console.log(`[Water Streak] ✗ Goal not met. Breaking streak.`);
                break;
              }
            } else {
              console.log(`[Water Streak] No water data for ${dateStr}. Water object:`, dayData.water);
              break;
            }
          } else {
            console.log(`[Water Streak] No document found for ${dateStr}`);
            break;
          }
        }

        if (!isMounted || !user) return;

        console.log(`[Water Streak] Final result: ${waterStreak} days. Found any data: ${foundAnyWaterData}`);
        setStreaks(prev => ({ ...prev, waterStreak }));
        setStreaksLoading(false);
      } catch (error) {
        if (isMounted && user) {
          console.error('[Water Streak] Error calculating water streak:', error);
        }
        setStreaksLoading(false);
      }
    };

    calculateWaterStreak();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Save daily log to Firebase with auto-detect completion
  const saveDailyLog = async (meals: Record<MealCategory, FoodItem[]>) => {
    if (!user || !selectedDate) return;

    try {
      const logRef = doc(db, 'nutritionLogs', user.uid, 'meals', selectedDate);
      
      // New completion logic: ALL 4 meal categories must have at least one entry
      const allMealsLogged = mealCategories.every(meal => meals[meal].length > 0);
      const isComplete = allMealsLogged;
      
      // Calculate daily totals
      const totals = Object.values(meals).flat().reduce(
        (acc, item) => {
          acc.calories += item.calories;
          acc.protein += item.protein;
          acc.carbs += item.carbs;
          acc.fat += item.fat;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      
      // Calculate adherence percentage (average of all nutrients vs goals)
      const calorieAdherence = dailyGoals.calories > 0 ? (totals.calories / dailyGoals.calories) * 100 : 0;
      const proteinAdherence = dailyGoals.protein > 0 ? (totals.protein / dailyGoals.protein) * 100 : 0;
      const carbsAdherence = dailyGoals.carbs > 0 ? (totals.carbs / dailyGoals.carbs) * 100 : 0;
      const fatAdherence = dailyGoals.fat > 0 ? (totals.fat / dailyGoals.fat) * 100 : 0;
      const overallAdherence = (calorieAdherence + proteinAdherence + carbsAdherence + fatAdherence) / 4;
      
      // Count meals with at least one entry
      const mealsCompleted = mealCategories.filter(meal => meals[meal].length > 0).length;
      
      await setDoc(logRef, {
        date: selectedDate,
        meals,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        adherencePercentage: Math.round(overallAdherence),
        mealsCompleted,
        dayComplete: isComplete,
        lastUpdated: Timestamp.now(),
      }, { merge: true });
      
      // Update local state
      setDayComplete(isComplete);
    } catch (error) {
      console.error('Error saving daily log:', error);
      toast({
        title: "Error",
        description: "Failed to save your nutrition log.",
        variant: "destructive",
      });
    }
  };

  const dailyTotals = Object.values(dailyLog).flat().reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const updateLog = (meal: MealCategory, updatedItems: FoodItem[]) => {
    const updatedLog = {
      ...dailyLog,
      [meal]: updatedItems
    };
    setDailyLog(updatedLog);
    saveDailyLog(updatedLog);
  };

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !selectedDate) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      // Upload to Firebase Storage: nutritionScreenshots/{userId}/{date}/{filename}
      const storageRef = ref(storage, `nutritionScreenshots/${user.uid}/${selectedDate}/${file.name}`);
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Save URL to Firestore (screenshot upload no longer auto-marks dayComplete —
      // the client uses the separate checkbox for that)
      const logRef = doc(db, 'nutritionLogs', user.uid, 'meals', selectedDate);
      await setDoc(logRef, {
        screenshotUrl: downloadUrl,
        screenshotUploadedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
      }, { merge: true });

      setScreenshotUrl(downloadUrl);
      
      toast({
        title: "Screenshot Uploaded!",
        description: `Your nutrition screenshot for ${formatDateDisplay(selectedDate)} has been uploaded.`,
      });
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload screenshot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Tier gating: in-person clients don't have the Nutrition Hub.
  if (!getClientFeatureAccess(userData?.tier).nutrition) {
    return <FeatureLockedShell feature="nutrition" />;
  }

  // Spin only while data is actually loading (the per-day log listener + the plan
  // fetch). Once both have resolved we render — either the hub (approach set) or the
  // empty state below (no approach yet). Previously this gated on `!nutritionApproach`,
  // which spun forever for clients whose coach hadn't configured a nutrition approach.
  if (loading || !planLoaded) {
    return (
      <SidebarProvider>
        <ClientSidebar
          userName={userData?.name}
          userTier={userData?.tier}
          userProfilePhoto={userData?.profilePhotoSmall || undefined}
          onLogout={handleLogout}
        />
        <SidebarInset>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading nutrition hub...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // No nutrition approach configured yet — show a friendly empty state instead of an
  // infinite spinner or a half-rendered hub (the banner/tabs assume a real approach).
  if (!nutritionApproach) {
    return (
      <SidebarProvider>
        <ClientSidebar
          userName={userData?.name}
          userTier={userData?.tier}
          userProfilePhoto={userData?.profilePhotoSmall || undefined}
          onLogout={handleLogout}
        />
        <SidebarInset>
          <div className="client-surface p-4 sm:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto space-y-6">

              <div className="space-y-2 mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
                  <Utensils className="w-8 h-8 text-primary" />
                  Nutrition Hub
                </h1>
                <p className="text-muted-foreground">
                  Your central place for all things nutrition. Track, plan, and build habits.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-white/60 p-10 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Utensils className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  Your nutrition plan is being set up
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {trainerName} hasn&apos;t finalized your nutrition approach yet. Once it&apos;s
                  ready, you&apos;ll be able to track meals, follow your meal plan, and build
                  habits right here. Check back soon!
                </p>
                <Link href="/dashboard/client/plan" className="inline-block">
                  <Button variant="outline" className="gap-2">
                    View Your Plan
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }


  return (

    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        userProfilePhoto={userData?.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="client-surface p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            <div className="space-y-2 mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
                <Utensils className="w-8 h-8 text-primary"/>
                Nutrition Hub
              </h1>
              <p className="text-muted-foreground">
                Your central place for all things nutrition. Track, plan, and build habits.
              </p>
            </div>
            
            {/* Simple Approach Context Banner */}
            <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-muted-foreground">Your Approach:</span>
                    <span className="text-lg font-bold text-foreground">
                      {nutritionApproach === 'healthy_habits' && '✨ Healthy Habits'}
                      {nutritionApproach === 'macro_tracking' && '📊 Macro Tracking'}
                      {nutritionApproach === 'meal_plan' && '📋 Meal Plan'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {nutritionApproach === 'healthy_habits' && 'Build healthy habits without strict tracking'}
                    {nutritionApproach === 'macro_tracking' && 'Track your macros to hit specific daily targets'}
                    {nutritionApproach === 'meal_plan' && 'Follow your custom weekly meal plan'}
                  </p>
                </div>
                <Link href="/dashboard/client/plan" className="flex-shrink-0">
                  <Button variant="outline" size="sm" className="gap-2">
                    View Full Protocol
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Global Date Navigation - Always visible */}
            <div className="dashboard-card rounded-lg p-4">

              {/* Date context label - above date picker */}
              <div className="mb-3 text-center space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Viewing Nutrition Data for:{' '}
                  <span className="text-primary">{formatDateDisplay(selectedDate)}</span>
                </p>
              {(() => {
                  // Check if ALL 4 meals are logged (matches Firestore completion logic)
                  const allMealsComplete = mealCategories.every(meal => dailyLog[meal].length > 0);
                  
                  if (allMealsComplete) {
                    // ALL meals logged - show green badge
                    return (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full shadow-md animate-scale-in">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-bold text-base">Logging Complete</span>
                      </div>
                    );
                  } else if (screenshotUrl) {
                    // Only screenshot, no manual entries - show blue badge
                    return (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-md animate-scale-in">
                        <UploadCloud className="h-5 w-5" />
                        <span className="font-bold text-base">Screenshot Uploaded</span>
                      </div>
                    );
                  }
                  // Nothing logged - no badge
                  return null;
                })()}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Previous Day Arrow */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const date = new Date(selectedDate);
                    date.setDate(date.getDate() - 1);
                    const newDate = date.toISOString().split('T')[0];
                    if (newDate >= getThirtyDaysAgo()) {
                      setSelectedDate(newDate);
                    }
                  }}
                  disabled={selectedDate <= getThirtyDaysAgo()}
                  className="h-10 w-10 rounded-full transition-all hover:scale-110"
                  title="Previous Day"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                {/* Date Picker */}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getTodayDate()}
                  min={getThirtyDaysAgo()}
                  className="px-4 py-2 border-2 border-primary/30 rounded-md bg-background text-foreground text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />

                {/* Next Day Arrow */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const date = new Date(selectedDate);
                    date.setDate(date.getDate() + 1);
                    const newDate = date.toISOString().split('T')[0];
                    if (newDate <= getTodayDate()) {
                      setSelectedDate(newDate);
                    }
                  }}
                  disabled={selectedDate >= getTodayDate()}
                  className="h-10 w-10 rounded-full transition-all hover:scale-110"
                  title="Next Day"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                {/* Jump to Today Button - only shown when not on today */}
                {selectedDate !== getTodayDate() && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setSelectedDate(getTodayDate())}
                    className="font-semibold px-4"
                  >
                    Jump to Today
                  </Button>
                )}
              </div>
            </div>

            {/* Only show calorie/macro tracking dashboard for macro_tracking approach */}
            {nutritionApproach === 'macro_tracking' && (
              <NutritionCommandCenter
                caloriesConsumed={dailyTotals.calories}
                calorieGoal={dailyGoals.calories}
                proteinConsumed={dailyTotals.protein}
                proteinGoal={dailyGoals.protein}
                carbsConsumed={dailyTotals.carbs}
                carbsGoal={dailyGoals.carbs}
                fatsConsumed={dailyTotals.fat}
                fatsGoal={dailyGoals.fat}
              />
            )}

            <Tabs
              key={nutritionApproach}
              value={activeTab && visibleTabs.tabs.includes(activeTab) ? activeTab : visibleTabs.defaultTab}
              onValueChange={setActiveTab}
            >

              <TabsList className="mb-4 inline-flex items-center justify-center rounded-full bg-secondary p-1">
                {visibleTabs.tabs.includes('tracking') && (
                  <TabsTrigger value="tracking">
                    <Target className="mr-2 h-4 w-4" />
                    Daily Tracking
                  </TabsTrigger>
                )}
                {visibleTabs.tabs.includes('meal-plan') && (
                  <TabsTrigger value="meal-plan">
                    <Utensils className="mr-2 h-4" />
                    Meal Plan
                  </TabsTrigger>
                )}
                {visibleTabs.tabs.includes('habits') && (
                  <TabsTrigger value="habits">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Habits
                  </TabsTrigger>
                )}
                {visibleTabs.tabs.includes('resources') && (
                  <TabsTrigger value="resources">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Resources
                  </TabsTrigger>
                )}
              </TabsList>

              {visibleTabs.tabs.includes('tracking') && (
                <TabsContent value="tracking" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2 space-y-4">
                    <Tabs defaultValue="manual" className="w-full">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Food Log</h2>
                        <TabsList className="bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg p-1">
                          <TabsTrigger 
                            value="manual"
                            className="data-[state=active]:bg-green-200/50 dark:data-[state=active]:bg-green-800/50 data-[state=active]:text-green-900 dark:data-[state=active]:text-green-100 rounded-md px-3 py-1 text-sm"
                          >
                            Log Manually
                          </TabsTrigger>
                          <TabsTrigger 
                            value="screenshot"
                            className="data-[state=active]:bg-green-200/50 dark:data-[state=active]:bg-green-800/50 data-[state=active]:text-green-900 dark:data-[state=active]:text-green-100 rounded-md px-3 py-1 text-sm"
                          >
                            Log in Another App
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="manual">
                        <Accordion type="multiple" defaultValue={mealCategories} className="w-full space-y-4">
                          {mealCategories.map(meal => (
                            <MealAccordion 
                              key={meal}
                              meal={meal}
                              items={dailyLog[meal]}
                              onUpdate={(updatedItems) => updateLog(meal, updatedItems)}
                            />
                          ))}
                        </Accordion>

                        {/* Mark Day Complete button — shown when any data is entered */}
                        {(() => {
                          const hasAnyData = mealCategories.some(meal => dailyLog[meal].length > 0);
                          if (!hasAnyData && !dayComplete) return null;

                          return (
                            <div className="mt-6 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 text-center space-y-2">
                              {dayComplete ? (
                                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 font-semibold">
                                  <CheckCircle2 className="h-5 w-5" />
                                  <span>Day Marked Complete ✓</span>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm text-muted-foreground">
                                    Done logging for today? Mark your day as complete.
                                  </p>
                                  <Button
                                    onClick={async () => {
                                      if (!user || !selectedDate) return;
                                      const logRef = doc(db, 'nutritionLogs', user.uid, 'meals', selectedDate);
                                      await setDoc(logRef, { dayComplete: true, lastUpdated: Timestamp.now() }, { merge: true });
                                      setDayComplete(true);
                                      toast({ title: "Day Complete!", description: "Your nutrition logging is marked as done for today." });
                                    }}
                                    className="gap-2"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Mark Day Complete
                                  </Button>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </TabsContent>

                      <TabsContent value="screenshot">
                        <div className="p-6 bg-secondary/50 border-dashed border-2 rounded-lg space-y-5">
                          <p className="text-sm text-muted-foreground text-center">
                            Tracking your nutrition in another app like MyFitnessPal? Mark your day as complete here, and optionally upload a screenshot for your coach to review.
                          </p>

                          {/* Day Complete Checkbox */}
                          <div 
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                              dayComplete 
                                ? "bg-green-500/10 border-green-500/30" 
                                : "bg-secondary/50 border-border hover:border-primary/30"
                            )}
                            onClick={async () => {
                              if (!user || !selectedDate) return;
                              const newValue = !dayComplete;
                              const logRef = doc(db, 'nutritionLogs', user.uid, 'meals', selectedDate);
                              await setDoc(logRef, { dayComplete: newValue, lastUpdated: Timestamp.now() }, { merge: true });
                              setDayComplete(newValue);
                              if (newValue) {
                                toast({ title: "Day Complete!", description: "Your nutrition is marked as done for today." });
                              }
                            }}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                              dayComplete ? "bg-green-500 border-green-500" : "border-muted-foreground/40"
                            )}>
                              {dayComplete && <CheckCircle2 className="h-4 w-4 text-white" />}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">
                                {dayComplete ? "✓ Day marked as complete" : "Mark day as complete"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {dayComplete ? "Click to undo" : "I've logged my nutrition in another app today"}
                              </p>
                            </div>
                          </div>

                          {/* Screenshot Upload (Optional) */}
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">
                              📷 Upload screenshot <span className="text-xs">(optional — for your coach to review)</span>
                            </p>

                            {screenshotUrl && (
                              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 flex items-center gap-2 text-blue-800 dark:text-blue-200 text-sm">
                                <UploadCloud className="h-4 w-4" />
                                <span>Screenshot uploaded ✓</span>
                              </div>
                            )}

                            <div className="flex flex-col items-center gap-3">
                              <Input 
                                id="screenshot" 
                                type="file" 
                                className="hidden" 
                                onChange={handleScreenshotUpload} 
                                accept="image/*" 
                                ref={fileInputRef}
                                disabled={uploading}
                              />
                              <Label 
                                htmlFor="screenshot" 
                                className={cn(
                                  "w-full max-w-sm",
                                  uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                                  buttonVariants({ variant: "outline" })
                                )}
                              >
                                {uploading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    {screenshotUrl ? "Replace Screenshot" : "Upload Screenshot"}
                                  </>
                                )}
                              </Label>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <div className="lg:col-span-1 space-y-4">
                    <TargetMacrosCard 
                      calories={dailyGoals.calories}
                      protein={dailyGoals.protein}
                      carbs={dailyGoals.carbs}
                      fat={dailyGoals.fat}
                    />
                    <ActiveStreaksCard 
                      proteinStreak={streaks.proteinStreak}
                      loggingStreak={streaks.loggingStreak}
                      waterStreak={streaks.waterStreak}
                      isLoading={streaksLoading}
                      nutritionApproach={nutritionApproach}
                    />
                    <ThisWeekCard 
                      avgCalories={weeklyStats.avgCalories}
                      avgProtein={weeklyStats.avgProtein}
                      daysLogged={weeklyStats.daysLogged}
                      totalDays={weeklyStats.totalDays}
                    />
                    <TrendsSummaryCard 
                      longestStreak={trendsSummary.longestStreak}
                      bestWeekDate={trendsSummary.bestWeekDate}
                      monthlyGoalsHit={trendsSummary.monthlyGoalsHit}
                      monthlyGoalsTotal={trendsSummary.monthlyGoalsTotal}
                    />
                  </div>
                </div>
                </TabsContent>
              )}

              {visibleTabs.tabs.includes('meal-plan') && (
                <TabsContent value="meal-plan" className="mt-6">
                  <MealPlanView selectedDate={selectedDate} />
                </TabsContent>
              )}

              {visibleTabs.tabs.includes('habits') && (
                <TabsContent value="habits" className="mt-6">
                  <NutritionHabitTracker selectedDate={selectedDate} />
                </TabsContent>
              )}

              {visibleTabs.tabs.includes('resources') && (
                <TabsContent value="resources" className="mt-6">
                  <NutritionResources />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
