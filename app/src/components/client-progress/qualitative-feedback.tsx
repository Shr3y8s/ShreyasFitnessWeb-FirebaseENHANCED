"use client"

import { useState, useEffect } from "react"
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Send, Smile, Meh, Frown, Dumbbell, Utensils, Check, BrainCircuit, Activity, Bed, Sparkles, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  submitWeeklySurveyForWeek,
  getWeeklySurvey, 
  getCurrentWeekRange,
  formatWeekRange,
  getPreviousWeekStart,
  getNextWeekStart,
  getFourWeeksAgo,
  type WeeklySurveyRatings,
  type WeeklySurveyAdherence
} from '@/lib/survey-api'

const ratingCategories = [
    { id: "energy", label: "Energy Levels", icon: <Activity className="h-5 w-5" /> },
    { id: "sleep", label: "Sleep Quality", icon: <Bed className="h-5 w-5" /> },
    { id: "mood", label: "Mood & Motivation", icon: <BrainCircuit className="h-5 w-5" /> },
];

const difficultyCategories = [
    { id: "workouts", label: "Workout Difficulty", icon: <Dumbbell className="h-5 w-5" /> },
    { id: "nutrition", label: "Nutrition Adherence", icon: <Utensils className="h-5 w-5" /> },
];

const getRatingLabel = (value: number) => {
    switch (value) {
        case 1: return { label: "Very Low", icon: <Frown className="h-5 w-5 text-red-500" /> };
        case 2: return { label: "Low", icon: <Meh className="h-5 w-5 text-amber-500" /> };
        case 3: return { label: "Neutral", icon: <Smile className="h-5 w-5 text-yellow-500" /> };
        case 4: return { label: "Good", icon: <Smile className="h-5 w-5 text-green-400" /> };
        case 5: return { label: "Excellent", icon: <Sparkles className="h-5 w-5 text-green-500" /> };
        default: return { label: "Neutral", icon: <Smile className="h-5 w-5" /> };
    }
}

const getDifficultyLabel = (value: number) => {
    switch (value) {
        case 1: return { label: "Very Easy" };
        case 2: return { label: "Easy" };
        case 3: return { label: "Challenging" };
        case 4: return { label: "Hard" };
        case 5: return { label: "Very Hard" };
        default: return { label: "Challenging" };
    }
}

const RatingScale = ({ value, onValueChange }: { value: number; onValueChange: (value: number) => void }) => {
    return (
        <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((num) => (
                <Button
                    key={num}
                    variant={value === num ? "default" : "outline"}
                    size="icon"
                    className={cn(
                        "h-10 w-10 transition-all duration-200",
                        value === num ? "shadow-glow -translate-y-1" : "hover:bg-primary/10"
                    )}
                    onClick={() => onValueChange(num)}
                >
                    {num}
                </Button>
            ))}
        </div>
    );
};

