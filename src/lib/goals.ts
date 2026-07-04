import { epley1RM } from '@/lib/stats'
import type { MeasurementFieldKey } from '@/lib/measurements'
import type { BodyMeasurement, Goal, GoalDirection, GoalPeriod, GoalType, SessionSet, WorkoutSession } from '@/lib/types'

type WorkoutWithSets = WorkoutSession & { sets: SessionSet[] }

export type GoalProgress = {
  goal: Goal
  currentValue: number | null
  progressPct: number | null
  label: string
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  weight: 'Body weight',
  lift: 'Lift',
  measurement: 'Measurement',
  attendance: 'Attendance',
}

export function goalTypeLabel(type: GoalType): string {
  return GOAL_TYPE_LABELS[type]
}

function directionMet(
  direction: GoalDirection | null,
  current: number,
  target: number,
): boolean {
  switch (direction) {
    case 'increase':
      return current >= target
    case 'decrease':
      return current <= target
    case 'reach':
      return Math.abs(current - target) <= Math.max(target * 0.02, 0.5)
    case null:
      return current >= target
    default: {
      const _exhaustive: never = direction
      return _exhaustive
    }
  }
}

function progressPct(
  direction: GoalDirection | null,
  current: number,
  target: number,
): number {
  if (target === 0) return current > 0 ? 100 : 0
  switch (direction) {
    case 'decrease':
      if (current <= target) return 100
      return Math.min(100, Math.round(((target / current) * 100) * 10) / 10)
    case 'increase':
    case 'reach':
    case null:
      return Math.min(100, Math.round((current / target) * 1000) / 10)
    default: {
      const _exhaustive: never = direction
      return _exhaustive
    }
  }
}

function latestWeight(measurements: BodyMeasurement[]): number | null {
  const row = measurements.find((m) => m.weight_kg != null)
  return row?.weight_kg ?? null
}

function latestMeasurement(
  measurements: BodyMeasurement[],
  field: MeasurementFieldKey,
): number | null {
  for (const row of measurements) {
    const value = row[field] as number | null
    if (value != null) return value
  }
  return null
}

function bestLiftE1RM(workouts: WorkoutWithSets[], exerciseName: string): number | null {
  const needle = exerciseName.trim().toLowerCase()
  let best = 0
  for (const w of workouts) {
    if (w.finished_at == null) continue
    for (const s of w.sets) {
      if (!s.completed || s.is_bodyweight) continue
      if (s.exercise.trim().toLowerCase() !== needle) continue
      if ((s.weight_kg ?? 0) <= 0 || s.reps == null || s.reps <= 0) continue
      const e = epley1RM(s.weight_kg ?? 0, s.reps)
      if (e > best) best = e
    }
  }
  return best > 0 ? Math.round(best * 10) / 10 : null
}

function countAttendance(
  workouts: WorkoutWithSets[],
  judoDates: string[],
  period: GoalPeriod,
): number {
  const now = new Date()
  const cutoff = new Date(now)
  if (period === 'week') cutoff.setDate(cutoff.getDate() - 7)
  else if (period === 'month') cutoff.setDate(cutoff.getDate() - 30)
  else cutoff.setFullYear(1970)

  const workoutDates = new Set<string>()
  for (const w of workouts) {
    if (w.finished_at == null) continue
    const d = w.started_at.slice(0, 10)
    if (new Date(d) >= cutoff) workoutDates.add(d)
  }
  for (const d of judoDates) {
    if (new Date(d) >= cutoff) workoutDates.add(d)
  }
  return workoutDates.size
}

export function computeGoalProgress(
  goal: Goal,
  ctx: {
    measurements: BodyMeasurement[]
    workouts: WorkoutWithSets[]
    judoDates: string[]
  },
): GoalProgress {
  const target = goal.target_value ?? goal.target_count ?? null

  switch (goal.goal_type) {
    case 'weight': {
      const current = latestWeight(ctx.measurements)
      const label = current != null ? `${current} kg` : '—'
      if (current == null || target == null) {
        return { goal, currentValue: current, progressPct: null, label }
      }
      return {
        goal,
        currentValue: current,
        progressPct: progressPct(goal.direction, current, target),
        label,
      }
    }
    case 'lift': {
      const current = goal.exercise_name
        ? bestLiftE1RM(ctx.workouts, goal.exercise_name)
        : null
      const label = current != null ? `${current} kg e1RM` : '—'
      if (current == null || target == null) {
        return { goal, currentValue: current, progressPct: null, label }
      }
      return {
        goal,
        currentValue: current,
        progressPct: progressPct(goal.direction ?? 'increase', current, target),
        label,
      }
    }
    case 'measurement': {
      const field = goal.measurement_field as MeasurementFieldKey | null
      const current = field ? latestMeasurement(ctx.measurements, field) : null
      const unit = goal.target_unit ?? 'cm'
      const label = current != null ? `${current} ${unit}` : '—'
      if (current == null || target == null) {
        return { goal, currentValue: current, progressPct: null, label }
      }
      return {
        goal,
        currentValue: current,
        progressPct: progressPct(goal.direction, current, target),
        label,
      }
    }
    case 'attendance': {
      const period = goal.period ?? 'week'
      const current = countAttendance(ctx.workouts, ctx.judoDates, period)
      const label = `${current} sessions`
      if (target == null) {
        return { goal, currentValue: current, progressPct: null, label }
      }
      return {
        goal,
        currentValue: current,
        progressPct: Math.min(100, Math.round((current / target) * 1000) / 10),
        label,
      }
    }
    default: {
      const _exhaustive: never = goal.goal_type
      return _exhaustive
    }
  }
}

export function isGoalAchieved(
  goal: Goal,
  ctx: Parameters<typeof computeGoalProgress>[1],
): boolean {
  const { currentValue } = computeGoalProgress(goal, ctx)
  const target = goal.target_value ?? goal.target_count ?? null
  if (currentValue == null || target == null) return false

  if (goal.goal_type === 'attendance') {
    return currentValue >= target
  }

  return directionMet(goal.direction, currentValue, target)
}
