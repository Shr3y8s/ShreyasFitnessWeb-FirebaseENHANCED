"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChefHat, Lightbulb, Clock, Users, ExternalLink } from 'lucide-react';

interface Resource {
  id: string;
  type: 'recipe' | 'guide' | 'article';
  title: string;
  description: string;
  duration?: string;
  difficulty?: 'Easy' | 'Medium' | 'Advanced';
  category: string;
}

const RESOURCES: Resource[] = [
  {
    id: '1',
    type: 'recipe',
    title: 'High-Protein Breakfast Bowl',
    description: 'Start your day with this nutrient-dense breakfast packed with 40g of protein.',
    duration: '15 min',
    difficulty: 'Easy',
    category: 'Breakfast'
  },
  {
    id: '2',
    type: 'guide',
    title: 'Meal Prep Guide for Beginners',
    description: 'Learn how to efficiently meal prep for the entire week in just 2 hours.',
    duration: '10 min read',
    category: 'Guides'
  },
  {
    id: '3',
    type: 'recipe',
    title: 'Lean Chicken & Quinoa Power Bowl',
    description: 'A perfectly balanced meal with 45g protein, complex carbs, and healthy fats.',
    duration: '25 min',
    difficulty: 'Medium',
    category: 'Lunch/Dinner'
  },
  {
    id: '4',
    type: 'article',
    title: 'Understanding Macronutrients',
    description: 'Complete guide to proteins, carbs, and fats - how much you need and why.',
    duration: '8 min read',
    category: 'Education'
  },
  {
    id: '5',
    type: 'recipe',
    title: 'Post-Workout Protein Smoothie',
    description: 'Quick and delicious smoothie with 30g protein for optimal recovery.',
    duration: '5 min',
    difficulty: 'Easy',
    category: 'Snacks'
  },
  {
    id: '6',
    type: 'guide',
    title: 'Reading Nutrition Labels',
    description: 'Master the art of understanding food labels to make informed choices.',
    duration: '6 min read',
    category: 'Guides'
  }
];

const getIcon = (type: Resource['type']) => {
  switch (type) {
    case 'recipe':
      return ChefHat;
    case 'guide':
      return Lightbulb;
    case 'article':
      return BookOpen;
  }
};

const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty) {
    case 'Easy':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'Medium':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'Advanced':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return '';
  }
};

export function NutritionResources() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Nutrition Resources</h2>
          <p className="text-sm text-muted-foreground">
            Recipes, guides, and educational content to support your journey
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {RESOURCES.map((resource) => {
          const Icon = getIcon(resource.type);
          return (
            <Card key={resource.id} className="hover:shadow-lg transition-all group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {resource.category}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight">{resource.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {resource.description}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {resource.duration && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {resource.duration}
                    </Badge>
                  )}
                  {resource.difficulty && (
                    <Badge className={`text-xs ${getDifficultyColor(resource.difficulty)}`}>
                      {resource.difficulty}
                    </Badge>
                  )}
                </div>
                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                  View {resource.type === 'recipe' ? 'Recipe' : 'Resource'}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Community Recipes</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Browse recipes shared by other clients and contribute your own favorites.
                </p>
                <Button variant="outline" size="sm">
                  Explore Community
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Ask Your Coach</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Have nutrition questions? Your coach is here to provide personalized guidance.
                </p>
                <Button variant="outline" size="sm">
                  Send Message
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