export function QualitativeFeedback() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [selectedWeekStart, setSelectedWeekStart] = useState<string>('');
    const [weekRange, setWeekRange] = useState({ startDate: '', endDate: '' });
    
    const [ratings, setRatings] = useState<{ [key: string]: number }>({
        energy: 3,
        sleep: 3,
        mood: 3,
        workouts: 3,
        nutrition: 3,
    })
    
    const [wins, setWins] = useState('');
    const [challenges, setChallenges] = useState('');

    // Initialize selected week to current week on mount
    useEffect(() => {
        if (!user) return;
        const { startDate } = getCurrentWeekRange();
        setSelectedWeekStart(startDate);
    }, [user]);

    // Load survey data when selected week changes
    useEffect(() => {
        const loadSurveyData = async () => {
            if (!user || !selectedWeekStart) return;
            
            setLoading(true);
            setSubmitSuccess(false); // Clear success message when changing weeks
            
            // Calculate end date for selected week
            const startDate = new Date(selectedWeekStart + 'T00:00:00');
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            
            setWeekRange({
                startDate: selectedWeekStart,
                endDate: endDate.toISOString().split('T')[0]
            });
            
            const existingSurvey = await getWeeklySurvey(user.uid, selectedWeekStart);
            
            if (existingSurvey) {
                setRatings({
                    energy: existingSurvey.ratings.energy,
                    sleep: existingSurvey.ratings.sleep,
                    mood: existingSurvey.ratings.mood,
                    workouts: existingSurvey.adherence.workouts,
                    nutrition: existingSurvey.adherence.nutrition,
                });
                setWins(existingSurvey.wins);
                setChallenges(existingSurvey.challenges);
            } else {
                // Reset to defaults if no survey exists for this week
                setRatings({
                    energy: 3,
                    sleep: 3,
                    mood: 3,
                    workouts: 3,
                    nutrition: 3,
                });
                setWins('');
                setChallenges('');
            }
            
            setLoading(false);
        };
        
        loadSurveyData();
    }, [user, selectedWeekStart]);

    const handleRatingChange = (id: string, value: number) => {
        setRatings(prev => ({ ...prev, [id]: value }))
        setSubmitSuccess(false); // Clear success message when editing
    }
    
    const handleSubmit = async () => {
        if (!user || !selectedWeekStart) return;
        
        setSubmitting(true);
        setSubmitSuccess(false);
        
        const surveyRatings: WeeklySurveyRatings = {
            energy: ratings.energy,
            sleep: ratings.sleep,
            mood: ratings.mood
        };
        
        const surveyAdherence: WeeklySurveyAdherence = {
            workouts: ratings.workouts,
            nutrition: ratings.nutrition
        };
        
        const result = await submitWeeklySurveyForWeek(
            user.uid,
            selectedWeekStart,
            surveyRatings,
            surveyAdherence,
            wins,
            challenges
        );
        
        setSubmitting(false);
        
        if (result.success) {
            setSubmitSuccess(true);
            // Auto-hide success message after 5 seconds
            setTimeout(() => setSubmitSuccess(false), 5000);
        } else {
            alert(`Error submitting survey: ${result.error}`);
        }
    };

    // Helper functions for week navigation
    const handlePreviousWeek = () => {
        const prevWeek = getPreviousWeekStart(selectedWeekStart);
        const minWeek = getFourWeeksAgo();
        if (prevWeek >= minWeek) {
            setSelectedWeekStart(prevWeek);
        }
    };

    const handleNextWeek = () => {
        const nextWeek = getNextWeekStart(selectedWeekStart);
        const currentWeek = getCurrentWeekRange().startDate;
        if (nextWeek <= currentWeek) {
            setSelectedWeekStart(nextWeek);
        }
    };

    const handleJumpToCurrentWeek = () => {
        const { startDate } = getCurrentWeekRange();
        setSelectedWeekStart(startDate);
    };

    // Check if we're viewing the current week
    const isCurrentWeek = selectedWeekStart === getCurrentWeekRange().startDate;
    const isOldestWeek = selectedWeekStart === getFourWeeksAgo();

    return (
        <div className="space-y-6">
            {/* Week Navigation */}
            {selectedWeekStart && (
                <div className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/5 to-primary/10 rounded-lg p-4 shadow-lg">
                    <div className="mb-3 text-center">
                        <p className="text-sm font-semibold text-foreground">
                            Survey for week:{' '}
                            <span className="text-primary">
                                {formatWeekRange(weekRange.startDate, weekRange.endDate)}
                            </span>
                        </p>
                        {!isCurrentWeek && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                ⚠️ You're viewing a past week's survey
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        {/* Previous Week Arrow */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePreviousWeek}
                            disabled={isOldestWeek || loading}
                            className="h-10 w-10 rounded-full transition-all hover:scale-110"
                            title="Previous Week"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>

                        {/* Week Display */}
                        <div className="px-4 py-2 border-2 border-primary/30 rounded-md bg-background text-foreground text-base font-medium min-w-[200px] text-center">
                            Week of {weekRange.startDate && new Date(weekRange.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>

                        {/* Next Week Arrow */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNextWeek}
                            disabled={isCurrentWeek || loading}
                            className="h-10 w-10 rounded-full transition-all hover:scale-110"
                            title="Next Week"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>

                        {/* Jump to Current Week Button - only shown when not on current week */}
                        {!isCurrentWeek && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleJumpToCurrentWeek}
                                className="font-semibold px-4"
                                disabled={loading}
                            >
                                Jump to Current Week
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <Card className="card-hover-lift border-primary/50 animate-fade-in-up">
                <CardHeader>
                    <h3 className="text-xl font-semibold leading-none tracking-tight">Weekly Subjective Feedback</h3>
                    <CardDescription>Rate your experience over the past week. This helps your coach understand how you&apos;re feeling beyond the numbers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {ratingCategories.map(cat => (
                        <div key={cat.id} className="space-y-4">
                             <div className="flex justify-between items-center">
                                <h4 className="font-semibold flex items-center gap-2">{cat.icon} {cat.label}</h4>
                                <div className="flex items-center gap-2 font-semibold">
                                    {getRatingLabel(ratings[cat.id]).icon}
                                    <span>{getRatingLabel(ratings[cat.id]).label}</span>
                                </div>
                            </div>
                            <RatingScale 
                                value={ratings[cat.id]}
                                onValueChange={(value) => handleRatingChange(cat.id, value)}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

             <Card className="card-hover-lift border-primary/50 animate-fade-in-up stagger-1">
                <CardHeader>
                    <h3 className="text-xl font-semibold leading-none tracking-tight">Program Adherence</h3>
                    <CardDescription>How challenging was it to stick to your plan this week?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {difficultyCategories.map(cat => (
                        <div key={cat.id} className="space-y-4">
                             <div className="flex justify-between items-center">
                                <h4 className="font-semibold flex items-center gap-2">{cat.icon} {cat.label}</h4>
                                <div className="font-semibold">{getDifficultyLabel(ratings[cat.id]).label}</div>
                            </div>
                            <RatingScale 
                                value={ratings[cat.id]}
                                onValueChange={(value) => handleRatingChange(cat.id, value)}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="card-hover-lift border-primary/50 gradient-accent-green animate-fade-in-up stagger-2">
                    <CardHeader>
                        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2"><Check className="text-green-500 icon-hover-bounce" /> Wins for the week</h3>
                        <CardDescription>What went well? What are you proud of?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            placeholder="e.g., I hit a new PR on squats, or I stuck to my meal plan every day..."
                            value={wins}
                            onChange={(e) => {
                                setWins(e.target.value);
                                setSubmitSuccess(false);
                            }}
                            disabled={loading || submitting}
                        />
                    </CardContent>
                </Card>
                 <Card className="card-hover-lift border-primary/50 bg-red-50/50 dark:bg-red-950/10 animate-fade-in-up stagger-3">
                    <CardHeader>
                         <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2"><Frown className="text-red-500 icon-hover-bounce" /> Challenges this week</h3>
                        <CardDescription>What was difficult? Where can we improve?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            placeholder="e.g., I struggled with late-night snacking, or I was too tired for my Friday workout..."
                            value={challenges}
                            onChange={(e) => {
                                setChallenges(e.target.value);
                                setSubmitSuccess(false);
                            }}
                            disabled={loading || submitting}
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4 text-center animate-fade-in-up stagger-4">
                {weekRange.startDate && (
                    <p className="text-sm text-muted-foreground">
                        Survey for week: <span className="font-semibold">{formatWeekRange(weekRange.startDate, weekRange.endDate)}</span>
                    </p>
                )}
                
                {submitSuccess && (
                    <div className="flex items-center justify-center gap-2 text-green-600 font-semibold animate-fade-in">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Survey submitted successfully!</span>
                    </div>
                )}
                
                <Button 
                    size="lg" 
                    className="w-full max-w-xs shadow-lg hover:shadow-xl transition-all"
                    onClick={handleSubmit}
                    disabled={loading || submitting || !user}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            {submitSuccess ? 'Update Weekly Check-in' : 'Submit Weekly Check-in'}
                        </>
                    )}
                </Button>
            </div>

        </div>
    )
}
