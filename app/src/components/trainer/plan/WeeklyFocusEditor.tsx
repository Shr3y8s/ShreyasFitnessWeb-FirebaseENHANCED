'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Save, Loader2, Calendar, TrendingUp, Check, StickyNote, FileQuestion } from 'lucide-react';
import { WeeklyFocusData, WeeklyFocusHistory } from '@/types/plan';
import { 
  get4Weeks, 
  getWeekLabel, 
  formatWeekRange, 
  isCurrentWeek,
  getCurrentWeekISO
} from '@/lib/week-utils';

interface WeeklyFocusEditorProps {
  initialData: WeeklyFocusHistory | null;
  onSave: (data: WeeklyFocusData) => Promise<void>;
  isSaving: boolean;
}

export function WeeklyFocusEditor({ initialData, onSave, isSaving }: WeeklyFocusEditorProps) {
  const [activeWeek, setActiveWeek] = useState<string>('');
  const [weekData, setWeekData] = useState<Record<string, {
    adjustments: string[];
    priorities: string[];
    coachNotes: string;
    lastCallDate: string;
  }>>({});
  
  const fourWeeks = get4Weeks();

  // Initialize with current week as active tab
  useEffect(() => {
    const currentWeek = getCurrentWeekISO();
    setActiveWeek(currentWeek);
  }, []);

  // Load existing data for all weeks
  useEffect(() => {
    if (initialData?.weeks) {
      const dataMap: Record<string, any> = {};
      
      initialData.weeks.forEach(week => {
        const callDate = week.lastCallDate ? new Date(week.lastCallDate).toISOString().split('T')[0] : '';
        dataMap[week.weekStartDate] = {
          adjustments: week.adjustments.length > 0 ? week.adjustments : [''],
          priorities: week.priorities.length > 0 ? week.priorities : [''],
          coachNotes: week.coachNotes,
          lastCallDate: callDate
        };
      });
      
      setWeekData(dataMap);
    }
  }, [initialData]);

  // Get data for the active week (or empty defaults)
  const getCurrentWeekData = () => {
    return weekData[activeWeek] || {
      adjustments: [''],
      priorities: [''],
      coachNotes: '',
      lastCallDate: ''
    };
  };

  const updateWeekData = (field: 'adjustments' | 'priorities' | 'coachNotes' | 'lastCallDate', value: any) => {
    setWeekData(prev => ({
      ...prev,
      [activeWeek]: {
        ...getCurrentWeekData(),
        [field]: value
      }
    }));
  };

  const addAdjustment = () => {
    const current = getCurrentWeekData();
    updateWeekData('adjustments', [...current.adjustments, '']);
  };

  const removeAdjustment = (index: number) => {
    const current = getCurrentWeekData();
    if (current.adjustments.length > 1) {
      updateWeekData('adjustments', current.adjustments.filter((_, i) => i !== index));
    }
  };

  const updateAdjustment = (index: number, value: string) => {
    const current = getCurrentWeekData();
    const newAdjustments = [...current.adjustments];
    newAdjustments[index] = value;
    updateWeekData('adjustments', newAdjustments);
  };

  const addPriority = () => {
    const current = getCurrentWeekData();
    updateWeekData('priorities', [...current.priorities, '']);
  };

  const removePriority = (index: number) => {
    const current = getCurrentWeekData();
    if (current.priorities.length > 1) {
      updateWeekData('priorities', current.priorities.filter((_, i) => i !== index));
    }
  };

  const updatePriority = (index: number, value: string) => {
    const current = getCurrentWeekData();
    const newPriorities = [...current.priorities];
    newPriorities[index] = value;
    updateWeekData('priorities', newPriorities);
  };

  const handleSave = async () => {
    const current = getCurrentWeekData();
    
    // Filter out empty entries
    const filteredAdjustments = current.adjustments.filter(a => a.trim() !== '');
    const filteredPriorities = current.priorities.filter(p => p.trim() !== '');

    const data: WeeklyFocusData = {
      weekStartDate: activeWeek,
      adjustments: filteredAdjustments,
      priorities: filteredPriorities,
      coachNotes: current.coachNotes.trim(),
      lastCallDate: current.lastCallDate ? new Date(current.lastCallDate) : null,
      createdAt: null, // Will be set by server
      updatedAt: null // Will be set by server
    };

    await onSave(data);
  };

  const hasDataForWeek = (weekISO: string): boolean => {
    return !!weekData[weekISO];
  };

  const current = getCurrentWeekData();

  return (
    <div className="space-y-6">
      <Tabs value={activeWeek} onValueChange={setActiveWeek}>
        <TabsList className="grid grid-cols-4 w-full">
          {fourWeeks.map((weekISO, index) => {
            const label = getWeekLabel(weekISO);
            const weekDate = new Date(weekISO);
            const hasData = hasDataForWeek(weekISO);
            const isCurrent = isCurrentWeek(weekISO);
            
            return (
              <TabsTrigger 
                key={weekISO} 
                value={weekISO}
                className="relative"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className={isCurrent ? 'font-bold' : ''}>{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatWeekRange(weekDate)}
                  </span>
                </div>
                {hasData && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {fourWeeks.map((weekISO) => (
          <TabsContent key={weekISO} value={weekISO} className="space-y-6 mt-6">
            {!hasDataForWeek(weekISO) && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <FileQuestion className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900">
                      <strong>No plan data for this week yet</strong>
                      <p className="mt-1">
                        Fill in the details below and click "Save Weekly Focus" to create the plan for this week.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Adjustments Made
                </CardTitle>
                <CardDescription>
                  What changes did you make to the plan this week?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {current.adjustments.map((adjustment, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Adjustment ${index + 1} (e.g., "Increased calories by 100")`}
                      value={adjustment}
                      onChange={(e) => updateAdjustment(index, e.target.value)}
                    />
                    {current.adjustments.length > 1 && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeAdjustment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addAdjustment}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Adjustment
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Priorities
                </CardTitle>
                <CardDescription>
                  What should the client focus on this week?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {current.priorities.map((priority, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Priority ${index + 1} (e.g., "Hit all 4 training sessions")`}
                      value={priority}
                      onChange={(e) => updatePriority(index, e.target.value)}
                    />
                    {current.priorities.length > 1 && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removePriority(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPriority}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Priority
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-primary" />
                  Notes from Last Call
                </CardTitle>
                <CardDescription>
                  Your message to the client based on your last check-in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lastCallDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date of Last Call (Optional)
                  </Label>
                  <Input
                    id="lastCallDate"
                    type="date"
                    value={current.lastCallDate}
                    onChange={(e) => updateWeekData('lastCallDate', e.target.value)}
                    className="w-full max-w-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coachNotes">Your Notes</Label>
                  <Textarea
                    id="coachNotes"
                    placeholder="e.g., 'Weight down 2.5lbs this week, feeling good overall. Energy slightly low on leg days - added 100 calories and will watch for improvements...'"
                    value={current.coachNotes}
                    onChange={(e) => updateWeekData('coachNotes', e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Weekly Focus
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
