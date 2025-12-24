"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { MealAccordion, FoodItem, MealCategory } from '@/components/nutrition-hub/meal-accordion';
import { MealPlanView } from '@/components/nutrition-hub/meal-plan-view';
import { NutritionHabitTracker } from '@/components/nutrition-hub/nutrition-habit-tracker';
import { NutritionResources } from '@/components/nutrition-hub/nutrition-resources';
import { NutritionCommandCenter } from '@/components/nutrition-hub/nutrition-command-center';
import { TargetMacrosCard, ActiveStreaksCard, ThisWeekCard, TrendsSummaryCard } from '@/components/nutrition-hub/nutrition-trends-card';
import { NutritionApproachDisplay } from '@/components/nutrition-hub/nutrition-approach-display';
import { Utensils, Target, Sparkles, BookOpen, CheckCircle2, UploadCloud } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion } from '@/components/ui/accordion';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { registerListener, unregisterListener } from '@/lib/listener-registry';

const mealCategories: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

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
  const [dayComplete, setDayComplete] = useState(false);
  const [waterIntake, setWaterIntake] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [dailyGoals, setDailyGoals] = useState({
    calories: 2500,
    protein: 180,
    carbs: 250,
    fat: 70,
    water: 128 // 1 gallon in oz
  });
  const [nutritionApproach, setNutritionApproach] = useState<any>(null);
  const [trainerName, setTrainerName] = useState('Your Coach');
  const [approachDate, setApproachDate] = useState<Date | null>(null);
  const [streaks, setStreaks] = useState({ proteinStreak: 0, loggingStreak: 0, waterStreak: 0 });
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
              fat: Number(targets.fats) || 70,
              water: 128
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
      }
    };

    loadNutritionPlan();
  }, [user]);

  // Load today's nutrition log
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const todayDate = getTodayDate();
    const logRef = doc(db, 'nutritionLogs', user.uid, 'daily', todayDate);

    const unsubscribe = onSnapshot(logRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDailyLog(data.meals || {
          Breakfast: [],
          Lunch: [],
          Dinner: [],
          Snacks: [],
        });
        setWaterIntake(data.waterIntake || 0);
        setDayComplete(data.dayComplete || false);
      } else {
        // Initialize empty log
        setDailyLog({
          Breakfast: [],
          Lunch: [],
          Dinner: [],
          Snacks: [],
        });
        setWaterIntake(0);
        setDayComplete(false);
      }
      setLoading(false);
    });

    // Register listener for cleanup on sign out
    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user]);

  // Calculate weekly stats
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const calculateWeeklyStats = async () => {
      try {
        if (!user) return;

        const today = new Date();
        let totalCalories = 0;
        let totalProtein = 0;
        let daysWithData = 0;

        // Load last 7 days
        for (let i = 0; i < 7; i++) {
          if (!isMounted || !user) return;

          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const logRef = doc(db, 'nutritionLogs', user.uid, 'daily', dateStr);
          const logSnap = await getDoc(logRef);

          if (logSnap.exists()) {
            const data = logSnap.data();
            const meals = data.meals || {};
            
            // Calculate daily totals
            let dayCalories = 0;
            let dayProtein = 0;
            
            Object.values(meals).forEach((mealItems: any) => {
              mealItems.forEach((item: any) => {
                dayCalories += item.calories || 0;
                dayProtein += item.protein || 0;
              });
            });

            if (dayCalories > 0 || dayProtein > 0) {
              totalCalories += dayCalories;
              totalProtein += dayProtein;
              daysWithData++;
            }
          }
        }

        if (!isMounted || !user) return;

        const avgCalories = daysWithData > 0 ? totalCalories / daysWithData : 0;
        const avgProtein = daysWithData > 0 ? totalProtein / daysWithData : 0;

        setWeeklyStats({
          avgCalories,
          avgProtein,
          daysLogged: daysWithData,
          totalDays: 7
        });
      } catch (error) {
        if (isMounted && user) {
          console.error('Error calculating weekly stats:', error);
        }
      }
    };

    calculateWeeklyStats();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Calculate trends summary (longest streak, best week, monthly goals)
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const calculateTrends = async () => {
      try {
        if (!user) return;

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Load last 90 days for comprehensive trend analysis
        const allLogs = [];
        for (let i = 0; i < 90; i++) {
          if (!isMounted || !user) return;

          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const logRef = doc(db, 'nutritionLogs', user.uid, 'daily', dateStr);
          const logSnap = await getDoc(logRef);

          if (logSnap.exists()) {
            allLogs.push({ date: dateStr, data: logSnap.data() });
          } else {
            allLogs.push({ date: dateStr, data: null });
          }
        }

        if (!isMounted || !user) return;

        // Calculate longest logging streak
        let longestStreak = 0;
        let currentStreak = 0;
        
        for (const log of allLogs) {
          if (log.data && log.data.meals) {
            const meals = log.data.meals || {};
            const hasData = Object.values(meals).some((mealItems: any) => mealItems.length > 0);
            if (hasData) {
              currentStreak++;
              longestStreak = Math.max(longestStreak, currentStreak);
            } else {
              currentStreak = 0;
            }
          } else {
            currentStreak = 0;
          }
        }

        // Find best week (most days logged in 7-day period)
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
            // Format the start date of this week
            const startDate = new Date(weekLogs[0].date);
            bestWeekDate = `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          }
        }

        // Calculate monthly goals hit (days this month with protein goal met)
        let monthlyGoalsHit = 0;
        let monthlyGoalsTotal = 0;

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        
        // Only count days up to today
        const daysToCount = Math.min(today.getDate(), daysInMonth);
        monthlyGoalsTotal = daysToCount;

        for (let day = 1; day <= daysToCount; day++) {
          const date = new Date(currentYear, currentMonth, day);
          const dateStr = date.toISOString().split('T')[0];
          
          const log = allLogs.find(l => l.date === dateStr);
          if (log && log.data) {
            const meals = log.data.meals || {};
            const totalProtein = Object.values(meals).flat().reduce((sum: number, item: any) => sum + (item.protein || 0), 0);
            if (totalProtein >= dailyGoals.protein * 0.9) {
              monthlyGoalsHit++;
            }
          }
        }

        if (!isMounted || !user) return;

        setTrendsSummary({
          longestStreak,
          bestWeekDate,
          monthlyGoalsHit,
          monthlyGoalsTotal
        });
      } catch (error) {
        if (isMounted && user) {
          console.error('Error calculating trends:', error);
        }
      }
    };

    calculateTrends();

    return () => {
      isMounted = false;
    };
  }, [user, dailyGoals]);

  // Calculate streaks
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const calculateStreaks = async () => {
      try {
        // Double check user is still available
        if (!user) return;

        const today = new Date();
        const logs = [];
        
        // Load last 30 days to calculate streaks
        for (let i = 0; i < 30; i++) {
          // Check if component is still mounted and user still exists
          if (!isMounted || !user) return;

          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const logRef = doc(db, 'nutritionLogs', user.uid, 'daily', dateStr);
          const logSnap = await getDoc(logRef);
          
          if (logSnap.exists()) {
            logs.push({ date: dateStr, data: logSnap.data() });
          } else {
            logs.push({ date: dateStr, data: null });
          }
        }

        // Final check before setting state
        if (!isMounted || !user) return;

        // Calculate protein streak
        let proteinStreak = 0;
        for (const log of logs) {
          if (log.data) {
            const meals = log.data.meals || {};
            const totalProtein = Object.values(meals).flat().reduce((sum: number, item: any) => sum + (item.protein || 0), 0);
            if (totalProtein >= dailyGoals.protein * 0.9) { // Within 90% of goal
              proteinStreak++;
            } else {
              break;
            }
          } else {
            break;
          }
        }

        // Calculate logging streak
        let loggingStreak = 0;
        for (const log of logs) {
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

        // Calculate water streak
        let waterStreak = 0;
        for (const log of logs) {
          if (log.data && log.data.waterIntake >= dailyGoals.water * 0.8) { // Within 80% of goal
            waterStreak++;
          } else {
            break;
          }
        }

        setStreaks({ proteinStreak, loggingStreak, waterStreak });
      } catch (error) {
        // Only log error if component is still mounted (not during logout)
        if (isMounted && user) {
          console.error('Error calculating streaks:', error);
        }
      }
    };

    calculateStreaks();

    return () => {
      isMounted = false;
    };
  }, [user, dailyGoals]);

  // Save daily log to Firebase
  const saveDailyLog = async (meals: Record<MealCategory, FoodItem[]>, water: number) => {
    if (!user) return;

    try {
      const todayDate = getTodayDate();
      const logRef = doc(db, 'nutritionLogs', user.uid, 'daily', todayDate);
      
      await setDoc(logRef, {
        meals,
        waterIntake: water,
        dayComplete,
        lastUpdated: Timestamp.now(),
      }, { merge: true });
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
    saveDailyLog(updatedLog, waterIntake);
  };

  const handleAddWater = () => {
    if (waterIntake < dailyGoals.water) {
      const newWater = waterIntake + 16;
      setWaterIntake(newWater);
      saveDailyLog(dailyLog, newWater);
    }
  };

  const handleRemoveWater = () => {
    if (waterIntake > 0) {
      const newWater = Math.max(0, waterIntake - 16);
      setWaterIntake(newWater);
      saveDailyLog(dailyLog, newWater);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      toast({
        title: "File Selected",
        description: `${file.name} is ready for upload.`,
      });
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleMarkComplete = async () => {
    if (!user) return;

    try {
      const todayDate = getTodayDate();
      const logRef = doc(db, 'nutritionLogs', user.uid, 'daily', todayDate);
      
      await setDoc(logRef, {
        dayComplete: true,
        lastUpdated: Timestamp.now(),
      }, { merge: true });

      setDayComplete(true);
      toast({
        title: "Day Complete!",
        description: "You've marked your nutrition as complete for the day.",
      });
    } catch (error) {
      console.error('Error marking day complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark day as complete.",
        variant: "destructive",
      });
    }
  };

  if (loading || !nutritionApproach) {
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

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        userProfilePhoto={userData?.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen text-foreground p-4 sm:p-6 lg:p-8 bg-primary/5">
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
                waterConsumed={waterIntake}
                waterGoal={dailyGoals.water}
                onAddWater={handleAddWater}
                onRemoveWater={handleRemoveWater}
              />
            )}

            <NutritionApproachDisplay 
              assignedApproach={nutritionApproach}
              trainerName={trainerName}
              assignedDate={approachDate}
            />

            <Tabs key={nutritionApproach} defaultValue={visibleTabs.defaultTab}>
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
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Today&apos;s Food Log</h2>
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
                            Upload Screenshot
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
                      </TabsContent>

                      <TabsContent value="screenshot">
                        <div className="p-6 bg-secondary/50 border-dashed border-2 rounded-lg text-center space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Using another app like MyFitnessPal? Upload a screenshot of your daily log here for your coach to review.
                          </p>
                          <div className="flex flex-col items-center gap-4">
                            <Input 
                              id="screenshot" 
                              type="file" 
                              className="hidden" 
                              onChange={handleFileUpload} 
                              accept="image/*" 
                              ref={fileInputRef}
                            />
                            <Label 
                              htmlFor="screenshot" 
                              className={cn(
                                "w-full max-w-sm cursor-pointer",
                                buttonVariants({ variant: "outline" })
                              )}
                            >
                              <UploadCloud className="mr-2 h-4 w-4" />
                              {fileName ? `Selected: ${fileName}` : "Choose Screenshot"}
                            </Label>
                            <Button 
                              onClick={handleMarkComplete}
                              className="w-full max-w-sm"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark Day as Complete
                            </Button>
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
                  <MealPlanView />
                </TabsContent>
              )}

              {visibleTabs.tabs.includes('habits') && (
                <TabsContent value="habits" className="mt-6">
                  <NutritionHabitTracker />
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
