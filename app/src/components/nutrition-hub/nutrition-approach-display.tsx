"use client";

import { useState } from 'react';
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
import { Info, Sparkles, Target, Utensils, ClipboardCheck, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import type { NutritionApproach } from '@/types/plan';

interface NutritionApproachData {
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

const approaches: NutritionApproachData[] = [
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

// Map database approach values to UI approach IDs
const approachMap: Record<NutritionApproach, string> = {
  'healthy_habits': 'habits',
  'macro_tracking': 'tracking',
  'meal_plan': 'meal-plan'
};

interface NutritionApproachDisplayProps {
  assignedApproach?: NutritionApproach;
  trainerName?: string;
  assignedDate?: Date | null;
}

export function NutritionApproachDisplay({
  assignedApproach,
  trainerName = 'Your Coach',
  assignedDate
}: NutritionApproachDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedApproach, setSelectedApproach] = useState<NutritionApproachData | null>(null);

  // Get the assigned approach details
  const assignedApproachId = assignedApproach ? approachMap[assignedApproach] : 'tracking';
  const assignedApproachData = approaches.find(a => a.id === assignedApproachId) || approaches[1];

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'recently';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'recently';
    }
  };

  const handleMoreInfo = (approach: NutritionApproachData) => {
    setSelectedApproach(approach);
  };

  const Icon = assignedApproachData.icon;

  return (
    <>
      {/* Hero Card - Assigned Approach */}
      <Card className={`p-6 ${assignedApproachData.colorTheme} border-2 border-primary/30 transition-all duration-300 hover:shadow-glow hover:-translate-y-1`}>
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Icon className="h-12 w-12 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">{assignedApproachData.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Set by {trainerName} on {formatDate(assignedDate)}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary text-primary-foreground">
              Your Approach
            </Badge>
          </div>
          
          <p className="text-base leading-relaxed">
            {assignedApproachData.shortDescription}
          </p>
          
          <div>
            <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-1">
              👤 WHY THIS WORKS FOR YOU
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {assignedApproachData.quickBestFor}
            </p>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground hover:text-foreground/80"
              onClick={() => handleMoreInfo(assignedApproachData)}
            >
              Learn More About This Approach <Info className="ml-2 h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
            >
              {isExpanded ? (
                <>Hide Other Approaches <ChevronUp className="h-4 w-4" /></>
              ) : (
                <>Learn About Other Approaches <ChevronDown className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Educational Section - All Approaches */}
      {isExpanded && (
        <Alert className="border-primary/30 bg-primary/5 mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold mb-2">All Nutrition Approaches</h3>
              <p className="text-sm text-muted-foreground">
                Your coach chose the best approach for you, but here's information about all available methods.
              </p>
            </div>
            
            <AlertDescription>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                {approaches.map((approach) => {
                  const ApproachIcon = approach.icon;
                  const isActive = approach.id === assignedApproachId;
                  
                  return (
                    <Card 
                      key={approach.id}
                      className={`p-6 ${approach.colorTheme} ${isActive ? 'border-2 border-primary' : 'border-0'} relative`}
                    >
                      {isActive && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <ApproachIcon className="h-10 w-10 text-foreground" />
                          {isActive ? (
                            <Badge variant="outline" className="bg-primary text-primary-foreground">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={approach.badgeColor}>
                              {approach.badge}
                            </Badge>
                          )}
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
          </div>
        </Alert>
      )}

      {/* Modal with full details */}
      <Dialog open={selectedApproach !== null} onOpenChange={() => setSelectedApproach(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedApproach && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-2xl">
                  {(() => {
                    const ModalIcon = selectedApproach.icon;
                    return <ModalIcon className="h-7 w-7 text-primary" />;
                  })()}
                  {selectedApproach.title}
                  {selectedApproach.id === assignedApproachId && (
                    <Badge className="ml-2 bg-primary text-primary-foreground">
                      Your Approach
                    </Badge>
                  )}
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
