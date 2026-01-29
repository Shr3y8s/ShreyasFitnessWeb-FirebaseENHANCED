"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Target,
  ChevronDown, 
  ChevronUp,
  TrendingDown,
  Dumbbell,
  Zap,
  Apple,
  Smartphone,
  UtensilsCrossed,
  AlertCircle,
  Lightbulb,
  Calculator
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function MacrosTrackingGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-xl">Understanding Macronutrients</CardTitle>
            </div>
            <CardDescription>
              Learn what macros are, why they matter for your training goals, and how to track them effectively
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
          {/* What Are Macros & Why They Matter */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border-2 border-blue-300 dark:border-blue-700">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-2">🎯 What Are Macros & Why They Matter</p>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">What They Are:</p>
                    <ul className="space-y-0.5 ml-4">
                      <li>• Short for &quot;macronutrients&quot; - nutrients your body needs in large amounts</li>
                      <li>• <strong>Protein, Carbs, and Fats</strong> - that&apos;s it!</li>
                      <li>• All food is made up of these 3 (plus water, vitamins, minerals)</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded">
                    <p className="font-medium mb-2">Why They Matter for YOUR Goals:</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <TrendingDown className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">For Weight Loss:</p>
                          <ul className="space-y-0.5 ml-4 text-xs">
                            <li>• Calories matter first (eat less than you burn)</li>
                            <li>• But <strong>protein prevents muscle loss</strong> while losing fat</li>
                            <li>• Keeps you full so you&apos;re not constantly hungry</li>
                            <li>• Lose fat, not muscle = better body composition</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Dumbbell className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">For Building Muscle:</p>
                          <ul className="space-y-0.5 ml-4 text-xs">
                            <li>• <strong>Protein rebuilds muscle</strong> torn down during training</li>
                            <li>• Without enough protein, you can&apos;t build new muscle</li>
                            <li>• Carbs and fats provide energy to lift heavy</li>
                            <li>• Build muscle, don&apos;t just get &quot;bigger&quot; from fat</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">For Getting Stronger & Gym Performance:</p>
                          <ul className="space-y-0.5 ml-4 text-xs">
                            <li>• <strong>Carbs fuel your workouts</strong> - low carbs = low energy</li>
                            <li>• Protein repairs muscles so they come back stronger</li>
                            <li>• Fats support hormone production (including testosterone)</li>
                            <li>• Proper macros = better workouts = better results</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border-2 border-green-300">
                    <p className="font-bold text-sm mb-1">💪 The Bottom Line:</p>
                    <ul className="space-y-0.5 ml-4 text-sm">
                      <li>• Calories determine if you gain/lose weight</li>
                      <li>• <strong>Macros determine if that weight is muscle or fat</strong></li>
                      <li>• Training breaks down muscle</li>
                      <li>• <strong>Nutrition rebuilds it stronger</strong></li>
                      <li>• Get both right = reach your goals faster</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Accordion type="multiple" className="w-full space-y-2">
            {/* Your Approach to Macro Targets */}
            <AccordionItem 
              value="approach" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Your Approach to Hitting Targets</p>
                    <p className="text-sm text-muted-foreground">The goal & what success looks like</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200">
                    <p className="font-semibold text-sm mb-2">🎯 The Goal</p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• Aim to get <strong>as close as possible</strong> to the macros I gave you</li>
                      <li>• Better to be <strong>slightly under than over</strong> (leaves margin for error)</li>
                      <li>• <strong>Consistency beats perfection</strong> every time</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
                    <p className="font-semibold text-sm mb-2">✅ What Success Looks Like</p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• <strong>4 good days out of 7</strong> = you&apos;re winning!</li>
                      <li>• &quot;Good day&quot; = on target or slightly under</li>
                      <li>• Couple uncertain days or slightly over = <strong>totally fine</strong></li>
                      <li>• Focus on <strong>weekly trends</strong>, not daily perfection</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                    <p className="text-sm">
                      💡 <strong>Remember:</strong> We&apos;re looking for consistency over time, not perfect tracking every single day. Life happens - the goal is progress, not perfection!
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* The 3 Macros Explained */}
            <AccordionItem 
              value="macros" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                    <Apple className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">The 3 Macros Explained</p>
                    <p className="text-sm text-muted-foreground">Protein, Carbs, Fats</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 pb-4">
                <div className="space-y-4">
                  {/* Quick Calorie Reference */}
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-purple-600" />
                      <p className="font-semibold text-sm">Quick Calorie Math</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                        <p className="font-bold text-blue-600">Protein</p>
                        <p className="text-xs">4 cal/gram</p>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                        <p className="font-bold text-green-600">Carbs</p>
                        <p className="text-xs">4 cal/gram</p>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                        <p className="font-bold text-orange-600">Fats</p>
                        <p className="text-xs">9 cal/gram</p>
                      </div>
                    </div>
                    <p className="text-xs mt-2 text-muted-foreground italic">
                      Example: 100g chicken breast = 31g protein × 4 = 124 calories from protein
                    </p>
                  </div>

                  {/* Protein */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-600">
                    <p className="font-semibold text-sm mb-2">🥩 PROTEIN</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium">Role:</p>
                        <p className="text-xs ml-2">Builds and repairs muscle (especially important with training!)</p>
                      </div>
                      <div>
                        <p className="font-medium">Food Examples:</p>
                        <p className="text-xs ml-2">Chicken, beef, fish, Greek yogurt, cottage cheese, eggs, protein powder</p>
                      </div>
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded">
                        <p className="font-medium text-xs">💪 Training Connection:</p>
                        <p className="text-xs">After lifting, your muscles need protein to repair and grow. No protein = no gains.</p>
                      </div>
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-green-600">
                    <p className="font-semibold text-sm mb-2">🍚 CARBS</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium">Role:</p>
                        <p className="text-xs ml-2">Primary fuel for training and daily energy</p>
                      </div>
                      <div>
                        <p className="font-medium">Food Examples:</p>
                        <p className="text-xs ml-2">Rice, oats, potatoes, bread, pasta, fruits, vegetables</p>
                      </div>
                      <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded">
                        <p className="font-medium text-xs">⚡ Training Connection:</p>
                        <p className="text-xs">Carbs fuel your workouts. Low carbs = low energy in the gym. You&apos;ll feel terrible trying to lift.</p>
                      </div>
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-200">
                        <p className="text-xs"><strong>Common myth:</strong> &quot;Carbs make you fat.&quot; <strong>Reality:</strong> Eating too many <em>calories</em> makes you gain weight, not carbs specifically.</p>
                      </div>
                    </div>
                  </div>

                  {/* Fats */}
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-l-4 border-orange-600">
                    <p className="font-semibold text-sm mb-2">🥑 FATS</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium">Role:</p>
                        <p className="text-xs ml-2">Hormone production, vitamin absorption, keeps you full</p>
                      </div>
                      <div>
                        <p className="font-medium">Food Examples:</p>
                        <p className="text-xs ml-2">Oils, butter, nuts, seeds, avocado, fatty fish, egg yolks</p>
                      </div>
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded">
                        <p className="font-medium text-xs">⚠️ Important Note:</p>
                        <p className="text-xs">Fats are calorie-dense (9 cal/gram vs 4 for protein/carbs). Easy to overeat - measure carefully!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* How to Use Your Tracking App */}
            <AccordionItem 
              value="app" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                    <Smartphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold">How to Use Your Tracking App</p>
                    <p className="text-sm text-muted-foreground">MyFitnessPal, MacroFactor, etc.</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 pb-4">
                <div className="space-y-4">
                  {/* Getting Started */}
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">📱 Getting Started</h4>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200">
                      <ul className="space-y-1 text-sm">
                        <li>• <strong>Recommended apps:</strong> MyFitnessPal (free, huge database) or MacroFactor (paid, smarter tracking)</li>
                        <li>• <strong>Set up your profile</strong> with basic info</li>
                        <li>• <strong>Enter MY macro targets</strong> (not the app&apos;s defaults!) - I&apos;ll tell you these numbers</li>
                      </ul>
                    </div>
                  </div>

                  {/* Daily Logging */}
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">📝 Daily Logging</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200">
                        <p className="font-medium text-sm mb-1">Search the Database</p>
                        <ul className="space-y-0.5 ml-4 text-xs">
                          <li>• Type food name in search bar</li>
                          <li>• <strong>Look for verified entries</strong> (green checkmark in MFP)</li>
                          <li>• User-created entries can be wrong - double-check!</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded border border-green-200">
                        <p className="font-medium text-sm mb-1">Use the Barcode Scanner</p>
                        <p className="text-xs">Quick and accurate for packaged foods. Scan → select serving size → log it.</p>
                      </div>

                      <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded border border-orange-200">
                        <p className="font-medium text-sm mb-1">⚠️ ALWAYS Double-Check Serving Size!</p>
                        <p className="text-xs"><strong>Most common mistake:</strong> Logging the wrong serving size. If you ate 200g but logged 100g, your macros are off by half!</p>
                      </div>

                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-200">
                        <p className="font-medium text-sm mb-1">Save to &quot;My Foods&quot;</p>
                        <p className="text-xs">Save foods you eat often for faster logging next time. Build your library!</p>
                      </div>
                    </div>
                  </div>

                  {/* Pro Tips */}
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200">
                    <p className="font-semibold text-sm mb-2">💡 Pro Tips for Faster Logging</p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• <strong>Pre-log your day</strong> in the morning - easier to stay on track</li>
                      <li>• Use <strong>&quot;Quick Add&quot;</strong> feature when eating out (enter macros directly)</li>
                      <li>• <strong>Copy meals</strong> from previous days if eating the same thing</li>
                      <li>• Create <strong>custom recipes</strong> for meals you make repeatedly</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Eating Out Strategies */}
            <AccordionItem 
              value="eating-out" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Eating Out Strategies</p>
                    <p className="text-sm text-muted-foreground">Restaurant & unknown food tips</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 pb-4">
                <div className="space-y-4">
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                    <p className="font-semibold text-sm mb-2">🍽️ Step-by-Step Approach</p>
                    <ol className="space-y-2 ml-4 text-sm">
                      <li><strong>1. Search app first:</strong> Restaurant name + food (someone may have already added it)</li>
                      <li><strong>2. Check restaurant menu:</strong> Many places list calories → use Quick Add feature</li>
                      <li><strong>3. Look online:</strong> Search &quot;[restaurant] [dish] nutrition&quot; for macros</li>
                      <li><strong>4. Ask your waiter:</strong> How many ounces of meat? Any butter/oil used in cooking?</li>
                      <li><strong>5. Order familiar foods:</strong> Easier to estimate grilled chicken vs unknown sauce</li>
                      <li><strong>6. Look up similar meals:</strong> Find comparable dish online for rough estimate</li>
                    </ol>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                    <p className="font-semibold text-sm mb-2">🏠 Homemade/Unknown Foods</p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• Order familiar items when you can - easier to estimate</li>
                      <li>• Estimate based on ingredients you recognize</li>
                      <li>• When in doubt, pick similar foods from app database</li>
                      <li>• Ask questions about preparation methods</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
                    <p className="font-semibold text-sm mb-2">👁️ Building Awareness</p>
                    <p className="text-sm mb-2">Over time, you&apos;ll develop an eye for portions and calories:</p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• You&apos;ll start recognizing what 6oz chicken looks like</li>
                      <li>• You&apos;ll know roughly what different foods contain</li>
                      <li>• Estimating becomes easier and more accurate</li>
                      <li>• <strong>Rough estimates are fine - we&apos;re not looking for perfection!</strong></li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Common Logging Mistakes */}
            <AccordionItem 
              value="mistakes" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Common Logging Mistakes</p>
                    <p className="text-sm text-muted-foreground">Avoid these tracking errors</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-2 pb-4">
                <div className="space-y-2">
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-600">
                    <p className="font-medium text-sm mb-1">❌ Wrong Serving Size</p>
                    <p className="text-xs">Most common! Always double-check before logging. Ate 200g but logged 100g = all your macros are wrong.</p>
                  </div>

                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-600">
                    <p className="font-medium text-sm mb-1">❌ Forgetting Cooking Oils/Butter</p>
                    <p className="text-xs">1 tablespoon of oil = 120 calories. Adds up fast! Log everything that goes in the pan.</p>
                  </div>

                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-600">
                    <p className="font-medium text-sm mb-1">❌ Using Wrong Entry (Cooked vs Raw)</p>
                    <p className="text-xs">Using a cooked entry for raw food (or vice versa) throws off the numbers. Match what you weighed!</p>
                  </div>

                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-600">
                    <p className="font-medium text-sm mb-1">❌ Trusting Unverified Entries</p>
                    <p className="text-xs">User-created entries can be wrong. Look for verified (green checkmark) or check nutrition label yourself.</p>
                  </div>

                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-600">
                    <p className="font-medium text-sm mb-1">❌ Guessing Instead of Weighing</p>
                    <p className="text-xs">&quot;Eyeballing&quot; portions is usually way off. Use your food scale for accuracy.</p>
                  </div>

                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-600">
                    <p className="font-medium text-sm mb-1">❌ Forgetting Condiments/Sauces</p>
                    <p className="text-xs">Ketchup, mayo, salad dressing, etc. all add up. Log them too!</p>
                  </div>

                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-600">
                    <p className="font-medium text-sm mb-1">❌ Rounding Everything</p>
                    <p className="text-xs">&quot;Close enough&quot; for every food adds up to major inaccuracies. Be specific when you can.</p>
                  </div>

                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-600">
                    <p className="font-medium text-sm mb-1">❌ Obsessing Over 1-2g Differences</p>
                    <p className="text-xs">On the flip side, don&apos;t stress about being off by 1-2 grams. We&apos;re looking for consistency, not perfection!</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Bottom Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-lg border-2 border-orange-300 dark:border-orange-700">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-2">📝 Remember:</p>
                <ul className="space-y-1 text-sm ml-4">
                  <li>• <strong>Consistency beats perfection</strong> - 4 good days out of 7 = success</li>
                  <li>• <strong>Weekly trends matter</strong> more than single meals or days</li>
                  <li>• <strong>Slightly under is better than over</strong> when in doubt</li>
                  <li>• <strong>Questions? Ask me!</strong> I&apos;m here to help troubleshoot</li>
                  <li>• <strong>This gets easier</strong> - tracking becomes second nature over time</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
