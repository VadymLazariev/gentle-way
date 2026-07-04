import { supabase } from '@/lib/supabase'
import { localDateString } from '@/lib/dates'
import type { CheatMealAdjustment, NutritionTarget } from '@/lib/types'

/** Mid-range kcal/g for mixed cheat foods (roughly 4–7 kcal/g). */
export const KCAL_PER_GRAM = 5

/** Suggested extra cardio minutes per 200 kcal over plan. */
export const CARDIO_MINUTES_PER_200_KCAL = 10

/** Share of estimated kcal offset from carbs (4 kcal/g). */
export const CARBS_OFFSET_SHARE = 0.6

/** Share of estimated kcal offset from fat (9 kcal/g). */
export const FAT_OFFSET_SHARE = 0.2

export function estimateCardioMinutes(calories: number): number {
  if (calories <= 0) return 0
  return Math.ceil(calories / 200) * CARDIO_MINUTES_PER_200_KCAL
}

export function estimateCheatMeal(grams: number): {
  calories: number
  cardioMinutes: number
  adjustment: CheatMealAdjustment
} {
  const safeGrams = Math.max(0, grams)
  const calories = Math.round(safeGrams * KCAL_PER_GRAM)
  const cardioMinutes = estimateCardioMinutes(calories)
  const carbsReduction = Math.round((calories * CARBS_OFFSET_SHARE) / 4)
  const fatReduction = Math.round((calories * FAT_OFFSET_SHARE) / 9)

  return {
    calories,
    cardioMinutes,
    adjustment: {
      calories_delta: calories,
      cardio_minutes: cardioMinutes,
      macro_adjustment: {
        calories: -calories,
        carbs_g: -carbsReduction,
        fat_g: -fatReduction,
      },
    },
  }
}

export function buildAdjustedTarget(
  currentTarget: NutritionTarget,
  adjustment: CheatMealAdjustment,
): Pick<
  NutritionTarget,
  'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'water_ml'
> {
  const macro = adjustment.macro_adjustment
  return {
    calories: Math.max(500, currentTarget.calories + macro.calories),
    protein_g: Math.max(0, Number(currentTarget.protein_g) + (macro.protein_g ?? 0)),
    carbs_g: Math.max(0, Number(currentTarget.carbs_g) + macro.carbs_g),
    fat_g: Math.max(0, Number(currentTarget.fat_g) + (macro.fat_g ?? 0)),
    water_ml: currentTarget.water_ml,
  }
}

export async function applyCheatMealAdjustment(
  clientId: string,
  currentTarget: NutritionTarget,
  adjustment: CheatMealAdjustment,
): Promise<string> {
  const next = buildAdjustedTarget(currentTarget, adjustment)
  const { data, error } = await supabase
    .from('nutrition_targets')
    .insert({
      client_id: clientId,
      calories: next.calories,
      protein_g: next.protein_g,
      carbs_g: next.carbs_g,
      fat_g: next.fat_g,
      water_ml: next.water_ml,
      effective_from: localDateString(),
      set_by: clientId,
      auto_calculated: false,
      source: 'cheat_meal',
      template_id: null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function revertCheatMealAdjustment(appliedTargetId: string | null): Promise<void> {
  if (!appliedTargetId) return
  const { error } = await supabase.from('nutrition_targets').delete().eq('id', appliedTargetId)
  if (error) throw error
}

export const CHEAT_MEAL_PHOTO_BUCKET = 'cheat-meal-photos'

export function cheatMealPhotoPath(clientId: string, cheatMealId: string, ext: string): string {
  const safeExt = ext.replace(/^\./, '').toLowerCase() || 'jpg'
  return `${clientId}/${cheatMealId}.${safeExt}`
}
