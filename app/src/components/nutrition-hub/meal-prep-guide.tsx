"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChefHat,
  ChevronDown, 
  ChevronUp,
  Heart,
  MessageCircle,
  ShoppingBag,
  Container,
  Flame,
  AlertCircle
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function MealPrepGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ChefHat className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-xl">Meal Prep Guide for Beginners</CardTitle>
            </div>
            <CardDescription>
              Learn to prep your meals to save time and keep you consistent towards your goals
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Why Your Plan Works - Communication First! */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border-2 border-blue-300 dark:border-blue-700">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-2">💙 Why Your Plan Works</p>
                <p className="text-sm mb-3">
                  This structured meal plan is a <strong>tool to get you to your goals faster</strong> - not something you&apos;re on forever.
                </p>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium mb-1">Why I give you exact portions:</p>
                    <ul className="space-y-0.5 ml-4">
                      <li>• Removes variables and guesswork</li>
                      <li>• Fast tracks your results</li>
                      <li>• Keeps you consistent</li>
                    </ul>
                  </div>

                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded">
                    <p className="font-medium mb-1">But here&apos;s the key:</p>
                    <ul className="space-y-0.5 ml-4">
                      <li>• <strong>These aren&apos;t cookie-cutter plans</strong> - yours is built FOR YOU</li>
                      <li>• <strong>Tell me what you enjoy</strong> during our consultations and check-ins</li>
                      <li>• <strong>Not enjoying something? Tell me immediately</strong> - I&apos;ll swap it out</li>
                      <li>• <strong>Your favorite foods? I&apos;ll work them in</strong></li>
                    </ul>
                  </div>

                  <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg border-2 border-orange-300">
                    <div className="flex items-start gap-2">
                      <MessageCircle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm mb-1">💬 Communication is everything:</p>
                        <ul className="space-y-0.5 ml-4 text-sm">
                          <li>• Plans only work if you stick to them</li>
                          <li>• You&apos;ll only stick to them if you enjoy them</li>
                          <li>• I can&apos;t help you if you don&apos;t tell me what&apos;s working/what&apos;s not</li>
                          <li>• <strong>I&apos;m here to make YOU better</strong> - help me do that by staying in touch</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Accordion type="multiple" className="w-full space-y-2">
            {/* The Meal Prep Basics */}
            <AccordionItem 
              value="basics" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">The Meal Prep Basics</p>
                    <p className="text-sm text-muted-foreground">Simple Sunday strategy</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
                    <p className="font-semibold text-sm mb-2">🗓️ The Strategy</p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• <strong>Recommended:</strong> Cook 2-3 days of food in advance (~30 mins)</li>
                      <li>• Weigh each ingredient <strong>exactly as I wrote</strong> in your plan</li>
                      <li>• Use your food scale for accuracy</li>
                      <li>• Get creative with how you cook it (more below!)</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                    <p className="text-sm">
                      💡 <strong>Why this works:</strong> Saves you from cooking every single day while keeping food fresh. Just 30 minutes of prep = 3 days of meals ready to go!
                    </p>
                  </div>

                  {/* Weekend Flexibility - NEW! */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border-2 border-purple-300">
                    <p className="font-semibold text-sm mb-2">🎉 Weekend Flexibility</p>
                    <p className="text-sm mb-2">
                      <strong>Weekends (Friday onwards)</strong> are more flexible so you can enjoy family time without stressing about every meal being perfect.
                    </p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• You&apos;ll still have guidelines (not a free-for-all)</li>
                      <li>• Enjoy without worrying about falling off the wagon</li>
                      <li>• Prevents the all-or-nothing mindset that leads to binges</li>
                      <li>• Keeps your progress moving forward</li>
                    </ul>
                    <p className="text-xs mt-2 text-muted-foreground italic">
                      Balance = sustainability. Structure during the week + flexibility on weekends = long-term success!
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Smart Storage System */}
            <AccordionItem 
              value="storage" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                    <Container className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Smart Storage System</p>
                    <p className="text-sm text-muted-foreground">Less containers, more flexibility</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 pb-4">
                <div className="space-y-4">
                  {/* Keep Ingredients Separate */}
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">📦 Keep Ingredients Separate</h4>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200">
                      <ul className="space-y-1 text-sm">
                        <li>• All protein → <strong>one container</strong></li>
                        <li>• All carbs (rice/potatoes) → <strong>another container</strong></li>
                        <li>• All veggies → <strong>another container</strong></li>
                      </ul>
                      <p className="text-xs mt-2 text-muted-foreground italic">
                        💡 Weigh portions as you eat - keeps food fresher and portions flexible
                      </p>
                    </div>
                  </div>

                  {/* Container Strategy */}
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">🎯 Container Strategy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200">
                        <p className="text-xs font-bold text-blue-700 mb-1">🥡 On-the-Go Meals</p>
                        <p className="text-sm">Pre-pack in takeaway containers</p>
                        <p className="text-xs mt-1 text-muted-foreground">Perfect for work lunches</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded border border-green-200">
                        <p className="text-xs font-bold text-green-700 mb-1">🏠 At-Home Meals</p>
                        <p className="text-sm">Weigh fresh from bulk containers</p>
                        <p className="text-xs mt-1 text-muted-foreground">No need to fill fridge with extra containers!</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200">
                    <p className="text-sm">
                      ⏰ <strong>Food Safety:</strong> Cooked food lasts 3-4 days in the fridge. Label containers with dates!
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Make It Delicious */}
            <AccordionItem 
              value="delicious" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
                    <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Make It Delicious</p>
                    <p className="text-sm text-muted-foreground">Get creative with cooking!</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 pb-4">
                <div className="space-y-4">
                  {/* Go Wild With */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border-2 border-green-300">
                    <p className="font-semibold text-sm mb-2">✅ GO WILD WITH:</p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• <strong>Any spices</strong> - garlic powder, paprika, cumin, Italian seasoning, cajun, etc.</li>
                      <li>• <strong>Cooking methods</strong> - grill, bake, air fry, pan sear, slow cook, etc.</li>
                      <li>• <strong>Flavor combinations</strong> - lemon pepper, herbs, teriyaki style (no sugar), etc.</li>
                    </ul>
                  </div>

                  {/* Example */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                    <p className="font-semibold text-sm mb-2">💡 Example Transformation</p>
                    <p className="text-sm mb-2"><strong>Plan says:</strong> &quot;4oz chicken + 50g rice + 50g asparagus&quot;</p>
                    <p className="text-sm font-medium mb-1">You could make:</p>
                    <ul className="space-y-0.5 ml-4 text-sm">
                      <li>• Cajun chicken bowl with garlic herb rice</li>
                      <li>• Lemon pepper chicken with roasted asparagus</li>
                      <li>• Asian-style stir fry (no sugary sauce)</li>
                    </ul>
                    <p className="text-xs mt-2 text-muted-foreground italic">Same portions, totally different meals!</p>
                  </div>

                  {/* Ask First */}
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg border-2 border-orange-300">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm mb-2">⚠️ ASK ME FIRST:</p>
                        <ul className="space-y-1.5 ml-4 text-sm">
                          <li>
                            <strong>• Sauces</strong> (except hot sauce) 
                            <p className="text-xs text-muted-foreground ml-2">→ Can add 100+ hidden calories I haven&apos;t accounted for</p>
                          </li>
                          <li>
                            <strong>• Ground meat substitutions</strong>
                            <p className="text-xs text-muted-foreground ml-2">→ Fat % matters! If plan says chicken breast:</p>
                            <p className="text-xs text-muted-foreground ml-4">• Ground chicken must be <strong>99% lean</strong></p>
                            <p className="text-xs text-muted-foreground ml-4">• Ground turkey must be <strong>97-99% lean</strong> (NOT 80%!)</p>
                            <p className="text-xs text-muted-foreground ml-4">• Generic 80% ground beef ≠ what I meant</p>
                          </li>
                          <li>
                            <strong>• When in doubt</strong> - just message me!
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200">
                    <p className="text-sm">
                      🍳 <strong>Need recipe ideas?</strong> Ask me! I can suggest ways to make it so good you&apos;ll forget you&apos;re &quot;eating healthy.&quot;
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Bottom Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border-2 border-blue-300 dark:border-blue-700">
            <p className="text-sm font-medium mb-2">📝 Remember:</p>
            <ul className="space-y-1 text-sm ml-4">
              <li>• <strong>Numbers = exact</strong> - measure carefully with your food scale</li>
              <li>• <strong>Preparation = yours</strong> - get creative with spices and cooking!</li>
              <li>• <strong>Not enjoying it? Tell me</strong> - I&apos;ll adjust your plan</li>
              <li>• <strong>Communication is key</strong> - I&apos;m here to help you succeed</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}