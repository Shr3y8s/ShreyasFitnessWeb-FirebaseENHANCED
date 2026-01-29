"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye,
  ChevronDown, 
  ChevronUp,
  ShoppingCart,
  Award,
  Scale,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function NutritionLabelsGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border-2 border-indigo-200 dark:border-indigo-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-xl">Reading Nutrition Labels</CardTitle>
            </div>
            <CardDescription>
              Master the essential life skill that separates those who get in shape from those who stay confused
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
          {/* Why This Life Skill Matters */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border-2 border-blue-300 dark:border-blue-700">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-2">🏆 Why This Life Skill Matters</p>
                
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                    <p className="font-medium mb-1">The Reality:</p>
                    <ul className="space-y-0.5 ml-4 text-xs">
                      <li>• Most people walk into grocery stores grabbing whatever looks good</li>
                      <li>• Marketing makes junk food look &quot;healthy&quot;</li>
                      <li>• Then wonder why they gained weight or can&apos;t lose it</li>
                      <li>• <strong>This isn&apos;t about shame - it&apos;s about education</strong></li>
                    </ul>
                  </div>

                  <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border-2 border-green-300">
                    <p className="font-bold mb-1">💪 The Skill That Changes Everything:</p>
                    <ul className="space-y-0.5 ml-4 text-xs">
                      <li>• <strong>Anyone who&apos;s in shape or wants to get in shape needs this</strong></li>
                      <li>• Make informed decisions about what goes in your body</li>
                      <li>• Compare products and choose smarter options</li>
                      <li>• Stop falling for marketing tricks</li>
                      <li>• Take control of your nutrition</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded">
                    <p className="font-medium mb-1">🎯 This is a LIFE Skill:</p>
                    <ul className="space-y-0.5 ml-4 text-xs">
                      <li>• Not just for your current goals with me</li>
                      <li>• For you, your family, your kids</li>
                      <li>• Once you learn it, you have it forever</li>
                      <li>• Empowers you to be your own nutrition expert</li>
                      <li>• Makes every grocery trip smarter</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Accordion type="multiple" className="w-full space-y-2">
            {/* Anatomy of a Label */}
            <AccordionItem 
              value="anatomy" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                    <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Anatomy of a Nutrition Label</p>
                    <p className="text-sm text-muted-foreground">What to look at and what to ignore</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200">
                    <p className="font-semibold text-sm mb-2">📋 Top to Bottom (In Order):</p>
                    <ol className="space-y-1 ml-4 text-sm">
                      <li><strong>1. Serving Size</strong> - THE MOST IMPORTANT! Everything else is based on this.</li>
                      <li><strong>2. Servings Per Container</strong> - How many servings in the whole package</li>
                      <li><strong>3. Calories</strong> - Per serving (not per container!)</li>
                      <li><strong>4. Total Fat</strong> - Including saturated fat</li>
                      <li><strong>5. Total Carbohydrates</strong> - Including fiber and sugars</li>
                      <li><strong>6. Protein</strong> - The number you want high!</li>
                      <li><strong>7. Everything else</strong> - Can mostly ignore for now</li>
                    </ol>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                    <p className="text-sm">
                      💡 <strong>Pro tip:</strong> Start by ONLY looking at serving size, calories, and the 3 macros (protein, carbs, fat). Ignore the rest until you&apos;re comfortable with the basics.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* The Serving Size Trap */}
            <AccordionItem 
              value="serving-trap" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold">The Serving Size Trap</p>
                    <p className="text-sm text-muted-foreground">How companies trick you</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                    <p className="font-semibold text-sm mb-2">⚠️ Common Tricks</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium">Soda Bottle (20oz):</p>
                        <p className="text-xs ml-2">• Label says &quot;100 calories&quot; but servings = 2.5</p>
                        <p className="text-xs ml-2">• <strong>Real calories = 250!</strong> (Who drinks half a bottle?)</p>
                      </div>
                      <div>
                        <p className="font-medium">Cookie Package:</p>
                        <p className="text-xs ml-2">• &quot;Only 100 calories!&quot; ...per cookie</p>
                        <p className="text-xs ml-2">• Package has 4 cookies = <strong>400 calories</strong></p>
                      </div>
                      <div>
                        <p className="font-medium">Ice Cream Pint:</p>
                        <p className="text-xs ml-2">• &quot;150 calories per serving&quot;</p>
                        <p className="text-xs ml-2">• 4 servings per pint (Who eats ¼ pint?)</p>
                        <p className="text-xs ml-2">• <strong>Whole pint = 600 calories</strong></p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200">
                    <p className="font-semibold text-sm mb-2">✅ The Rule:</p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• <strong>Always check serving size FIRST</strong></li>
                      <li>• Ask yourself: &quot;Is this realistic for how I&apos;d actually eat it?&quot;</li>
                      <li>• Multiply by servings if you&apos;ll eat the whole thing</li>
                      <li>• Don&apos;t fall for &quot;low calorie&quot; claims without checking!</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* GOOD vs BAD Comparisons */}
            <AccordionItem 
              value="comparisons" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                    <Scale className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold">GOOD vs BAD: Real Examples</p>
                    <p className="text-sm text-muted-foreground">Learn to spot quality foods</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 pb-4">
                <div className="space-y-4">
                  {/* Protein Bar Example */}
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Example 1: Protein Bars</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-2 border-red-400">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <p className="font-bold text-sm text-red-700">BAD Option</p>
                        </div>
                        <div className="space-y-1 text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded">
                          <p>Serving: 1 bar (60g)</p>
                          <p>Calories: 250</p>
                          <p>Protein: 10g</p>
                          <p>Carbs: 35g (25g sugar!)</p>
                          <p>Fat: 8g</p>
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="font-medium text-red-700">❌ Why it&apos;s bad:</p>
                          <ul className="ml-4 space-y-0.5">
                            <li>• Low protein (10g) for 250 cal</li>
                            <li>• 25g sugar = mostly a candy bar</li>
                            <li>• Could eat real food for better macros</li>
                            <li>• Wasting calories on sugar</li>
                          </ul>
                        </div>
                      </div>

                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-400">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <p className="font-bold text-sm text-green-700">GOOD Option</p>
                        </div>
                        <div className="space-y-1 text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded">
                          <p>Serving: 1 bar (60g)</p>
                          <p>Calories: 200</p>
                          <p>Protein: 20g</p>
                          <p>Carbs: 15g (2g sugar)</p>
                          <p>Fat: 7g</p>
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="font-medium text-green-700">✅ Why it&apos;s good:</p>
                          <ul className="ml-4 space-y-0.5">
                            <li>• High protein (20g) for only 200 cal</li>
                            <li>• Low sugar (2g)</li>
                            <li>• Actually serves purpose as protein source</li>
                            <li>• Efficient calorie use</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-300">
                      <p className="text-xs"><strong>The Lesson:</strong> Good option = 20g protein per 200 cal. Bad option = 10g protein per 250 cal. You&apos;re literally getting HALF the protein for MORE calories!</p>
                    </div>
                  </div>

                  {/* Greek Yogurt Example */}
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Example 2: Greek Yogurt</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-2 border-red-400">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <p className="font-bold text-sm text-red-700">BAD Option</p>
                        </div>
                        <div className="space-y-1 text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded">
                          <p>Serving: 150g</p>
                          <p>Calories: 150</p>
                          <p>Protein: 5g</p>
                          <p>Carbs: 25g (20g sugar)</p>
                          <p>Fat: 2g</p>
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="font-medium text-red-700">❌ Why it&apos;s bad:</p>
                          <ul className="ml-4 space-y-0.5">
                            <li>• Low protein (5g)</li>
                            <li>• High sugar (20g) = flavored sugar bomb</li>
                            <li>• Not filling, spikes blood sugar</li>
                          </ul>
                        </div>
                      </div>

                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-400">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <p className="font-bold text-sm text-green-700">GOOD Option</p>
                        </div>
                        <div className="space-y-1 text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded">
                          <p>Serving: 150g</p>
                          <p>Calories: 100</p>
                          <p>Protein: 18g</p>
                          <p>Carbs: 6g (4g sugar)</p>
                          <p>Fat: 0g</p>
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="font-medium text-green-700">✅ Why it&apos;s good:</p>
                          <ul className="ml-4 space-y-0.5">
                            <li>• High protein (18g) for only 100 cal</li>
                            <li>• Low sugar (4g from lactose/milk sugar)</li>
                            <li>• Keeps you full, supports training</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-300">
                      <p className="text-xs"><strong>The Lesson:</strong> Same food category, TOTALLY different nutritional value. Good option has 3.6x more protein for fewer calories!</p>
                    </div>
                  </div>

                  {/* Bread Example */}
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Example 3: Bread</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-2 border-red-400">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <p className="font-bold text-sm text-red-700">BAD Option</p>
                        </div>
                        <div className="space-y-1 text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded">
                          <p>Serving: 1 slice (40g)</p>
                          <p>Calories: 120</p>
                          <p>Protein: 2g</p>
                          <p>Carbs: 22g (3g sugar)</p>
                          <p>Fat: 2g</p>
                          <p>Fiber: 0g</p>
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="font-medium text-red-700">❌ Why it&apos;s bad:</p>
                          <ul className="ml-4 space-y-0.5">
                            <li>• Very low protein (2g)</li>
                            <li>• No fiber = white bread</li>
                            <li>• Not filling, spikes blood sugar</li>
                          </ul>
                        </div>
                      </div>

                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-400">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <p className="font-bold text-sm text-green-700">GOOD Option</p>
                        </div>
                        <div className="space-y-1 text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded">
                          <p>Serving: 1 slice (40g)</p>
                          <p>Calories: 80</p>
                          <p>Protein: 5g</p>
                          <p>Carbs: 15g (1g sugar)</p>
                          <p>Fat: 1g</p>
                          <p>Fiber: 4g</p>
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                          <p className="font-medium text-green-700">✅ Why it&apos;s good:</p>
                          <ul className="ml-4 space-y-0.5">
                            <li>• Higher protein (5g vs 2g)</li>
                            <li>• High fiber (4g) = whole grain</li>
                            <li>• Fewer calories, more filling</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-300">
                      <p className="text-xs"><strong>The Lesson:</strong> Good option has 2.5x more protein, 40 fewer calories, and actually keeps you full. Not all bread is equal!</p>
                    </div>
                  </div>

                  {/* What Good Ratios Look Like */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border-2 border-blue-300">
                    <p className="font-bold text-sm mb-2">📊 What Good Ratios Look Like:</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium">High-Protein Foods (Greek yogurt, protein powder, lean meat):</p>
                        <p className="text-xs ml-2">• Look for: <strong>15g+ protein per 100-120 calories</strong></p>
                      </div>
                      <div>
                        <p className="font-medium">Moderate-Protein Foods (eggs, beans, regular yogurt):</p>
                        <p className="text-xs ml-2">• Look for: <strong>6-10g protein per 100 calories</strong></p>
                      </div>
                      <div>
                        <p className="font-medium">Carb Foods (bread, rice, pasta):</p>
                        <p className="text-xs ml-2">• Look for: <strong>3g+ fiber, minimal added sugar</strong></p>
                      </div>
                      <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/50 rounded">
                        <p className="text-xs"><strong>The Goal:</strong> Get more nutrition (protein, fiber) for fewer calories. That&apos;s what makes food &quot;worth it.&quot;</p>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Marketing Tricks to Ignore */}
            <AccordionItem 
              value="marketing" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Marketing Tricks to Ignore</p>
                    <p className="text-sm text-muted-foreground">Don&apos;t fall for the hype</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-2 pb-4">
                <div className="space-y-2">
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-l-4 border-orange-600">
                    <p className="font-medium text-sm mb-1">&quot;Natural&quot;</p>
                    <p className="text-xs">Meaningless term with no legal definition. Sugar is &quot;natural&quot; too!</p>
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-l-4 border-orange-600">
                    <p className="font-medium text-sm mb-1">&quot;Low-Fat&quot;</p>
                    <p className="text-xs">Often means HIGH SUGAR instead. Check the label - they replaced fat with something!</p>
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-l-4 border-orange-600">
                    <p className="font-medium text-sm mb-1">&quot;Multigrain&quot;</p>
                    <p className="text-xs">Doesn&apos;t mean whole grain. Could be refined white flour with a sprinkle of other grains.</p>
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-l-4 border-orange-600">
                    <p className="font-medium text-sm mb-1">&quot;No Added Sugar&quot;</p>
                    <p className="text-xs">But loaded with natural sugars (fruit juice concentrate, dates, etc.). Still sugar!</p>
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-l-4 border-orange-600">
                    <p className="font-medium text-sm mb-1">&quot;Made with Whole Grains&quot;</p>
                    <p className="text-xs">Keyword: &quot;with&quot; - could be 5% whole grain, 95% white flour. Flip it over and check!</p>
                  </div>

                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                    <p className="font-semibold text-sm mb-1">🚨 The Golden Rule:</p>
                    <p className="text-xs"><strong>The front of the package LIES. Flip it over and read the actual nutrition label!</strong></p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Ingredient List Basics */}
            <AccordionItem 
              value="ingredients" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center shrink-0">
                    <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Ingredient List Basics</p>
                    <p className="text-sm text-muted-foreground">What order means</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200">
                    <p className="font-semibold text-sm mb-2">📝 How Ingredient Lists Work:</p>
                    <ul className="space-y-1 ml-4 text-sm">
                      <li>• <strong>Listed by weight</strong> - first ingredient = most of the product</li>
                      <li>• If sugar is in top 3 ingredients = sugar bomb</li>
                      <li>• Companies hide sugar by using multiple types (cane sugar, corn syrup, brown rice syrup, etc.)</li>
                      <li>• <strong>Fewer ingredients usually = better</strong></li>
                    </ul>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
                    <p className="font-semibold text-sm mb-2">✅ Good Example:</p>
                    <p className="text-xs font-mono ml-2">&quot;Peanuts, Salt&quot;</p>
                    <p className="text-xs mt-1">Simple, real food. You know exactly what you&apos;re eating!</p>
                  </div>

                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                    <p className="font-semibold text-sm mb-2">❌ Bad Example:</p>
                    <p className="text-xs font-mono ml-2">&quot;Enriched flour, sugar, corn syrup, high fructose corn syrup, modified food starch, partially hydrogenated oils...&quot;</p>
                    <p className="text-xs mt-1">Multiple sugars, processed oils, 20+ ingredients. Highly processed!</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Quick Shopping Tips */}
            <AccordionItem 
              value="shopping" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Quick Shopping Tips</p>
                    <p className="text-sm text-muted-foreground">Make smarter choices</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-2 pb-4">
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-600">
                    <p className="font-medium text-sm mb-1">💡 Shop the Perimeter First</p>
                    <p className="text-xs">Fresh foods (meat, dairy, produce) are usually around the edges. Middle aisles = processed foods.</p>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-green-600">
                    <p className="font-medium text-sm mb-1">💡 Compare Similar Products</p>
                    <p className="text-xs">Pick up 2-3 options, compare labels side-by-side. Takes 30 seconds, saves hundreds of calories!</p>
                  </div>

                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-l-4 border-purple-600">
                    <p className="font-medium text-sm mb-1">💡 Don&apos;t Fear Higher Calories</p>
                    <p className="text-xs">If macros are better (more protein, less sugar), the higher-calorie option might be the smarter choice!</p>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border-l-4 border-yellow-600">
                    <p className="font-medium text-sm mb-1">💡 Build Your Knowledge</p>
                    <p className="text-xs">Start with foods you buy often. Compare brands. Over time, you&apos;ll know which products are winners without checking!</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Bottom Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 rounded-lg border-2 border-indigo-300 dark:border-indigo-700">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-2">📝 Remember:</p>
                <ul className="space-y-1 text-sm ml-4">
                  <li>• <strong>This skill empowers you for life</strong> - not just for current goals</li>
                  <li>• <strong>You&apos;re becoming your own expert</strong> - make informed decisions</li>
                  <li>• <strong>Compare products</strong> - don&apos;t just grab whatever looks good</li>
                  <li>• <strong>Front of package lies</strong> - flip it over every time</li>
                  <li>• <strong>Start with foods you buy often</strong> - build knowledge over time</li>
                  <li>• <strong>Questions? Ask me!</strong> I&apos;m here to help you learn</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
