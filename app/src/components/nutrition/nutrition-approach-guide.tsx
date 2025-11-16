"use client";

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Info, Sparkles, Target, Utensils, ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface NutritionApproach {
  id: string;
  icon: typeof Sparkles;
  title: string;
  badge: string;
  badgeColor: string;
  colorTheme: string;
  shortDescription: string;
  quickBestFor: string;
  fullDescription: string;
  features: string[];
  bestFor: string[];
  requirements: string;
}

const approaches: NutritionApproach[] = [
  {
    id: 'habits',
    icon: Sparkles,
    title: 'The Habit Builder',
    badge: 'Beginner Friendly',
    badgeColor: 'bg-white text-foreground border-foreground/20',
    colorTheme: 'bg-green-100 dark:bg-green-900/30',
    shortDescription: 'Focus on creating sustainable, healthy habits without the stress of strict tracking. We\'ll build a strong foundation for long-term success.',
    quickBestFor: 'Clients new to nutrition, or those looking to improve their relationship with food and build consistency.',
    fullDescription: 'The Habit Builder approach focuses on creating sustainable, healthy eating habits without the complexity of tracking. We\'ll build a strong foundation for long-term success by focusing on daily habits and consistency rather than numbers.',
    features: [
      'Weekly habit check-ins',
      'No calorie counting required',
      'Focus on consistency over perfection',
      'Build foundation first',
      'Gradual progression',
      'Learn nutrition label basics',
    ],
    bestFor: [
      'New to nutrition tracking',
      'Want simple, sustainable changes',
      'Building long-term habits',
      'Prefer simplicity over data',
      'Looking to improve relationship with food',
    ],
    requirements: 'Just commitment to weekly check-ins and building better habits. We\'ll teach you basic nutrition label reading principles if you don\'t already know.',
  },
  {
    id: 'tracking',
    icon: Utensils,
    title: 'The Flexible Tracker',
    badge: 'Flexible & Data-Driven',
    badgeColor: 'bg-white text-foreground border-foreground/20',
    colorTheme: 'bg-blue-100 dark:bg-blue-900/30',
    shortDescription: 'You have the freedom to choose your foods, as long as they fit within your daily calorie and macro targets. This requires accurately logging your intake.',
    quickBestFor: 'Data-driven clients who want flexibility, enjoy tracking numbers, and have some knowledge of nutrition.',
    fullDescription: 'The Flexible Tracker approach gives you complete freedom in your food choices while hitting specific macro and calorie targets. This requires accurately logging your intake and understanding nutrition basics.',
    features: [
      'Freedom to choose foods',
      'Hit daily macro targets',
      'Log meals honestly',
      'Flexibility for on-the-go lifestyle',
      'Learn about food macros',
      'Learn nutrition label basics',
    ],
    bestFor: [
      'On-the-go lifestyle',
      'Enjoy flexibility in food choices',
      'Like working with data and numbers',
      'Prefer variety in meals',
      'Have some nutrition knowledge',
    ],
    requirements: 'Use a tracking app (MyFitnessPal, Cronometer, or your preferred app) to log food honestly. We\'ll teach you basic nutrition label reading if needed. Requires food weighing and accurate tracking.',
  },
  {
    id: 'meal-plan',
    icon: ClipboardCheck,
    title: 'The Structured Eater',
    badge: 'Maximum Control',
    badgeColor: 'bg-white text-foreground border-foreground/20',
    colorTheme: 'bg-purple-100 dark:bg-purple-900/30',
    shortDescription: 'A specific, coach-designed meal plan for the week. This is the most controlled approach, guaranteeing precision for consistent results.',
    quickBestFor: 'Clients who want to remove guesswork, prefer structure, and need the highest level of accountability.',
    fullDescription: 'The Structured Eater approach provides you with a custom weekly meal plan designed around your preferences and goals. This is the most controlled and effective method for consistent weight loss.',
    features: [
      'Custom meal plans weekly',
      'Based on your food preferences and allergies',
      'Most controlled approach',
      'Consistent, guaranteed results',
      'Remove decision fatigue',
    ],
    bestFor: [
      'Want guaranteed results',
      'Prefer structure over flexibility',
      'Serious about consistent weight loss',
      'Ready to commit to meal prep',
      'Want to remove guesswork',
    ],
    requirements: 'Commitment to shopping for, weighing, and eating the foods I assign. Requires meal prep time and following the plan consistently.',
  },
];

export function NutritionApproachGuide() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedApproach, setSelectedApproach] = useState<NutritionApproach | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem('nutrition-guide-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('nutrition-guide-dismissed', 'true');
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleMoreInfo = (approach: NutritionApproach) => {
    setSelectedApproach(approach);
  };

  if (isDismissed && !isExpanded) {
    return (
      <Alert className="bg-green-100 dark:bg-green-900/30 border-primary/20 transition-all hover:-translate-y-1 cursor-pointer">
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm">
            <strong>About Nutrition Approaches:</strong> Choose from Habit Building, Flexible Tracking, or Structured Meal Plans
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleExpand}
            className="ml-4"
          >
            Learn More <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Alert className="border-primary/30 bg-primary/5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2 flex-1">
            <h2 className="text-2xl font-bold">Choose Your Nutrition Approach</h2>
            <p className="text-muted-foreground">
              Each path is designed for a different lifestyle. Choose the one that best fits you.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isDismissed && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleExpand}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {!isDismissed && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <AlertDescription>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {approaches.map((approach) => {
              const Icon = approach.icon;
              return (
                <Card 
                  key={approach.id}
                  className={`p-6 ${approach.colorTheme} border-0`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <Icon className="h-10 w-10 text-foreground" />
                      <Badge variant="outline" className={approach.badgeColor}>
                        {approach.badge}
                      </Badge>
                    </div>
                    
                    <h3 className="text-xl font-bold">{approach.title}</h3>
                    
                    <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
                      {approach.shortDescription}
                    </p>
                    
                    <div>
                      <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                        👤 BEST FOR YOU IF...
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {approach.quickBestFor}
                      </p>
                    </div>
                    
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-foreground hover:text-foreground/80 hover:bg-transparent p-0 h-auto font-normal"
                        onClick={() => handleMoreInfo(approach)}
                      >
                        More Info <Info className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </AlertDescription>
      </Alert>

      <Dialog open={selectedApproach !== null} onOpenChange={() => setSelectedApproach(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedApproach && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-2xl">
                  {(() => {
                    const Icon = selectedApproach.icon;
                    return <Icon className="h-7 w-7 text-primary" />;
                  })()}
                  {selectedApproach.title}
                </DialogTitle>
                <DialogDescription className="text-base pt-2">
                  {selectedApproach.fullDescription}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 pt-4">
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <span className="text-primary">✨</span> Features
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {selectedApproach.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <span className="text-primary">👤</span> Best For
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {selectedApproach.bestFor.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="text-primary">📋</span> Requirements
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedApproach.requirements}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
