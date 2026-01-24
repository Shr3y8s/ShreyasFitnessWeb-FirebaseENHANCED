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
  CheckCircle2,
  AlertCircle,
  Target,
  HelpCircle
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
              Master food tracking in 4-6 weeks. This guide teaches accurate weighing and prevents common beginner mistakes.
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
          {/* Why This Matters - Top */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border-2 border-green-300 dark:border-green-700">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">🎯 Why This Helps Your Results</p>
                <p className="text-sm text-muted-foreground">
                  Using your food scale for <strong>4-6 weeks</strong> massively improves tracking accuracy, makes progress predictable, and teaches you what portions actually look like—so you can be more flexible later.
                </p>
              </div>
            </div>
          </div>

          {/* How to Read Your Plan - Critical */}
          <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg border-2 border-orange-300 dark:border-orange-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-2">⚠️ HOW TO READ YOUR MEAL PLAN</p>
                <p className="text-sm mb-2 font-medium">I&apos;ll always tell you exactly how to weigh each food:</p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span><strong>&quot;6oz Chicken (Raw)&quot;</strong> = weigh it <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">RAW</Badge> (before cooking)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span><strong>&quot;6oz Chicken (Cooked)&quot;</strong> = weigh it <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">COOKED</Badge> (after cooking)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span><strong>&quot;½ cup Oats (Dry)&quot;</strong> = weigh it <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">DRY</Badge> (before adding liquid)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span><strong>&quot;1 cup Rice (Cooked)&quot;</strong> = weigh it <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">COOKED</Badge> (after cooking)</span>
                  </li>
                </ul>
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-300">
                  <p className="text-sm font-medium">⚖️ Match the UNIT I specify:</p>
                  <ul className="space-y-0.5 ml-4 mt-1 text-sm">
                    <li>• If I write <strong>&quot;170g&quot;</strong>, set scale to <strong>grams</strong></li>
                    <li>• If I write <strong>&quot;6oz&quot;</strong>, set scale to <strong>ounces</strong></li>
                    <li>• Your scale has a unit toggle button - use it!</li>
                  </ul>
                </div>
                <p className="text-sm mt-3 font-medium">👉 The rule: Look for the tag in parentheses - it tells you exactly when to weigh it. I usually include it. If you don&apos;t see a tag, assume RAW/dry.</p>
              </div>
            </div>
          </div>

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
                    <p className="text-sm text-muted-foreground">What you need ($10-20 investment)</p>
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
                    <p className="text-sm mb-2">Must-have features:</p>
                    <ul className="space-y-1 ml-4">
                      <li className="text-sm">• <strong>Tare/Zero button</strong> - Resets with container</li>
                      <li className="text-sm">• <strong>Gram/ounce toggle</strong> - Grams most accurate</li>
                      <li className="text-sm">• <strong>5kg+ capacity</strong> - For meal prep</li>
                      <li className="text-sm">• <strong>1g precision</strong> - Accurate measurements</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                    <p className="text-sm">
                      💡 <strong>Budget tip:</strong> Basic digital scales cost $10-20. Best investment for nutrition success.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Food Scale 101 - Simplified into 3 scenarios */}
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
                    <p className="font-semibold">How to Weigh Food</p>
                    <p className="text-sm text-muted-foreground">3 common scenarios</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4 pb-4">
                {/* Scenario 1: Basic Weighing */}
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
                  <h4 className="font-semibold mb-2 text-sm">✅ Scenario 1: Basic Weighing</h4>
                  <ol className="space-y-1 ml-4 text-sm">
                    <li><strong>1.</strong> Turn on scale → Place bowl</li>
                    <li><strong>2.</strong> Press <strong>TARE</strong> (resets to 0)</li>
                    <li><strong>3.</strong> Add food → Read weight</li>
                    <li><strong>4.</strong> Log weight in app</li>
                  </ol>
                </div>

                {/* Scenario 2: Multi-ingredient */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-2 text-sm">✅ Scenario 2: Multi-Ingredient Plate</h4>
                  <p className="text-sm mb-2"><strong>Example:</strong> Building a salad</p>
                  <ol className="space-y-1 ml-4 text-sm">
                    <li><strong>1.</strong> Bowl on scale → <strong>TARE</strong> → Add lettuce</li>
                    <li><strong>2.</strong> <strong>TARE</strong> again → Add chicken</li>
                    <li><strong>3.</strong> <strong>TARE</strong> again → Add dressing</li>
                    <li><strong>4.</strong> One bowl, perfectly tracked!</li>
                  </ol>
                  <p className="text-xs mt-2 text-muted-foreground italic">💡 Press TARE between each ingredient</p>
                </div>

                {/* Scenario 3: Container Weighing - Negative Weight Method */}
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200">
                  <h4 className="font-semibold mb-2 text-sm">✅ Scenario 3: Taking from Containers</h4>
                  <p className="text-sm mb-2"><strong>Example:</strong> Yogurt from large tub</p>
                  <ol className="space-y-1 ml-4 text-sm">
                    <li><strong>1.</strong> Place yogurt container on scale (no lid)</li>
                    <li><strong>2.</strong> Press <strong>TARE</strong> (resets to 0)</li>
                    <li><strong>3.</strong> Scoop out yogurt into your bowl</li>
                    <li><strong>4.</strong> Read the <strong>NEGATIVE number</strong> on scale<br/>
                        <span className="ml-4">→ Shows exactly how much you took!</span>
                    </li>
                  </ol>
                  <div className="mt-2 p-2 bg-purple-100 dark:bg-purple-900/50 rounded border border-purple-300">
                    <p className="text-xs font-medium">Example: Scale shows <strong>&quot;-127g&quot;</strong> = you took <strong>127g</strong></p>
                    <p className="text-xs mt-1">Log <strong>127g of yogurt</strong> in your app (ignore the minus sign)</p>
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground italic">💡 Works for: yogurt, cottage cheese, peanut butter, protein powder, any container!</p>
                </div>

                {/* Common Mistakes */}
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
                  <p className="font-semibold text-sm mb-2">⚠️ Common Mistakes</p>
                  <ul className="space-y-1 ml-4 text-sm">
                    <li>• Not pressing <strong>TARE</strong> before adding food</li>
                    <li>• Weighing on uneven surface</li>
                    <li>• Forgetting raw vs cooked (see below!)</li>
                    <li>• Using a &apos;raw&apos; database entry for food you weighed cooked (or vice versa)</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Raw vs Cooked - Tightened with conversion table */}
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
                    <p className="text-sm text-muted-foreground">Quick reference conversions</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-4">
                  {/* Quick Rule */}
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-2 border-orange-300">
                    <p className="text-sm font-medium mb-1">⚡ Quick Rule</p>
                    <p className="text-sm">
                      Use <strong>RAW weight</strong> unless your plan specifically says <strong>(cooked)</strong> next to the food.
                    </p>
                  </div>

                  {/* Conversion Table */}
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">📊 Approximate changes (can vary by cooking method)</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2 font-semibold">Food</th>
                            <th className="text-left p-2 font-semibold">100g RAW →</th>
                            <th className="text-left p-2 font-semibold">Cooked</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="p-2">Chicken</td>
                            <td className="p-2">100g raw →</td>
                            <td className="p-2 font-medium">70-75g (25-30% loss)</td>
                          </tr>
                          <tr className="border-t bg-muted/30">
                            <td className="p-2">Beef</td>
                            <td className="p-2">100g raw →</td>
                            <td className="p-2 font-medium">65-70g (30-35% loss)</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Rice (dry)</td>
                            <td className="p-2">1 cup dry →</td>
                            <td className="p-2 font-medium">~3 cups cooked</td>
                          </tr>
                          <tr className="border-t bg-muted/30">
                            <td className="p-2">Pasta (dry)</td>
                            <td className="p-2">100g dry →</td>
                            <td className="p-2 font-medium">250g cooked</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      💡 Use this if you only have cooked weight but plan lists raw
                    </p>
                  </div>

                  {/* Visual Examples */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded border border-red-200">
                      <p className="text-xs font-bold text-red-700 mb-1">❌ WRONG</p>
                      <p className="text-sm">Plan says &quot;6oz chicken&quot;<br/>You weigh 6oz <strong>after cooking (cooked)</strong> when the plan doesn&apos;t say cooked</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded border border-green-200">
                      <p className="text-xs font-bold text-green-700 mb-1">✅ RIGHT</p>
                      <p className="text-sm">Plan says &quot;6oz chicken&quot;<br/>You weigh 6oz <strong>before cooking (raw)</strong> when the plan doesn&apos;t say cooked</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Common Questions FAQ */}
            <AccordionItem 
              value="faq" 
              className="border rounded-lg px-4 bg-white dark:bg-gray-900"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center shrink-0">
                    <HelpCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Common Questions</p>
                    <p className="text-sm text-muted-foreground">Quick answers to prevent confusion</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-3 pb-4">
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-600">
                    <p className="font-medium text-sm mb-1">❓ Do I have to weigh food forever?</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>No.</strong> First 4-6 weeks builds accuracy. Then you'll eyeball better and use it less often.
                    </p>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-green-600">
                    <p className="font-medium text-sm mb-1">❓ What if I eat out at a restaurant?</p>
                    <p className="text-sm text-muted-foreground">
                      Use best estimates. Pick similar items in your tracking app. <strong>Consistency beats perfection.</strong>
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-l-4 border-purple-600">
                    <p className="font-medium text-sm mb-1">❓ What if my numbers aren't perfect?</p>
                    <p className="text-sm text-muted-foreground">
                      Being <strong>90% accurate consistently</strong> beats being 100% perfect sporadically. A few grams off won't derail you.
                    </p>
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border-l-4 border-orange-600">
                    <p className="font-medium text-sm mb-1">❓ What tracking app should I use?</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>MyFitnessPal</strong> (free, huge food database) or <strong>MacroFactor</strong> (paid, smarter tracking), or any app you&apos;re already comfortable with. Ask me if you need help setting it up!
                    </p>
                  </div>

                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-l-4 border-red-600">
                    <p className="font-medium text-sm mb-1">❓ What if I mess up a day?</p>
                    <p className="text-sm text-muted-foreground">
                      One day doesn't matter. Get back on track the next meal. <strong>Consistency over time</strong> = results.
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
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                    <Lightbulb className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold">Pro Tips</p>
                    <p className="text-sm text-muted-foreground">Level up your tracking</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-2 pb-4">
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-600">
                    <p className="font-medium text-sm mb-1">💡 Batch Weigh During Meal Prep</p>
                    <p className="text-sm text-muted-foreground">
                      Weigh all ingredients at once. Divide by servings for easy grab-and-go.
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-l-4 border-purple-600">
                    <p className="font-medium text-sm mb-1">💡 Pre-log Your Day</p>
                    <p className="text-sm text-muted-foreground">
                      Log meals in the morning. Easier to stay on track vs. logging after eating.
                    </p>
                  </div>

                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-green-600">
                    <p className="font-medium text-sm mb-1">💡 When in Doubt, Ask</p>
                    <p className="text-sm text-muted-foreground">
                      Unsure about raw vs cooked? Unusual food? Just message me!
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Bottom Reminder */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg border-2 border-blue-300 dark:border-blue-700">
            <p className="text-sm font-medium text-center">
              🎯 <strong>Remember:</strong> These basics apply to ALL nutrition approaches (Habits, Macros, Meal Plans). Master them in 4-6 weeks and tracking becomes automatic!
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}