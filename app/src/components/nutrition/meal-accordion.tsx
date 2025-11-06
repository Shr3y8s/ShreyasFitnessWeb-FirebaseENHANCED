"use client";

import { useState } from 'react';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PlusCircle, Trash2, Edit2, Check, X } from 'lucide-react';

export interface FoodItem {
  id: string;
  food: string;
  calories: number;
  protein: number;
}

export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

interface MealAccordionProps {
  meal: MealCategory;
  items: FoodItem[];
  onUpdate: (items: FoodItem[]) => void;
}

export function MealAccordion({ meal, items, onUpdate }: MealAccordionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ food: '', calories: '', protein: '' });
  const [editItem, setEditItem] = useState({ food: '', calories: '', protein: '' });

  const mealTotals = items.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      return acc;
    },
    { calories: 0, protein: 0 }
  );

  const handleAdd = () => {
    if (newItem.food && newItem.calories && newItem.protein) {
      const item: FoodItem = {
        id: Date.now().toString(),
        food: newItem.food,
        calories: parseInt(newItem.calories),
        protein: parseInt(newItem.protein),
      };
      onUpdate([...items, item]);
      setNewItem({ food: '', calories: '', protein: '' });
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    onUpdate(items.filter(item => item.id !== id));
  };

  const handleEditStart = (item: FoodItem) => {
    setEditingId(item.id);
    setEditItem({
      food: item.food,
      calories: item.calories.toString(),
      protein: item.protein.toString(),
    });
  };

  const handleEditSave = (id: string) => {
    if (editItem.food && editItem.calories && editItem.protein) {
      onUpdate(
        items.map(item =>
          item.id === id
            ? {
                ...item,
                food: editItem.food,
                calories: parseInt(editItem.calories),
                protein: parseInt(editItem.protein),
              }
            : item
        )
      );
      setEditingId(null);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditItem({ food: '', calories: '', protein: '' });
  };

  return (
    <AccordionItem value={meal}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center justify-between w-full pr-4">
          <span className="font-semibold text-lg">{meal}</span>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{mealTotals.calories} cal</span>
            <span>{mealTotals.protein}g protein</span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 pt-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No items logged yet
            </p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <Card key={item.id} className="p-3">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Food name"
                        value={editItem.food}
                        onChange={(e) => setEditItem({ ...editItem, food: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Calories"
                          value={editItem.calories}
                          onChange={(e) => setEditItem({ ...editItem, calories: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Protein (g)"
                          value={editItem.protein}
                          onChange={(e) => setEditItem({ ...editItem, protein: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditSave(item.id)} className="flex-1">
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleEditCancel} className="flex-1">
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.food}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.calories} cal • {item.protein}g protein
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditStart(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {isAdding ? (
            <Card className="p-3 space-y-2">
              <Input
                placeholder="Food name"
                value={newItem.food}
                onChange={(e) => setNewItem({ ...newItem, food: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Calories"
                  value={newItem.calories}
                  onChange={(e) => setNewItem({ ...newItem, calories: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Protein (g)"
                  value={newItem.protein}
                  onChange={(e) => setNewItem({ ...newItem, protein: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} className="flex-1">
                  <Check className="h-4 w-4 mr-1" />
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setNewItem({ food: '', calories: '', protein: '' });
                  }}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="w-full"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Food
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
