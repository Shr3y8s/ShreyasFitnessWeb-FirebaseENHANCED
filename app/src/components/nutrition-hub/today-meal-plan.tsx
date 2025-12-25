"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Calendar, Send, Utensils } from "lucide-react";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, onSnapshot, Timestamp, serverTimestamp } from 'firebase/firestore';
import { registerListener, unregisterListener } from '@/lib/listener-registry';
import { useToast } from '@/hooks/use-toast';

interface Meal {
  name: string;
  items: string[];
}

interface DayMealPlan {
  day: string;
  meals: Meal[];
}

interface CheckedMeals {
  [key: string]: boolean;
}

interface TodayMealPlanProps {
  weeklyMealPlan: DayMealPlan[];
}

export function TodayMealPlan({ weeklyMealPlan }: TodayMealPlanProps) {
  const [checkedMeals, setCheckedMeals] = useState<CheckedMeals>({});
  const [currentDay, setCurrentDay] = useState<string>('');
  const [todayDate, setTodayDate] = useState<string>('');
  const [noteContent, setNoteContent] = useState('');
  const [sending, setSending] = useState(false);
  
  const { user, userData } = useAuth();
  const { toast } = useToast();

  // Set current day and date
  useEffect(() => {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    setCurrentDay(day);
    setTodayDate(dateStr);
  }, []);

  // Load saved meal plan adherence from Firestore
  useEffect(() => {
    if (!user || !todayDate) return;

    const adherenceRef = doc(db, 'nutritionLogs', user.uid, 'mealPlans', todayDate);
    
    const unsubscribe = onSnapshot(adherenceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const completedMeals = data.completedMeals || [];
        
        // Convert array to object format for state
        const checkedState: CheckedMeals = {};
        completedMeals.forEach((mealName: string) => {
          checkedState[mealName] = true;
        });
        setCheckedMeals(checkedState);
      } else {
        setCheckedMeals({});
      }
    });

    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user, todayDate]);

  const handleSendNote = async () => {
    if (!user || !noteContent.trim()) return;

    const trainerId = userData?.assignedTrainerId;
    if (!trainerId) {
      toast({
        title: "No Coach Assigned",
        description: "You don't have a coach assigned yet.",
        variant: "destructive",
      });
      return;
    }

    const messageText = noteContent.trim();
    const conversationId = [user.uid, trainerId].sort().join('_');

    setSending(true);
    try {
      await addDoc(collection(db, 'client_messages'), {
        conversationId,
        senderId: user.uid,
        senderName: userData?.name || 'Client',
        recipientId: trainerId,
        content: messageText,
        createdAt: serverTimestamp(),
        read: false
      });

      toast({
        title: "Message Sent!",
        description: "Your coach will receive your note.",
      });
      
      setNoteContent('');
    } catch (error) {
      console.error('Error sending note:', error);
      toast({
        title: "Failed to Send",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const dayPlan = useMemo(() => {
    return weeklyMealPlan.find(p => p.day === currentDay);
  }, [currentDay, weeklyMealPlan]);

  const handleCheckedChange = async (mealName: string, checked: boolean) => {
    if (!user || !todayDate) return;

    // Update local state immediately for responsive UI
    const updatedChecked = { ...checkedMeals, [mealName]: checked };
    setCheckedMeals(updatedChecked);

    // Get list of completed meals
    const completedMeals = Object.keys(updatedChecked).filter(key => updatedChecked[key]);
    
    // Check if all meals are completed
    const totalMeals = dayPlan?.meals.length || 0;
    const dayComplete = completedMeals.length === totalMeals && totalMeals > 0;

    // Save to Firestore
    try {
      const adherenceRef = doc(db, 'nutritionLogs', user.uid, 'mealPlans', todayDate);
      await setDoc(adherenceRef, {
        completedMeals,
        dayComplete,
        lastUpdated: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving meal plan adherence:', error);
      toast({
        title: "Error",
        description: "Failed to save meal completion. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!dayPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading today&apos;s plan...</p>
        </CardContent>
      </Card>
    );
  }

  const totalMeals = dayPlan.meals.length;
  const completedMeals = Object.values(checkedMeals).filter(Boolean).length;
  const progress = totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0;
  const isDayComplete = progress === 100;

  return (
    <Card className={cn("border-primary/50 flex flex-col transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5", isDayComplete && "bg-green-500/10 border-green-500/20")}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today&apos;s Plan: {dayPlan.day}
            </CardTitle>
            <CardDescription>Check off your meals as you complete them.</CardDescription>
          </div>
          {isDayComplete && (
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-100/80 animate-pulse-badge">
              <CheckCircle2 className="mr-1 h-3 w-3 animate-scale-in" />
              Day Complete!
            </Badge>
          )}
        </div>
        <div className="pt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-right text-xs text-muted-foreground mt-1">{Math.round(progress)}% Complete</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {/* 2x2 Grid Layout for Meals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dayPlan.meals.map((meal) => {
            const isMealChecked = !!checkedMeals[meal.name];
            return (
              <div 
                key={meal.name} 
                className={cn(
                  "p-4 rounded-lg border transition-all duration-300",
                  isMealChecked 
                    ? "bg-background/50 border-muted scale-[0.98] opacity-75" 
                    : "bg-secondary/50 border-secondary hover:bg-secondary hover:shadow-sm"
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Checkbox
                    id={`today-${meal.name}`}
                    checked={isMealChecked}
                    onCheckedChange={(checked) => handleCheckedChange(meal.name, !!checked)}
                    className="transition-transform duration-200 data-[state=checked]:scale-110"
                  />
                  <label
                    htmlFor={`today-${meal.name}`}
                    className={cn(
                      "font-semibold text-sm text-primary cursor-pointer transition-all duration-300",
                      isMealChecked && "line-through text-muted-foreground"
                    )}
                  >
                    {meal.name}
                  </label>
                </div>
                <ul className="space-y-1.5 pl-7">
                  {meal.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
                      <span className={cn(
                        "text-sm text-muted-foreground leading-tight",
                        isMealChecked && "line-through text-muted-foreground/50"
                      )}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="bg-secondary/50 p-4 border-t mt-auto">
        <div className="w-full space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Notes for your coach
          </h4>
          <Textarea 
            placeholder="e.g., 'Can I swap the chicken for fish in this meal?'" 
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            disabled={sending}
          />
          <Button 
            className="w-full"
            onClick={handleSendNote}
            disabled={!noteContent.trim() || sending}
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? 'Sending...' : 'Send Note to Coach'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
