import type { Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']

export type Block = Tables['blocks']['Row']
export type ProgramWeek = Tables['program_weeks']['Row']
export type Prescription = Tables['prescriptions']['Row']
export type ExerciseLibraryItem = Tables['exercise_library']['Row']
export type ProgressionRule = Tables['progression_rules']['Row']
export type GlobalRule = Tables['global_rules']['Row']
export type WeeklyCalendarDay = Tables['weekly_calendar']['Row']
export type SessionLog = Tables['session_logs']['Row']
export type SessionLogInsert = Tables['session_logs']['Insert']
export type SessionLogUpdate = Tables['session_logs']['Update']

export type ClientSettings = Tables['client_settings']['Row']
export type ClientSettingsUpdate = Tables['client_settings']['Update']

export type Profile = Tables['profiles']['Row']
export type ProfileUpdate = Tables['profiles']['Update']
export type CoachClient = Tables['coach_clients']['Row']
export type ClientInvite = Tables['client_invites']['Row']
export type ClientInviteInsert = Tables['client_invites']['Insert']

export type Role = 'coach' | 'client'

export type Sex = 'male' | 'female' | 'other'

export type InviteStatus = 'valid' | 'invalid' | 'used' | 'expired'

export type WorkoutSession = Tables['workout_sessions']['Row']
export type WorkoutSessionInsert = Tables['workout_sessions']['Insert']
export type WorkoutSessionUpdate = Tables['workout_sessions']['Update']
export type SessionSet = Tables['session_sets']['Row']
export type SessionSetInsert = Tables['session_sets']['Insert']
export type SessionSetUpdate = Tables['session_sets']['Update']

export type JudoSession = Tables['judo_sessions']['Row']
export type JudoSessionInsert = Tables['judo_sessions']['Insert']
export type JudoSessionUpdate = Tables['judo_sessions']['Update']
export type Injury = Tables['injuries']['Row']
export type InjuryInsert = Tables['injuries']['Insert']
export type InjuryUpdate = Tables['injuries']['Update']
export type SessionCheckin = Tables['session_checkins']['Row']
export type SessionCheckinInsert = Tables['session_checkins']['Insert']
export type BodyMeasurement = Tables['body_measurements']['Row']
export type BodyMeasurementInsert = Tables['body_measurements']['Insert']
export type WeeklyReport = Tables['weekly_reports']['Row']
export type WeeklyReportInsert = Tables['weekly_reports']['Insert']
export type WeeklyReportUpdate = Tables['weekly_reports']['Update']
export type ProgressPhoto = Tables['progress_photos']['Row']
export type WeeklyReportStatus = 'draft' | 'submitted' | 'reviewed'
export type CheckinInjury = Tables['checkin_injuries']['Row']
export type SessionAdjustment = Tables['session_adjustments']['Row']
export type SessionAdjustmentInsert = Tables['session_adjustments']['Insert']

export type ProgramTemplate = Tables['program_templates']['Row']
export type ProgramTemplateInsert = Tables['program_templates']['Insert']
export type ProgramTemplateUpdate = Tables['program_templates']['Update']
export type Mesocycle = Tables['mesocycles']['Row']
export type MesocycleInsert = Tables['mesocycles']['Insert']
export type MesocycleUpdate = Tables['mesocycles']['Update']
export type TemplateSession = Tables['template_sessions']['Row']
export type TemplateSessionInsert = Tables['template_sessions']['Insert']
export type TemplateSessionUpdate = Tables['template_sessions']['Update']
export type ClientAssignment = Tables['client_assignments']['Row']
export type ClientAssignmentInsert = Tables['client_assignments']['Insert']
export type ClientAssignmentUpdate = Tables['client_assignments']['Update']

export type GoalRow = Tables['goals']['Row']
export type Goal = Omit<GoalRow, 'goal_type' | 'direction' | 'period' | 'status'> & {
  goal_type: GoalType
  direction: GoalDirection | null
  period: GoalPeriod | null
  status: GoalStatus
}
export type GoalInsert = Omit<Tables['goals']['Insert'], 'goal_type' | 'direction' | 'period' | 'status'> & {
  goal_type: GoalType
  direction?: GoalDirection | null
  period?: GoalPeriod | null
  status?: GoalStatus
}
export type GoalUpdate = Omit<Tables['goals']['Update'], 'goal_type' | 'direction' | 'period' | 'status'> & {
  goal_type?: GoalType
  direction?: GoalDirection | null
  period?: GoalPeriod | null
  status?: GoalStatus
}
export type GoalType = 'weight' | 'lift' | 'measurement' | 'attendance'
export type GoalDirection = 'increase' | 'decrease' | 'reach'
export type GoalPeriod = 'week' | 'month' | 'total'
export type GoalStatus = 'active' | 'achieved' | 'abandoned'

export type Supplement = Tables['supplements']['Row']
export type SupplementInsert = Tables['supplements']['Insert']
export type SupplementUpdate = Tables['supplements']['Update']

export type SupplementLog = Tables['supplement_logs']['Row']
export type SupplementLogInsert = Tables['supplement_logs']['Insert']

export type PushSubscription = Tables['push_subscriptions']['Row']
export type PushSubscriptionInsert = Tables['push_subscriptions']['Insert']

// A weekday (0=Sun..6=Sat, as text keys) -> template day_code map.
export type AssignmentSchedule = Record<string, string>

export type DayCode = 'A' | 'B' | 'C'

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure'

export type BodyArea =
  | 'shoulder'
  | 'elbow'
  | 'wrist_grip'
  | 'fingers'
  | 'neck'
  | 'lower_back'
  | 'hip_groin'
  | 'knee'
  | 'ankle'
  | 'other'

export type InjurySeverity = 'mild' | 'moderate' | 'severe'

export type InjuryStatus = 'active' | 'improving' | 'resolved'

export type AdjustmentAction = 'cap_rpe' | 'swap' | 'skip'

export type NutritionTarget = Tables['nutrition_targets']['Row']
export type NutritionTargetInsert = Tables['nutrition_targets']['Insert']
export type NutritionTargetUpdate = Tables['nutrition_targets']['Update']

export type FoodItem = Tables['food_items']['Row']
export type FoodItemInsert = Tables['food_items']['Insert']
export type FoodItemUpdate = Tables['food_items']['Update']
export type FoodSource = 'off' | 'custom' | 'coach'

export type MealLog = Tables['meal_logs']['Row']
export type MealLogInsert = Tables['meal_logs']['Insert']
export type MealLogUpdate = Tables['meal_logs']['Update']
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MealLogItem = Tables['meal_log_items']['Row']
export type MealLogItemInsert = Tables['meal_log_items']['Insert']

export type DietTemplateItemWithFood = DietTemplateItem & { food_item: FoodItem | null }
export type DietTemplateMealWithItems = DietTemplateMeal & { items: DietTemplateItemWithFood[] }
export type DietTemplateDetail = DietTemplate & {
  meals: DietTemplateMealWithItems[]
  items: DietTemplateItemWithFood[]
}

export type MealLogWithItems = MealLog & { items: (MealLogItem & { food_item: FoodItem })[] }

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export type DietTemplate = Tables['diet_templates']['Row']
export type DietTemplateInsert = Tables['diet_templates']['Insert']
export type DietTemplateUpdate = Tables['diet_templates']['Update']
export type DietTemplateMeal = Tables['diet_template_meals']['Row']
export type DietTemplateMealInsert = Tables['diet_template_meals']['Insert']
export type DietTemplateItem = Tables['diet_template_items']['Row']
export type DietTemplateItemInsert = Tables['diet_template_items']['Insert']
export type DietAssignmentMode = 'prescribed' | 'reference'
export type ClientDietAssignment = Tables['client_diet_assignments']['Row']
export type ClientDietAssignmentInsert = Tables['client_diet_assignments']['Insert']
export type NutritionTargetSource = 'manual' | 'calculated' | 'template' | 'cheat_meal'

export type CheatMeal = Tables['cheat_meals']['Row']
export type CheatMealInsert = Tables['cheat_meals']['Insert']
export type CheatMealUpdate = Tables['cheat_meals']['Update']
export type CheatMealStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type CheatMealAdjustment = {
  calories_delta: number
  cardio_minutes: number
  macro_adjustment: {
    calories: number
    carbs_g: number
    protein_g?: number
    fat_g?: number
  }
}
