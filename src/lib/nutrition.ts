import type { FoodItem, MealLogItem, MealType, NutritionTarget } from '@/lib/types'

export type MacroTotals = {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export type MealTypeMeta = {
  value: MealType
  label: string
}

export const MEAL_TYPES: MealTypeMeta[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

export const DEFAULT_NUTRITION_TARGET: Omit<NutritionTarget, 'id' | 'client_id' | 'created_at' | 'updated_at' | 'set_by'> = {
  calories: 2200,
  protein_g: 150,
  carbs_g: 220,
  fat_g: 70,
  water_ml: 2500,
  effective_from: new Date().toISOString().slice(0, 10),
  auto_calculated: false,
  source: 'manual',
  template_id: null,
}

export function mealTypeLabel(type: MealType): string {
  return MEAL_TYPES.find((m) => m.value === type)?.label ?? type
}

export function sumMealLogItems(items: Pick<MealLogItem, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>[]): MacroTotals {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + Number(item.calories),
      proteinG: acc.proteinG + Number(item.protein_g),
      carbsG: acc.carbsG + Number(item.carbs_g),
      fatG: acc.fatG + Number(item.fat_g),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  )
}

export function computeMacrosForQuantity(
  food: Pick<
    FoodItem,
    | 'calories_per_100g'
    | 'protein_per_100g'
    | 'carbs_per_100g'
    | 'fat_per_100g'
    | 'calories_per_serving'
    | 'protein_per_serving'
    | 'carbs_per_serving'
    | 'fat_per_serving'
    | 'serving_size_g'
  >,
  quantity: number,
  unit: 'g' | 'serving',
): MacroTotals {
  if (unit === 'serving') {
    return {
      calories: roundMacro(Number(food.calories_per_serving ?? 0) * quantity),
      proteinG: roundMacro(Number(food.protein_per_serving ?? 0) * quantity),
      carbsG: roundMacro(Number(food.carbs_per_serving ?? 0) * quantity),
      fatG: roundMacro(Number(food.fat_per_serving ?? 0) * quantity),
    }
  }

  const factor = quantity / 100
  return {
    calories: roundMacro(Number(food.calories_per_100g ?? 0) * factor),
    proteinG: roundMacro(Number(food.protein_per_100g ?? 0) * factor),
    carbsG: roundMacro(Number(food.carbs_per_100g ?? 0) * factor),
    fatG: roundMacro(Number(food.fat_per_100g ?? 0) * factor),
  }
}

export function roundMacro(value: number): number {
  return Math.round(value * 10) / 10
}

export function caloriesRemaining(
  target: Pick<NutritionTarget, 'calories'>,
  consumed: MacroTotals,
  exerciseCalories = 0,
): number {
  return target.calories - consumed.calories + exerciseCalories
}

export function macroProgress(consumed: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(consumed / target, 1)
}
