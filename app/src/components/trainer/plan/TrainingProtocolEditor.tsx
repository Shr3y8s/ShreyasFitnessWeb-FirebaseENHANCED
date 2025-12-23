"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dumbbell, Plus, X, Loader2 } from 'lucide-react';
import { updateTrainingProtocol } from '@/lib/plan-api';

interface TrainingProtocolEditorProps {
  clientId: string;
  trainerId: string;
  keyPriorities: string[];
  onUpdate: () => void;
}

export function TrainingProtocolEditor({
  clientId,
  trainerId,
  keyPriorities: initialPriorities,
  onUpdate
}: TrainingProtocolEditorProps) {
  const [saving, setSaving] = useState(false);
  const [priorities, setPriorities] = useState<string[]>(initialPriorities || []);
  const [newPriority, setNewPriority] = useState('');

  // Sync with initial data when it changes
  useEffect(() => {
    setPriorities(initialPriorities || []);
  }, [initialPriorities]);

  const handleAddPriority = () => {
    if (newPriority.trim()) {
      setPriorities([...priorities, newPriority.trim()]);
      setNewPriority('');
    }
  };

  const handleRemovePriority = (index: number) => {
    setPriorities(priorities.filter((_, i) => i !== index));
  };

  const handleEditPriority = (index: number, value: string) => {
    const updated = [...priorities];
    updated[index] = value;
    setPriorities(updated);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await updateTrainingProtocol(clientId, trainerId, {
        keyPriorities: priorities
      });

      if (result.success) {
        await onUpdate();
      } else {
        console.error('Failed to save training protocol');
        alert('Failed to save. Please try again.');
      }
    } catch (error) {
      console.error('Error saving training protocol:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          Training Protocol - Key Priorities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Set key priorities for your client to focus on during training.
        </p>

        {/* List of priorities */}
        <div className="space-y-2">
          {priorities.map((priority, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={priority}
                onChange={(e) => handleEditPriority(index, e.target.value)}
                placeholder="Key priority"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemovePriority(index)}
                className="text-destructive hover:text-destructive flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add new priority */}
        <div className="flex items-center gap-2">
          <Input
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddPriority();
              }
            }}
            placeholder="Add a new key priority..."
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddPriority}
            disabled={!newPriority.trim()}
            className="flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Training Protocol'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
