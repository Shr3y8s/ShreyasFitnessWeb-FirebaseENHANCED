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
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Coffee, Sun, Moon, Apple, Check, X, Edit2 } from 'lucide-react';

export interface FoodItem {
  id: string;
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

const mealIcons = {
  Breakfast: Coffee,
  Lunch: Sun,
  Dinner: Moon,
  Snacks: Apple,
};

interface MealAccordionProps {
  meal: MealCategory;
  items: FoodItem[];
  onUpdate: (items: FoodItem[]) => void;
}

export function MealAccordion({ meal, items, onUpdate }: MealAccordionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ food: '', calories: '', protein: '', carbs: '', fat: '' });
  const [editItem, setEditItem] = useState({ food: '', calories: '', protein: '', carbs: '', fat: '' });

  const mealTotals = items.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const MealIcon = mealIcons[meal];

  const handleAdd = () => {
    if (newItem.food && newItem.calories && newItem.protein && newItem.carbs && newItem.fat) {
      const item: FoodItem = {
        id: Date.now().toString(),
        food: newItem.food,
        calories: parseInt(newItem.calories),
        protein: parseInt(newItem.protein),
        carbs: parseInt(newItem.carbs),
        fat: parseInt(newItem.fat),
      };
      onUpdate([...items, item]);
      setNewItem({ food: '', calories: '', protein: '', carbs: '', fat: '' });
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
      carbs: item.carbs.toString(),
      fat: item.fat.toString(),
    });
  };

  const handleEditSave = (id: string) => {
    if (editItem.food && editItem.calories && editItem.protein && editItem.carbs && editItem.fat) {
      onUpdate(
        items.map(item =>
          item.id === id
            ? {
                ...item,
                food: editItem.food,
                calories: parseInt(editItem.calories),
                protein: parseInt(editItem.protein),
                carbs: parseInt(editItem.carbs),
                fat: parseInt(editItem.fat),
              }
            : item
        )
      );
      setEditingId(null);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditItem({ food: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  return (
    <AccordionItem value={meal} className="bg-gradient-to-br from-primary/5 via-background to-primary/5 transition-all duration-300 hover:shadow-lg rounded-lg border border-green-200">
      <div className="relative">
        <AccordionTrigger className="hover:no-underline rounded-lg px-6 pr-28">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <MealIcon className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-base">{meal}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {mealTotals.calories} cal
              </Badge>
              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                {mealTotals.protein}g P
              </Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                {mealTotals.carbs}g C
              </Badge>
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                {mealTotals.fat}g F
              </Badge>
            </div>
          </div>
        </AccordionTrigger>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setIsAdding(!isAdding);
          }}
          className="absolute right-6 top-1/2 -translate-y-1/2 h-7 bg-green-50 hover:bg-green-100 text-green-700 border-green-200 z-10"
        >
          <PlusCircle className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      <AccordionContent className="px-6">
        <div className="space-y-3 pt-2">
          {isAdding && (
            <Card className="p-3 space-y-3 bg-green-50/50 border-green-200">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Food Item</label>
                <Input
                  placeholder="Food name"
                  value={newItem.food}
                  onChange={(e) => setNewItem({ ...newItem, food: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Calories</label>
                  <Input
                    type="number"
                    placeholder="450"
                    value={newItem.calories}
                    onChange={(e) => setNewItem({ ...newItem, calories: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Protein (g)</label>
                  <Input
                    type="number"
                    placeholder="20"
                    value={newItem.protein}
                    onChange={(e) => setNewItem({ ...newItem, protein: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Carbs (g)</label>
                  <Input
                    type="number"
                    placeholder="60"
                    value={newItem.carbs}
                    onChange={(e) => setNewItem({ ...newItem, carbs: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fat (g)</label>
                  <Input
                    type="number"
                    placeholder="15"
                    value={newItem.fat}
                    onChange={(e) => setNewItem({ ...newItem, fat: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleAdd} className="flex-1">
                  <Check className="h-4 w-4 mr-1" />
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setNewItem({ food: '', calories: '', protein: '', carbs: '', fat: '' });
                  }}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No items logged yet
            </p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <Card key={item.id} className="p-3">
                  {editingId === item.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Food Item</label>
                        <Input
                          placeholder="Food name"
                          value={editItem.food}
                          onChange={(e) => setEditItem({ ...editItem, food: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Calories</label>
                          <Input
                            type="number"
                            value={editItem.calories}
                            onChange={(e) => setEditItem({ ...editItem, calories: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Protein (g)</label>
                          <Input
                            type="number"
                            value={editItem.protein}
                            onChange={(e) => setEditItem({ ...editItem, protein: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Carbs (g)</label>
                          <Input
                            type="number"
                            value={editItem.carbs}
                            onChange={(e) => setEditItem({ ...editItem, carbs: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Fat (g)</label>
                          <Input
                            type="number"
                            value={editItem.fat}
                            onChange={(e) => setEditItem({ ...editItem, fat: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-1">{item.food}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.calories} cal • {item.protein}g P • {item.carbs}g C • {item.fat}g F
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditStart(item)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
