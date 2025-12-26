"use client"

import { useState, useEffect } from "react"
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Send, Smile, Meh, Frown, Dumbbell, Utensils, Check, BrainCircuit, Activity, Bed, Sparkles, UploadCloud, Info, Loader2, CheckCircle2 } from "lucide-react"
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  submitWeeklySurvey, 
  getCurrentWeekSurvey, 
  getCurrentWeekRange,
  formatWeekRange,
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

const placeholderImages = {
    before: {
        src: "https://picsum.photos/seed/progress1/600/800",
        alt: "Before progress photo"
    },
    after: {
        src: "https://picsum.photos/seed/progress2/600/800",
        alt: "After progress photo"
    }
}

export function QualitativeFeedback() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
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

    // Load existing survey data for current week
    useEffect(() => {
        const loadSurveyData = async () => {
            if (!user) return;
            
            setLoading(true);
            const range = getCurrentWeekRange();
            setWeekRange(range);
            
            const existingSurvey = await getCurrentWeekSurvey(user.uid);
            
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
            }
            
            setLoading(false);
        };
        
        loadSurveyData();
    }, [user]);

    const handleRatingChange = (id: string, value: number) => {
        setRatings(prev => ({ ...prev, [id]: value }))
        setSubmitSuccess(false); // Clear success message when editing
    }
    
    const handleSubmit = async () => {
        if (!user) return;
        
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
        
        const result = await submitWeeklySurvey(
            user.uid,
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

    return (
        <div className="space-y-6">
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

            <Card className="card-hover-lift border-primary/50 mt-8 animate-fade-in-up stagger-5">
            <CardHeader className="relative">
                <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                    Progress Photos (Optional)
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">Visual progress is one of the best motivators! We recommend taking photos monthly in consistent lighting.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </h3>
                <CardDescription>Seeing is believing. Track your transformation visually.</CardDescription>
                <Button variant="outline" size="sm" className="absolute top-4 right-4 hover:scale-105 transition-transform">
                    <UploadCloud className="mr-2 h-4 w-4 icon-hover-bounce" />
                    Upload New Photo
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="aspect-[4/3] relative rounded-lg overflow-hidden border hover:scale-105 transition-transform duration-300 cursor-pointer">
                             <Image src={placeholderImages.before.src} alt={placeholderImages.before.alt} fill={true} style={{ objectFit: 'cover' }} />
                        </div>
                        <p className="text-center text-sm font-medium text-muted-foreground">July 15, 2024</p>
                    </div>
                     <div className="space-y-2">
                        <div className="aspect-[4/3] relative rounded-lg overflow-hidden border hover:scale-105 transition-transform duration-300 cursor-pointer">
                           <Image src={placeholderImages.after.src} alt={placeholderImages.after.alt} fill={true} style={{ objectFit: 'cover' }} />
                        </div>
                        <p className="text-center text-sm font-medium text-muted-foreground">August 15, 2024</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        </div>
    )
}
