"use client";

import { TodayMealPlan } from './today-meal-plan';
import { WeeklyMealPlan } from './weekly-meal-plan';

const weeklyMealPlanData = [
  {
    day: "Monday",
    meals: [
      { name: "Breakfast", items: ["1 Oikos Greek Yogurt"] },
      { name: "Post Training", items: ["Protein 2o drink", "100 calories from fruit"] },
      { name: "Lunch", items: ["Fairlife chocolate protein shake (30g)"] },
      { name: "Dinner", items: ["Fairlife chocolate protein shake (30g)"] },
      { name: "Snack", items: ["1 Oikos Greek Yogurt", "100 calories from fruit"] },
    ]
  },
  {
    day: "Tuesday",
    meals: [
      { name: "Breakfast", items: ["1 Oikos Greek Yogurt"] },
      { name: "Post Training", items: ["Protein 2o drink", "100 calories from fruit"] },
      { name: "Lunch", items: ["Fairlife chocolate protein shake (30g)"] },
      { name: "Dinner", items: ["Fairlife chocolate protein shake (30g)"] },
      { name: "Snack", items: ["1 Oikos Greek Yogurt"] },
    ]
  },
  {
    day: "Wednesday",
    meals: [
      { name: "Breakfast", items: ["Fairlife chocolate protein shake (30g)"] },
      { name: "Post Training", items: ["Protein 2o drink"] },
      { name: "Lunch", items: ["Fairlife chocolate protein shake (30g)"] },
      { name: "Dinner", items: ["Fairlife chocolate protein shake (30g)"] },
    ]
  },
  {
    day: "Thursday",
    meals: [
      { name: "Breakfast", items: ["1 Oikos Greek Yogurt", "2 eggs", "1 banana", "1 piece of toast"] },
      { name: "Post Training", items: ["Fairlife chocolate protein shake (30g)", "1 serving of Chex Mix Bold"] },
      { name: "Lunch", items: ["Fairlife chocolate protein shake (30g)"] },
      { name: "Dinner", items: ["2x 4oz chicken breast"] },
      { name: "Snack", items: ["200 calories from fruit"] },
    ]
  },
  {
    day: "Friday",
    meals: [
      { name: "Breakfast", items: ["1 Oikos Greek Yogurt", "2 eggs", "1 banana"] },
      { name: "Post Training", items: ["Fairlife chocolate protein shake (30g)", "100 calories from fruit"] },
      { name: "Lunch", items: ["Fairlife chocolate protein shake (30g)"] },
      { name: "Dinner", items: ["2x 4oz chicken breast", "300 calories of rice, bread, or other carb"] },
      { name: "Snack", items: ["100 calories from fruit", "1 serving of Chex Mix Bold"] },
    ]
  },
  {
    day: "Saturday",
    meals: [
      { name: "Breakfast", items: ["1 Oikos Greek Yogurt"] },
      { name: "Post Training", items: ["Fairlife chocolate protein shake (30g)", "100 calories from fruit"] },
      { name: "Lunch", items: ["Half of a Chick-fil-A spicy chicken sandwich", "2 Chick-fil-A chicken tenders"] },
      { name: "Dinner", items: ["1 Oikos Greek Yogurt", "100 calories from fruit"] },
    ]
  },
  {
    day: "Sunday",
    meals: [
      { name: "Breakfast", items: ["1 pancake", "1 egg", "2 pieces of bacon"] },
      { name: "Lunch", items: ["200 calories from fruit", "2 servings Chex Mix Bold"] },
      { name: "Dinner", items: ["Half of a cheeseburger", "Half a grilled cheese sandwich"] },
    ]
  }
];

export function MealPlanView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      <div className="lg:col-span-2">
        <TodayMealPlan weeklyMealPlan={weeklyMealPlanData} />
      </div>
      <div className="lg:col-span-3">
        <WeeklyMealPlan weeklyMealPlan={weeklyMealPlanData} />
      </div>
    </div>
  );
}
