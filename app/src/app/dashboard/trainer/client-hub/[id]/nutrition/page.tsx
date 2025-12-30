'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar,
  Loader2,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  getClientNutritionApproach,
  getClientNutritionGoals,
  getClientNutritionHabits,
  getDailyMacroLogs,
  getDailyHabitLogs,
  getDailyMacroLog,
  getDailyHabitLog,
  getDailyMealPlanLogs,
  getDailyMealPlanLog,
  getClientWeeklyMealPlan,
  getWaterIntakeData,
  getWaterGoal,
  buildMacroCalendarData,
  buildHabitsCalendarData,
  buildMealPlanCalendarData,
  getDateRangeFromPreset,
  formatDateForDisplay
} from '@/lib/nutrition-tracking-api';
import {
  DateRange,
  DateRangePreset,
  CalendarDayData,
  DailyMacroLog,
  DailyHabitsLog,
  NutritionGoals,
  getAdherenceLevel,
  getAdherenceColor,
  getAdherenceTextColor,
  getAdherenceBgColor,
  getAdherenceBorderColor
} from '@/types/nutrition-tracking';
import { NutritionApproach, NutritionHabit } from '@/types/plan';

export default function TrainerNutritionViewPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;
  const { user, loading: authLoading, canAccessTrainerDashboard } = useAuth();
  
  // Client data
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nutritionDataLoading, setNutritionDataLoading] = useState(true);
  
  // Nutrition approach
  const [approach, setApproach] = useState<NutritionApproach | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [habits, setHabits] = useState<NutritionHabit[] | null>(null);
  const [waterGoal, setWaterGoal] = useState<number | null>(null);
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<any>(null);
  
  // Date range
  const [datePreset, setDatePreset] = useState<DateRangePreset>('week');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPreset('week'));
  
  // Calendar and logs
  const [calendarData, setCalendarData] = useState<CalendarDayData[]>([]);
  const [waterData, setWaterData] = useState<Map<string, number>>(new Map());
  const [dataLoading, setDataLoading] = useState(false);
  
  // Selected day for inspector
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayLog, setSelectedDayLog] = useState<DailyMacroLog | DailyHabitsLog | any | null>(null);
  const [selectedDayWater, setSelectedDayWater] = useState<number | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      if (!canAccessTrainerDashboard) {
        router.push('/dashboard');
        return;
      }

      if (!clientId) {
        router.push('/dashboard/trainer/client-hub');
        return;
      }
      
      try {
        const clientRef = doc(db, 'users', clientId);
        const clientSnap = await getDoc(clientRef);
        
        if (!clientSnap.exists()) {
          console.error('Client not found');
          router.push('/dashboard/trainer/client-hub');
          return;
        }
        
        const data = clientSnap.data();
        setClientData({
          id: clientSnap.id,
          ...data
        });
      } catch (error) {
        console.error('Error fetching client:', error);
        router.push('/dashboard/trainer/client-hub');
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [user, router, authLoading, canAccessTrainerDashboard, clientId]);

  // Fetch nutrition approach and related data
  useEffect(() => {
    const fetchNutritionData = async () => {
      if (!clientId) return;
      
      setNutritionDataLoading(true);
      try {
        const [approachData, goalsData, habitsData, waterGoalData, mealPlanData] = await Promise.all([
          getClientNutritionApproach(clientId),
          getClientNutritionGoals(clientId),
          getClientNutritionHabits(clientId),
          getWaterGoal(clientId),
          getClientWeeklyMealPlan(clientId)
        ]);
        
        setApproach(approachData);
        setGoals(goalsData);
        setHabits(habitsData);
        setWaterGoal(waterGoalData);
        setWeeklyMealPlan(mealPlanData);
      } catch (error) {
        console.error('Error fetching nutrition data:', error);
      } finally {
        setNutritionDataLoading(false);
      }
    };

    if (!loading) {
      fetchNutritionData();
    }
  }, [clientId, loading]);

  // Fetch logs when date range or approach changes
  useEffect(() => {
    const fetchLogs = async () => {
      if (!clientId || !approach) return;
      
      setDataLoading(true);
      
      try {
        if (approach === 'macro_tracking') {
          const logs = await getDailyMacroLogs(clientId, dateRange);
          const calendar = buildMacroCalendarData(logs, dateRange);
          setCalendarData(calendar);
        } else if (approach === 'healthy_habits') {
          const logs = await getDailyHabitLogs(clientId, dateRange);
          const calendar = buildHabitsCalendarData(logs, dateRange);
          setCalendarData(calendar);
        } else if (approach === 'meal_plan') {
          // For meal plan, use meal plan logs
          const logs = await getDailyMealPlanLogs(clientId, dateRange);
          // Count total meals per day from weekly plan
          const totalMealsPerDay = weeklyMealPlan && weeklyMealPlan.length > 0
            ? weeklyMealPlan[0]?.meals?.length || 4
            : 4;
          const calendar = buildMealPlanCalendarData(logs, dateRange, totalMealsPerDay);
          setCalendarData(calendar);
        }
        
        // Fetch water data for all approaches
        const water = await getWaterIntakeData(clientId, dateRange);
        setWaterData(water);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchLogs();
  }, [clientId, approach, dateRange]);

  // Fetch selected day details
  useEffect(() => {
    const fetchDayDetails = async () => {
      if (!clientId || !selectedDate || !approach) return;
      
      setInspectorLoading(true);
      
      try {
        if (approach === 'macro_tracking') {
          const log = await getDailyMacroLog(clientId, selectedDate);
          setSelectedDayLog(log);
        } else if (approach === 'meal_plan') {
          const log = await getDailyMealPlanLog(clientId, selectedDate);
          setSelectedDayLog(log);
        } else if (approach === 'healthy_habits') {
          const log = await getDailyHabitLog(clientId, selectedDate);
          setSelectedDayLog(log);
        }
        
        // Get water for selected date
        setSelectedDayWater(waterData.get(selectedDate) || null);
      } catch (error) {
        console.error('Error fetching day details:', error);
      } finally {
        setInspectorLoading(false);
      }
    };

    fetchDayDetails();
  }, [clientId, selectedDate, approach, waterData]);

  // Handle date preset change
  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    const newRange = getDateRangeFromPreset(preset);
    setDateRange(newRange);
    setSelectedDate(null); // Clear selected date
  };

  // Handle day click
  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  // Loading state
  if (loading || nutritionDataLoading || !clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-stone-600">Loading client nutrition data...</p>
        </div>
      </div>
    );
  }

  // No nutrition approach configured
  if (!approach) {
    return (
      <SidebarProvider>
        <TrainerSidebar currentPage="client-hub" />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb items={[
              { label: 'Client Management' },
              { label: 'Client Hub', href: '/dashboard/trainer/client-hub' },
              { label: clientData.name, href: `/dashboard/trainer/client-hub/${clientId}` },
              { label: 'Nutrition' }
            ]} />
          </div>

          {/* Header */}
            <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
              <h1 className="text-2xl font-bold mb-2">🍎 Nutrition Overview</h1>
              <p className="text-gray-600">{clientData.name}</p>
            </div>

            {/* No approach message */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Nutrition Approach Configured</h3>
                  <p className="text-muted-foreground mb-4">
                    This client doesn't have a nutrition approach assigned yet.
                  </p>
                  <Link
                    href={`/dashboard/trainer/client-hub/${clientId}?tab=plan`}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Configure Nutrition Protocol
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="client-hub" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumb items={[
                { label: 'Client Management' },
                { label: 'Client Hub', href: '/dashboard/trainer/client-hub' },
                { label: clientData.name, href: `/dashboard/trainer/client-hub/${clientId}` },
                { label: 'Nutrition' }
              ]} />
            </div>

            {/* Header */}
          <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">🍎 Nutrition Overview</h1>
                <p className="text-gray-600">{clientData.name}</p>
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  {approach === 'macro_tracking' ? 'Macro Tracking' : 
                   approach === 'healthy_habits' ? 'Healthy Habits' : 
                   'Meal Plan'}
                </span>
              </div>
            </div>
          </div>

          {/* Date Range Selector */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="font-medium text-gray-700">View:</span>
                <div className="flex gap-2 flex-wrap">
                  {(['today', 'week', 'month', '30days'] as DateRangePreset[]).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetChange(preset)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        datePreset === preset
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset === 'today' ? 'Today' :
                       preset === 'week' ? 'Week' :
                       preset === 'month' ? 'Month' :
                       '30 Days'}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar View */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {approach === 'macro_tracking' ? 'Daily Adherence Calendar' :
                 approach === 'healthy_habits' ? 'Habit Completion Calendar' :
                 'Meal Plan Adherence Calendar'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Loading nutrition data...</p>
                </div>
              ) : calendarData.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No nutrition data available for this period</p>
                </div>
              ) : (
                <>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {calendarData.slice(0, 7).map((_, index) => {
                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const startDay = new Date(calendarData[0].date).getDay();
                      const dayIndex = (startDay + index) % 7;
                      return (
                        <div key={index} className="text-center text-sm font-medium text-gray-600 py-2">
                          {dayNames[dayIndex]}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
                    {calendarData.map((day) => {
                      const isSelected = selectedDate === day.date;
                      const adherenceLevel = day.hasData ? day.level : 'red';
                      
                      return (
                        <button
                          key={day.date}
                          onClick={() => handleDayClick(day.date)}
                          className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : `${getAdherenceBorderColor(adherenceLevel)} ${getAdherenceBgColor(adherenceLevel)}`
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-xs text-gray-600 mb-1">
                              {new Date(day.date + 'T00:00:00').getDate()}
                            </div>
                            {day.hasData ? (
                              <>
                                <div className={`text-lg font-bold ${getAdherenceTextColor(adherenceLevel)}`}>
                                  {Math.round(day.adherencePercentage)}%
                                </div>
                                {approach === 'macro_tracking' || approach === 'meal_plan' ? (
                                  <div className="text-xs text-gray-600">
                                    {day.mealsCompleted}/{day.totalMeals}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-600">
                                    {day.habitsCompleted}/{day.totalHabits}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-gray-400">-</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <span className="font-medium">Legend:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span>≥90%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span>70-89%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span>&lt;70% or no data</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Daily Inspector (shown when a date is selected) */}
          {selectedDate && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Daily Data Inspector</CardTitle>
                <p className="text-sm text-muted-foreground">{formatDateForDisplay(selectedDate)}</p>
              </CardHeader>
              <CardContent>
                {inspectorLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </div>
                ) : !selectedDayLog ? (
                  <div className="text-center py-8">
                    <XCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No data logged for this day</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Meal Plan View */}
                    {approach === 'meal_plan' && 'completedMeals' in selectedDayLog && (
                      <>
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl font-bold text-gray-800">
                              {selectedDayLog.completedMeals.length}/{weeklyMealPlan?.[0]?.meals?.length || 4}
                            </span>
                            <span className="text-gray-600">meals completed</span>
                          </div>
                          {selectedDayLog.dayComplete && (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="font-medium">All meals logged for the day</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">
                            Meal Plan Adherence
                          </h4>
                          <div className="space-y-2">
                            {weeklyMealPlan && weeklyMealPlan.length > 0 && (() => {
                              // Get the day of week for selected date
                              const date = new Date(selectedDate + 'T00:00:00');
                              const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                              const dayPlan = weeklyMealPlan.find((d: any) => d.day === dayName);
                              
                              if (!dayPlan) {
                                return <p className="text-sm text-muted-foreground">No meal plan configured for this day</p>;
                              }

                              return dayPlan.meals.map((meal: any) => {
                                const isCompleted = selectedDayLog.completedMeals.includes(meal.name);
                                return (
                                  <div key={meal.name} className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      {isCompleted ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                      ) : (
                                        <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                      )}
                                      <span className="font-medium">{meal.name}</span>
                                    </div>
                                    <ul className="ml-7 space-y-1">
                                      {meal.items.map((item: string, idx: number) => (
                                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                          <span className="text-gray-400">•</span>
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Macro Tracking View */}
                    {approach === 'macro_tracking' && 'meals' in selectedDayLog && (
                      <>
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-2xl font-bold ${getAdherenceTextColor(getAdherenceLevel(selectedDayLog.adherencePercentage))}`}>
                              {Math.round(selectedDayLog.adherencePercentage)}%
                            </span>
                            <span className="text-gray-600">Overall Adherence</span>
                          </div>
                        </div>

                        {/* Macros Breakdown */}
                        {approach === 'macro_tracking' && goals && (
                          <div>
                            <h4 className="font-semibold mb-3">Macros Breakdown</h4>
                            <div className="space-y-3">
                              {/* Calories */}
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Calories</span>
                                  <span className="font-medium">
                                    {selectedDayLog.totalCalories} / {goals.calories} 
                                    ({Math.round((selectedDayLog.totalCalories / (goals.calories || 1)) * 100)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${getAdherenceColor(getAdherenceLevel((selectedDayLog.totalCalories / (goals.calories || 1)) * 100))}`}
                                    style={{ width: `${Math.min((selectedDayLog.totalCalories / (goals.calories || 1)) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Protein */}
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Protein</span>
                                  <span className="font-medium">
                                    {selectedDayLog.totalProtein}g / {goals.protein}g 
                                    ({Math.round((selectedDayLog.totalProtein / (goals.protein || 1)) * 100)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${getAdherenceColor(getAdherenceLevel((selectedDayLog.totalProtein / (goals.protein || 1)) * 100))}`}
                                    style={{ width: `${Math.min((selectedDayLog.totalProtein / (goals.protein || 1)) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Carbs */}
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Carbs</span>
                                  <span className="font-medium">
                                    {selectedDayLog.totalCarbs}g / {goals.carbs}g 
                                    ({Math.round((selectedDayLog.totalCarbs / (goals.carbs || 1)) * 100)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${getAdherenceColor(getAdherenceLevel((selectedDayLog.totalCarbs / (goals.carbs || 1)) * 100))}`}
                                    style={{ width: `${Math.min((selectedDayLog.totalCarbs / (goals.carbs || 1)) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Fat */}
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Fat</span>
                                  <span className="font-medium">
                                    {selectedDayLog.totalFat}g / {goals.fats}g 
                                    ({Math.round((selectedDayLog.totalFat / (goals.fats || 1)) * 100)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${getAdherenceColor(getAdherenceLevel((selectedDayLog.totalFat / (goals.fats || 1)) * 100))}`}
                                    style={{ width: `${Math.min((selectedDayLog.totalFat / (goals.fats || 1)) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Meal Completion */}
                        <div>
                          <h4 className="font-semibold mb-3">
                            Meal Completion: {selectedDayLog.mealsCompleted}/4 meals logged
                          </h4>
                          <div className="space-y-2">
                            {selectedDayLog.meals.breakfast && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">Breakfast</span>
                                  {selectedDayLog.meals.breakfast.time && (
                                    <span className="text-sm text-gray-500">({selectedDayLog.meals.breakfast.time})</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {selectedDayLog.meals.breakfast.calories} cal, 
                                  {selectedDayLog.meals.breakfast.protein}g P, 
                                  {selectedDayLog.meals.breakfast.carbs}g C, 
                                  {selectedDayLog.meals.breakfast.fat}g F
                                </p>
                              </div>
                            )}
                            {selectedDayLog.meals.lunch && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">Lunch</span>
                                  {selectedDayLog.meals.lunch.time && (
                                    <span className="text-sm text-gray-500">({selectedDayLog.meals.lunch.time})</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {selectedDayLog.meals.lunch.calories} cal, 
                                  {selectedDayLog.meals.lunch.protein}g P, 
                                  {selectedDayLog.meals.lunch.carbs}g C, 
                                  {selectedDayLog.meals.lunch.fat}g F
                                </p>
                              </div>
                            )}
                            {selectedDayLog.meals.snack && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">Snack</span>
                                  {selectedDayLog.meals.snack.time && (
                                    <span className="text-sm text-gray-500">({selectedDayLog.meals.snack.time})</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {selectedDayLog.meals.snack.calories} cal, 
                                  {selectedDayLog.meals.snack.protein}g P, 
                                  {selectedDayLog.meals.snack.carbs}g C, 
                                  {selectedDayLog.meals.snack.fat}g F
                                </p>
                              </div>
                            )}
                            {selectedDayLog.meals.dinner && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">Dinner</span>
                                  {selectedDayLog.meals.dinner.time && (
                                    <span className="text-sm text-gray-500">({selectedDayLog.meals.dinner.time})</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {selectedDayLog.meals.dinner.calories} cal, 
                                  {selectedDayLog.meals.dinner.protein}g P, 
                                  {selectedDayLog.meals.dinner.carbs}g C, 
                                  {selectedDayLog.meals.dinner.fat}g F
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Healthy Habits View */}
                    {approach === 'healthy_habits' && 'habits' in selectedDayLog && habits && (
                      <>
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-2xl font-bold ${getAdherenceTextColor(getAdherenceLevel(selectedDayLog.completionPercentage))}`}>
                              {selectedDayLog.completionCount}/{selectedDayLog.totalHabits}
                            </span>
                            <span className="text-gray-600">habits completed</span>
                          </div>
                          {selectedDayLog.streak > 0 && (
                            <div className="flex items-center gap-2 text-orange-600">
                              <span className="text-xl">🔥</span>
                              <span className="font-medium">{selectedDayLog.streak} day streak!</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold mb-3">Daily Habits</h4>
                          <div className="space-y-2">
                            {habits.map((habit) => {
                              const completed = selectedDayLog.habits[habit.id] || false;
                              return (
                                <div key={habit.id} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    {completed ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                    )}
                                    <div>
                                      <p className="font-medium">{habit.title}</p>
                                      {habit.description && (
                                        <p className="text-sm text-gray-600">{habit.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Water Intake (All Approaches) */}
                    <div>
                      <h4 className="font-semibold mb-3">Water Intake</h4>
                      {selectedDayWater ? (
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">💧</div>
                          <div>
                            <p className="text-2xl font-bold">{selectedDayWater}L</p>
                            {waterGoal && (
                              <p className="text-sm text-gray-600">
                                Goal: {waterGoal}L ({Math.round((selectedDayWater / waterGoal) * 100)}%)
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No water intake logged</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Tip */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">💡 Tip</p>
                  <p>Click any day in the calendar to view detailed nutrition data. The color coding helps you quickly identify adherence levels.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
