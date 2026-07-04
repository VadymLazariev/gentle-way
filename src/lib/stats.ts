import type { SessionSet } from '@/lib/types'

// Epley estimated 1RM: weight × (1 + reps / 30). A single rep is already a 1RM,
// so it returns the lifted weight unchanged; heavier-for-reps rounds to whole kg.
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg
  return Math.round(weightKg * (1 + reps / 30))
}

export type BestSet = {
  set: SessionSet
  weightKg: number | null
  reps: number | null
  e1RM: number | null
  bodyweight: boolean
}

export type ExerciseGroup = {
  exercise: string
  sets: SessionSet[]
}

export type SessionTotals = {
  totalVolumeKg: number
  totalSets: number
  exercises: ExerciseGroup[]
}

export type PrResult = {
  prSetIds: Set<string>
  prCount: number
}

function isWeighted(set: SessionSet): boolean {
  return !set.is_bodyweight && (set.weight_kg ?? 0) > 0 && set.reps != null && set.reps > 0
}

// Human-readable load for a completed set. Bodyweight sets are reps-based; any
// weight on a bodyweight set is added load shown as "BW +X kg".
export function formatSetDisplay(set: SessionSet): string {
  const reps = set.reps
  if (set.is_bodyweight) {
    const added = set.weight_kg ?? 0
    const base = added > 0 ? `BW +${set.weight_kg} kg` : 'BW'
    return reps != null ? `${base} × ${reps}` : base
  }
  if ((set.weight_kg ?? 0) > 0 && reps != null && reps > 0) {
    return `${set.weight_kg} kg × ${reps}`
  }
  return reps != null ? `${reps} reps` : '—'
}

function bestWeightedRow(sets: SessionSet[]): SessionSet | null {
  let best: SessionSet | null = null
  let bestE = -Infinity
  for (const set of sets) {
    if (!set.completed || !isWeighted(set)) continue
    const e = epley1RM(set.weight_kg ?? 0, set.reps ?? 0)
    if (e > bestE) {
      bestE = e
      best = set
    }
  }
  return best
}

// Best completed set for one exercise: highest estimated 1RM, or – for
// bodyweight work with no load – the set with the most reps.
export function bestSet(sets: SessionSet[]): BestSet | null {
  const completed = sets.filter((s) => s.completed)
  if (completed.length === 0) return null

  const weighted = bestWeightedRow(completed)
  if (weighted) {
    return {
      set: weighted,
      weightKg: weighted.weight_kg,
      reps: weighted.reps,
      e1RM: epley1RM(weighted.weight_kg ?? 0, weighted.reps ?? 0),
      bodyweight: false,
    }
  }

  let best = completed[0]
  for (const set of completed) {
    if ((set.reps ?? 0) > (best.reps ?? 0)) best = set
  }
  return { set: best, weightKg: null, reps: best.reps, e1RM: null, bodyweight: true }
}

export function sessionTotals(sets: SessionSet[]): SessionTotals {
  const completed = sets.filter((s) => s.completed)
  const totalVolumeKg =
    Math.round(completed.reduce((t, s) => t + (s.weight_kg ?? 0) * (s.reps ?? 0), 0) * 100) / 100

  const order: string[] = []
  const byExercise = new Map<string, SessionSet[]>()
  for (const set of sets) {
    const list = byExercise.get(set.exercise)
    if (list) {
      list.push(set)
    } else {
      byExercise.set(set.exercise, [set])
      order.push(set.exercise)
    }
  }
  for (const list of byExercise.values()) list.sort((a, b) => a.set_index - b.set_index)

  return {
    totalVolumeKg,
    totalSets: completed.length,
    exercises: order.map((exercise) => ({ exercise, sets: byExercise.get(exercise) ?? [] })),
  }
}

// A set is a PR when its estimated 1RM beats the exercise's best from all prior
// finished sessions (or is the first recorded load for it). Only the top set of
// each exercise is flagged so the trophy count reflects distinct records.
export function detectPRs(
  sessionSets: SessionSet[],
  historicalBests: Map<string, number>,
): PrResult {
  const byExercise = new Map<string, SessionSet[]>()
  for (const set of sessionSets) {
    if (!set.completed) continue
    const list = byExercise.get(set.exercise) ?? []
    list.push(set)
    byExercise.set(set.exercise, list)
  }

  const prSetIds = new Set<string>()
  for (const [exercise, sets] of byExercise) {
    const top = bestWeightedRow(sets)
    if (!top) continue
    const e1RM = epley1RM(top.weight_kg ?? 0, top.reps ?? 0)
    const historical = historicalBests.get(exercise)
    if (historical == null || e1RM > historical) prSetIds.add(top.id)
  }

  return { prSetIds, prCount: prSetIds.size }
}
