import type { GoalDirection, Sex } from '@/lib/types'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export type NutritionGoal = 'cut' | 'maintain' | 'bulk'

export type CalcInput = {
  sex: Sex | null
  ageYears: number
  weightKg: number
  heightCm: number
  activityLevel: ActivityLevel
  goal: NutritionGoal
}

export type CalcBreakdown = {
  bmr: number
  tdee: number
  activityMultiplier: number
  calorieAdjustment: number
  proteinPerKg: number
  fatPerKg: number
  waterPerKg: number
}

export type CalcResult = {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
  bmr: number
  tdee: number
  breakdown: CalcBreakdown
}

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; multiplier: number }[] = [
  { value: 'sedentary', label: 'Sedentary', multiplier: 1.2 },
  { value: 'light', label: 'Light', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderate', multiplier: 1.55 },
  { value: 'active', label: 'Active', multiplier: 1.725 },
  { value: 'very_active', label: 'Very active', multiplier: 1.9 },
]

export const NUTRITION_GOALS: { value: NutritionGoal; label: string }[] = [
  { value: 'cut', label: 'Cut (fat loss)' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'bulk', label: 'Bulk (muscle gain)' },
]

const CALORIE_ADJUSTMENTS: Record<NutritionGoal, number> = {
  cut: -400,
  maintain: 0,
  bulk: 250,
}

const PROTEIN_PER_KG: Record<NutritionGoal, number> = {
  cut: 2.0,
  maintain: 1.6,
  bulk: 2.2,
}

const FAT_PER_KG = 0.8
const WATER_ML_PER_KG = 35

export function activityMultiplier(level: ActivityLevel): number {
  switch (level) {
    case 'sedentary':
      return 1.2
    case 'light':
      return 1.375
    case 'moderate':
      return 1.55
    case 'active':
      return 1.725
    case 'very_active':
      return 1.9
    default: {
      const _exhaustive: never = level
      return _exhaustive
    }
  }
}

export function computeBmr(sex: Sex | null, weightKg: number, heightCm: number, ageYears: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  switch (sex) {
    case 'male':
      return Math.round(base + 5)
    case 'female':
      return Math.round(base - 161)
    case 'other':
    case null:
      return Math.round(base - 78)
    default: {
      const _exhaustive: never = sex
      return _exhaustive
    }
  }
}

export function computeTdee(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * activityMultiplier(activityLevel))
}

export function goalFromWeightGoal(
  direction: GoalDirection | null,
  currentWeightKg: number,
  targetWeightKg: number | null,
): NutritionGoal {
  if (direction === 'decrease') return 'cut'
  if (direction === 'increase') return 'bulk'
  if (direction === 'reach' && targetWeightKg != null) {
    const delta = targetWeightKg - currentWeightKg
    if (delta <= -1) return 'cut'
    if (delta >= 1) return 'bulk'
  }
  return 'maintain'
}

export function ageFromDateOfBirth(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

export function computeNutritionTargets(input: CalcInput): CalcResult {
  const bmr = computeBmr(input.sex, input.weightKg, input.heightCm, input.ageYears)
  const multiplier = activityMultiplier(input.activityLevel)
  const tdee = computeTdee(bmr, input.activityLevel)
  const calorieAdjustment = CALORIE_ADJUSTMENTS[input.goal]
  const calories = Math.max(1200, tdee + calorieAdjustment)

  const proteinPerKg = PROTEIN_PER_KG[input.goal]
  const protein_g = Math.round(proteinPerKg * input.weightKg)
  const fat_g = Math.round(FAT_PER_KG * input.weightKg)

  const proteinCal = protein_g * 4
  const fatCal = fat_g * 9
  const carbCal = Math.max(0, calories - proteinCal - fatCal)
  const carbs_g = Math.round(carbCal / 4)

  const water_ml = Math.round(WATER_ML_PER_KG * input.weightKg)

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    water_ml,
    bmr,
    tdee,
    breakdown: {
      bmr,
      tdee,
      activityMultiplier: multiplier,
      calorieAdjustment,
      proteinPerKg,
      fatPerKg: FAT_PER_KG,
      waterPerKg: WATER_ML_PER_KG,
    },
  }
}
