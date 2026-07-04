import type { DayCode } from '@/lib/types'

export const queryKeys = {
  // Reference / program content is global (shared across all clients).
  blocks: ['blocks'] as const,
  block: (id: number) => ['blocks', id] as const,
  programWeeks: ['program_weeks'] as const,
  week: (weekNumber: number) => ['program_weeks', weekNumber] as const,
  dayPrescriptions: (weekNumber: number, dayCode: DayCode) =>
    ['prescriptions', weekNumber, dayCode] as const,
  weekPrescriptions: (weekNumber: number) => ['prescriptions', 'week', weekNumber] as const,
  exerciseLibrary: (blockId: number) => ['exercise_library', blockId] as const,
  progressionRules: (blockId: number) => ['progression_rules', blockId] as const,
  globalRules: ['global_rules'] as const,
  weeklyCalendar: ['weekly_calendar'] as const,

  // Client-scoped data. Every key is namespaced by the owning client so a coach
  // switching between clients never reads another client's cached rows.
  settings: (clientId: string) => ['client_settings', clientId] as const,
  sessions: (clientId: string) => ['workout_sessions', clientId] as const,
  session: (clientId: string, id: string) => ['workout_sessions', clientId, id] as const,
  sessionByWeekDay: (clientId: string, weekNumber: number, dayCode: DayCode) =>
    ['workout_sessions', clientId, 'week_day', weekNumber, dayCode] as const,
  sessionSets: (clientId: string, sessionId: string) =>
    ['session_sets', clientId, sessionId] as const,
  previousSets: (clientId: string, sessionId: string) =>
    ['session_sets', clientId, 'previous', sessionId] as const,
  exerciseBests: (clientId: string, sessionId: string) =>
    ['session_sets', clientId, 'bests', sessionId] as const,
  workoutCount: (clientId: string) => ['workout_sessions', clientId, 'count'] as const,
  progressExercises: (clientId: string) => ['session_sets', clientId, 'exercise_names'] as const,
  progressByExercise: (clientId: string, exercise: string) =>
    ['session_sets', clientId, 'exercise', exercise] as const,
  sessionAdjustments: (clientId: string, sessionId: string) =>
    ['session_adjustments', clientId, sessionId] as const,
  judoSessions: (clientId: string) => ['judo_sessions', clientId] as const,
  injuries: (clientId: string) => ['injuries', clientId] as const,
  activeInjuries: (clientId: string) => ['injuries', clientId, 'active'] as const,
  checkins: (clientId: string) => ['session_checkins', clientId] as const,
  bodyMeasurements: (clientId: string) => ['body_measurements', clientId] as const,
  latestMeasurement: (clientId: string) => ['body_measurements', clientId, 'latest'] as const,
  measurementTrend: (clientId: string, field: string) =>
    ['body_measurements', clientId, 'trend', field] as const,
  weeklyReports: (clientId: string) => ['weekly_reports', clientId] as const,
  currentWeeklyReport: (clientId: string) => ['weekly_reports', clientId, 'current'] as const,
  coachSubmittedReports: (limit: number) => ['weekly_reports', 'coach', 'all', limit] as const,
  coachInboxCount: ['coach_inbox_count'] as const,

  cheatMeals: (clientId: string) => ['cheat_meals', clientId] as const,
  myCheatMeals: (clientId: string) => ['cheat_meals', clientId, 'mine'] as const,
  pendingCheatMeals: (limit = 200) => ['cheat_meals', 'pending', limit] as const,

  // Coach-scoped rosters and invites, namespaced by the coach so different
  // coaches never share cached data.
  coachClients: (coachId: string) => ['coach_clients', coachId] as const,
  clientProfile: (coachId: string, clientId: string) =>
    ['coach_clients', coachId, 'profile', clientId] as const,
  clientInvites: (coachId: string) => ['client_invites', coachId] as const,

  // Program authoring. Templates a coach can see (system + own) are namespaced
  // by the coach; a single template's structure is shared once loaded.
  programTemplates: (coachId: string) => ['program_templates', coachId] as const,
  programTemplate: (templateId: string) => ['program_templates', 'detail', templateId] as const,
  templateStructure: (templateId: string) =>
    ['program_templates', 'structure', templateId] as const,

  // Assignments are client-scoped like the rest of a client's data.
  clientAssignments: (clientId: string) => ['client_assignments', clientId] as const,
  activeAssignment: (clientId: string) => ['client_assignments', clientId, 'active'] as const,

  goals: (clientId: string) => ['goals', clientId] as const,
  supplements: (clientId: string) => ['supplements', clientId] as const,
  supplementLogs: (clientId: string) => ['supplement_logs', clientId] as const,
  pushSubscriptions: (clientId: string) => ['push_subscriptions', clientId] as const,
  attendance: (clientId: string) => ['attendance', clientId] as const,

  nutritionTargets: (clientId: string) => ['nutrition_targets', clientId] as const,
  foodItems: (clientId: string) => ['food_items', clientId] as const,
  myFoods: (clientId: string) => ['food_items', clientId, 'my_foods'] as const,
  mealLogs: (clientId: string, date: string) => ['meal_logs', clientId, date] as const,
  dailyNutrition: (clientId: string, date: string) => ['nutrition_daily', clientId, date] as const,

  dietTemplates: (coachId: string) => ['diet_templates', coachId] as const,
  dietTemplate: (templateId: string) => ['diet_templates', 'detail', templateId] as const,
  clientDietAssignment: (clientId: string) => ['client_diet_assignments', clientId, 'active'] as const,
  planAdherence: (clientId: string, date?: string) =>
    ['plan_adherence', clientId, date ?? 'today'] as const,
}
