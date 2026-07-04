import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { AssignmentSchedule, Mesocycle } from '@/lib/types'

// Coerce a stored jsonb schedule (typed as Json) into a weekday->day_code map,
// dropping anything that is not a plain string:string pair.
export function parseSchedule(value: unknown): AssignmentSchedule {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const result: AssignmentSchedule = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string' && entry.length > 0) result[key] = entry
  }
  return result
}

export function dayCodeForWeekday(schedule: AssignmentSchedule, jsDay: number): string | null {
  return schedule[String(jsDay)] ?? null
}

export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export const DEFAULT_SCHEDULE: AssignmentSchedule = { '1': 'A', '2': 'C', '4': 'B' }

export type PhasePlacement = {
  mesocycle: Mesocycle
  // 1-based week within the resolved mesocycle.
  phaseWeek: number
  // Whole weeks since the assignment start date.
  weeksElapsed: number
}

// Resolve which mesocycle a client is on given the assignment start date. When
// the assignment pins a single mesocycle, that phase is used directly and simply
// clamped to its length; otherwise we walk the ordered mesocycles by their week
// budgets and land on the phase covering the elapsed weeks (clamping to the last
// phase once the program is complete).
export function resolvePhase(
  mesocycles: Mesocycle[],
  startDate: string,
  pinnedMesocycleId: string | null,
  today: Date = new Date(),
): PhasePlacement | null {
  if (mesocycles.length === 0) return null
  const ordered = [...mesocycles].sort((a, b) => a.sort_order - b.sort_order)
  const days = differenceInCalendarDays(today, parseISO(startDate))
  const weeksElapsed = days < 0 ? 0 : Math.floor(days / 7)

  if (pinnedMesocycleId) {
    const pinned = ordered.find((m) => m.id === pinnedMesocycleId)
    if (!pinned) return null
    const phaseWeek = Math.min(weeksElapsed, Math.max(0, pinned.weeks - 1)) + 1
    return { mesocycle: pinned, phaseWeek, weeksElapsed }
  }

  let consumed = 0
  for (const meso of ordered) {
    if (weeksElapsed < consumed + meso.weeks) {
      return { mesocycle: meso, phaseWeek: weeksElapsed - consumed + 1, weeksElapsed }
    }
    consumed += meso.weeks
  }

  const last = ordered[ordered.length - 1]
  return { mesocycle: last, phaseWeek: last.weeks, weeksElapsed }
}

export function totalTemplateWeeks(mesocycles: Mesocycle[]): number {
  return mesocycles.reduce((sum, m) => sum + m.weeks, 0)
}

export type WeekPlacement = {
  mesocycle: Mesocycle
  // 1-based week within the resolved mesocycle.
  weekInMeso: number
}

// Map an absolute program week (1-based since assignment start) to the mesocycle
// and week within that phase. Mirrors resolvePhase but driven by week number
// instead of today's date.
export function resolveWeek(
  mesocycles: Mesocycle[],
  absoluteWeek: number,
  pinnedMesocycleId: string | null = null,
): WeekPlacement | null {
  if (mesocycles.length === 0) return null
  const ordered = [...mesocycles].sort((a, b) => a.sort_order - b.sort_order)
  const weeksElapsed = Math.max(0, absoluteWeek - 1)

  if (pinnedMesocycleId) {
    const pinned = ordered.find((m) => m.id === pinnedMesocycleId)
    if (!pinned) return null
    const weekInMeso = Math.min(weeksElapsed, Math.max(0, pinned.weeks - 1)) + 1
    return { mesocycle: pinned, weekInMeso }
  }

  let consumed = 0
  for (const meso of ordered) {
    if (weeksElapsed < consumed + meso.weeks) {
      return { mesocycle: meso, weekInMeso: weeksElapsed - consumed + 1 }
    }
    consumed += meso.weeks
  }

  const last = ordered[ordered.length - 1]
  return { mesocycle: last, weekInMeso: last.weeks }
}
