"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Scale, 
  ChevronDown, 
  ChevronUp,
  Calculator,
  Flame,
  RefreshCw,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

export function NutritionBasicsGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-xl">Nutrition Basics Guide</CardTitle>
              <Badge variant="secondary" className="bg-blue-600 text-white">
                Start Here
              </Badge>
            </div>
            <CardDescription>
              Essential information for accurate food tracking and meal prep. Review these fundamentals to avoid common beginner mistakes.
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
          <Accordion type="multiple" className="w-full space-y-2">
            {/* Essential Equipment */}
            <AccordionItem 
              value="equipment" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                    <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Essential Equipment</p>
                    <p className="text-sm text-muted-foreground">What you need to get started</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Digital Food Scale (Required)
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      A digital food scale is essential for accurate tracking. Here's what to look for:
                    </p>
                    <ul className="space-y-1.5 ml-6">
                      <li className="text-sm"><span className="font-medium">• Tare/Zero function:</span> Reset to zero with container on scale</li>
                      <li className="text-sm"><span className="font-medium">• Gram/ounce toggle:</span> Switch between units (grams preferred)</li>
                      <li className="text-sm"><span className="font-medium">• Capacity:</span> At least 5kg/11lbs for meal prep</li>
                      <li className="text-sm"><span className="font-medium">• Accuracy:</span> 1-gram precision</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm">
                      <Lightbulb className="h-4 w-4 inline text-blue-600 mr-1" />
                      <span className="font-medium">Budget tip:</span> A basic digital scale costs $10-20 and is one of the best investments for nutrition success.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Measuring Cups/Spoons (Secondary)</h4>
                    <p className="text-sm text-muted-foreground">
                      Useful for liquids and when a scale isn't available, but weight measurements (grams/ounces) are always more accurate than volume measurements (cups/tablespoons).
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Food Scale 101 */}
            <AccordionItem 
              value="scale-101" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                    <Calculator className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Food Scale 101</p>
                    <p className="text-sm text-muted-foreground">How to use your scale correctly</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Basic Steps</h4>
                    <ol className="space-y-2 ml-4">
                      <li className="text-sm">
                        <span className="font-medium">1. Turn on scale</span> - Place on flat, stable surface
                      </li>
                      <li className="text-sm">
                        <span className="font-medium">2. Set to grams</span> - Use unit button to switch to grams (most accurate)
                      </li>
                      <li className="text-sm">
                        <span className="font-medium">3. Place bowl/plate</span> - If using a container
                      </li>
                      <li className="text-sm">
                        <span className="font-medium">4. Press TARE/ZERO</span> - Resets scale to 0 with container
                      </li>
                      <li className="text-sm">
                        <span className="font-medium">5. Add food</span> - Scale shows weight of food only
                      </li>
                      <li className="text-sm">
                        <span className="font-medium">6. Record weight</span> - Log in your tracking app or notes
                      </li>
                    </ol>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm">
                      <Lightbulb className="h-4 w-4 inline text-green-600 mr-1" />
                      <span className="font-medium">Pro tip:</span> When adding multiple ingredients to one bowl, press TARE after each ingredient to reset to zero before adding the next.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Common Mistakes to Avoid</h4>
                    <ul className="space-y-1.5 ml-4">
                      <li className="text-sm">• Not zeroing/taring before each food item</li>
                      <li className="text-sm">• Using volume (cups) when weight (grams) is more accurate</li>
                      <li className="text-sm">• Weighing on unstable or uneven surface</li>
                      <li className="text-sm">• Forgetting to switch between raw/cooked specifications</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Raw vs Cooked Weight */}
            <AccordionItem 
              value="raw-cooked" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
                    <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Raw vs. Cooked Weight</p>
                    <p className="text-sm text-muted-foreground">Critical for accuracy</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                        Raw Weight
                      </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Definition:</span> Weight of food BEFORE cooking (uncooked, raw state).
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Why it matters:</span> Nutritional data is usually calculated for raw food. Cooking changes water content but not calories/protein/etc.
                    </p>
                    <p className="text-sm font-medium mb-1">Common examples:</p>
                    <ul className="space-y-1 ml-4 text-sm text-muted-foreground">
                      <li>• Chicken breast - 6 oz raw ≠ 6 oz cooked (loses ~25% weight from water)</li>
                      <li>• Ground beef - 4 oz raw ≠ 4 oz cooked (loses fat/water)</li>
                      <li>• Rice (dry) - 1/2 cup dry rice will become ~1.5 cups cooked</li>
                      <li>• Pasta (dry) - Doubles/triples in weight when cooked</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        Cooked Weight
                      </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Definition:</span> Weight of food AFTER cooking (prepared, ready-to-eat).
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">When to use:</span> When meal plan specifically says "cooked" or you're eating prepared/leftover food.
                    </p>
                    <p className="text-sm font-medium mb-1">Common examples:</p>
                    <ul className="space-y-1 ml-4 text-sm text-muted-foreground">
                      <li>• "1 cup cooked rice" - weigh AFTER cooking</li>
                      <li>• "4 oz cooked chicken" - weigh AFTER cooking</li>
                      <li>• Roasted vegetables - usually weighed after cooking</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm">
                      <Flame className="h-4 w-4 inline text-orange-600 mr-1" />
                      <span className="font-medium">Rule of thumb:</span> Unless specified as "cooked," proteins and grains should be weighed RAW. Look for the colored badges in your meal plan for guidance.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded border border-red-200">
                      <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-1">❌ INCORRECT</p>
                      <p className="text-sm">Weighing 6oz chicken after cooking when plan says "6oz chicken breast"</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded border border-green-200">
                      <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-1">✅ CORRECT</p>
                      <p className="text-sm">Weighing 6oz chicken BEFORE cooking (raw weight)</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Reverse Weighing */}
            <AccordionItem 
              value="reverse-weighing" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                    <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Reverse Weighing (Tare Method)</p>
                    <p className="text-sm text-muted-foreground">For taking food out of containers</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">When to Use</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Perfect for measuring portions from jars, containers, or large batches without transferring everything to a separate bowl.
                    </p>
                    <p className="text-sm font-medium mb-1">Common uses:</p>
                    <ul className="space-y-1 ml-4 text-sm text-muted-foreground">
                      <li>• Peanut butter from jar</li>
                      <li>• Cottage cheese from tub</li>
                      <li>• Leftover cooked chicken from storage container</li>
                      <li>• Bulk-cooked rice/quinoa</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Step-by-Step Process</h4>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 text-sm font-bold">
                          1
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Place full container on scale</p>
                          <p className="text-xs text-muted-foreground">Example: Peanut butter jar weighs 450g</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 text-sm font-bold">
                          2
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Note the starting weight</p>
                          <p className="text-xs text-muted-foreground">Write it down or remember: 450g</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 text-sm font-bold">
                          3
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Remove desired amount onto plate/bread</p>
                          <p className="text-xs text-muted-foreground">Scoop out peanut butter for sandwich</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 text-sm font-bold">
                          4
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Weigh container again</p>
                          <p className="text-xs text-muted-foreground">Jar now weighs 418g</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 text-sm font-bold">
                          5
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Calculate: Starting weight - Ending weight</p>
                          <p className="text-xs text-muted-foreground">450g - 418g = <span className="font-bold text-purple-600">32g peanut butter used</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm">
                      <Lightbulb className="h-4 w-4 inline text-purple-600 mr-1" />
                      <span className="font-medium">Pro tip:</span> This method is faster than transferring to a bowl and more accurate than eyeballing portions!
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Pro Tips */}
            <AccordionItem 
              value="pro-tips" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center shrink-0">
                    <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Pro Tips & Best Practices</p>
                    <p className="text-sm text-muted-foreground">Level up your tracking game</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-600">
                    <p className="font-medium text-sm mb-1">Batch Weigh During Meal Prep</p>
                    <p className="text-sm text-muted-foreground">
                      Weigh all ingredients at once when cooking. Divide total by number of servings for easy grab-and-go meals.
                    </p>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-green-600">
                    <p className="font-medium text-sm mb-1">Use Tare Between Ingredients</p>
                    <p className="text-sm text-muted-foreground">
                      Building a salad? Add lettuce, tare to zero, add chicken, tare, add dressing. One bowl, perfectly tracked.
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-l-4 border-purple-600">
                    <p className="font-medium text-sm mb-1">Consistency {'>'}  Perfection</p>
                    <p className="text-sm text-muted-foreground">
                      Being 90% accurate consistently beats being 100% accurate sporadically. Don&apos;t stress if you&apos;re off by a few grams.
                    </p>
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-l-4 border-orange-600">
                    <p className="font-medium text-sm mb-1">When in Doubt, Ask Your Coach</p>
                    <p className="text-sm text-muted-foreground">
                      Unsure if something should be raw or cooked weight? Not sure how to measure an unusual food? Just ask!
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border-l-4 border-yellow-600">
                    <p className="font-medium text-sm mb-1">Keep Your Scale Clean</p>
                    <p className="text-sm text-muted-foreground">
                      Wipe down after use. Food residue can affect accuracy and damage sensors over time.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg border-2 border-blue-300 dark:border-blue-700">
            <p className="text-sm font-medium text-center">
              💡 Remember: These basics apply to ALL nutrition approaches (Habits, Macros, Meal Plans).
              Master these fundamentals and tracking becomes second nature!
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}