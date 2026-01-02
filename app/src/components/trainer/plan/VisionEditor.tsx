"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Plus, X, Save, Loader2 } from 'lucide-react';
import { VISION_TEMPLATES, VisionData } from '@/types/plan';
import { useToast } from '@/hooks/use-toast';

interface VisionEditorProps {
  initialData: VisionData | null;
  onSave: (data: VisionData) => Promise<void>;
  isSaving: boolean;
}

export function VisionEditor({ initialData, onSave, isSaving }: VisionEditorProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [goals, setGoals] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from existing data
  useEffect(() => {
    if (initialData && initialData.goals.length > 0) {
      setGoals(initialData.goals.map(g => g.text));
    } else {
      // Default to 3 empty goals
      setGoals(['', '', '']);
    }
  }, [initialData]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    if (templateId) {
      const template = VISION_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        setGoals(template.defaultGoals);
        setHasChanges(true);
      }
    }
  };

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
    setHasChanges(true);
  };

  const handleAddGoal = () => {
    if (goals.length < 5) {
      setGoals([...goals, '']);
      setHasChanges(true);
    }
  };

  const handleRemoveGoal = (index: number) => {
    if (goals.length > 1) {
      const newGoals = goals.filter((_, i) => i !== index);
      setGoals(newGoals);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    // Filter out empty goals
    const validGoals = goals.filter(g => g.trim() !== '').map(text => ({ text }));
    
    if (validGoals.length === 0) {
      toast({
        title: "No Goals Added",
        description: "Please add at least one goal",
        variant: "destructive",
      });
      return;
    }

    const visionData: VisionData = {
      goals: validGoals,
      lastUpdated: new Date()
    };

    await onSave(visionData);
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Reset to initial data
    if (initialData && initialData.goals.length > 0) {
      setGoals(initialData.goals.map(g => g.text));
    } else {
      setGoals(['', '', '']);
    }
    setSelectedTemplate('');
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Client Vision</CardTitle>
            <CardDescription>
              Set your client's long-term goals and vision for their fitness journey
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selector */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Start with a template (optional)
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSaving}
          >
            <option value="">Choose a template...</option>
            {VISION_TEMPLATES.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.description}
              </option>
            ))}
          </select>
        </div>

        {/* Goals Input */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Goals ({goals.length}/5)
          </label>
          <div className="space-y-3">
            {goals.map((goal, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => handleGoalChange(index, e.target.value)}
                    placeholder={`Goal ${index + 1}`}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isSaving}
                  />
                </div>
                {goals.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveGoal(index)}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {goals.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddGoal}
              className="mt-3"
              disabled={isSaving}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Goal
            </Button>
          )}
        </div>

        {/* Helper Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Vision goals should be inspiring and meaningful. 
            They answer "Why did this client start their fitness journey?" Use placeholders 
            like [X] for personalization (e.g., "Lose [15] pounds").
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Vision
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={!hasChanges || isSaving}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
