import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { DayCode } from '@/lib/types'

export const TOTAL_WEEKS = 52

export const DAY_META: Record<DayCode, { label: string; weekday: string; short: string }> = {
  A: { label: 'Day A', weekday: 'Monday', short: 'A' },
  C: { label: 'Day C', weekday: 'Tuesday', short: 'C' },
  B: { label: 'Day B', weekday: 'Thursday', short: 'B' },
}

export const DAY_ORDER: DayCode[] = ['A', 'C', 'B']

export type WeekdayPlan =
  | { type: 'sc'; day: DayCode; weekday: string }
  | { type: 'judo'; weekday: string }
  | { type: 'recovery'; weekday: string }

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export function planForWeekday(jsDay: number): WeekdayPlan {
  const weekday = WEEKDAY_NAMES[jsDay] ?? 'Monday'
  switch (jsDay) {
    case 1:
      return { type: 'sc', day: 'A', weekday }
    case 2:
      return { type: 'sc', day: 'C', weekday }
    case 4:
      return { type: 'sc', day: 'B', weekday }
    case 6:
      return { type: 'recovery', weekday }
    default:
      return { type: 'judo', weekday }
  }
}

export function computeCurrentWeek(programStartDate: string, today: Date = new Date()): number {
  const start = parseISO(programStartDate)
  const days = differenceInCalendarDays(today, start)
  if (days < 0) return 1
  const week = Math.floor(days / 7) + 1
  return Math.min(Math.max(week, 1), TOTAL_WEEKS)
}

export function blockIdForWeek(weekNumber: number): number {
  if (weekNumber <= 12) return 1
  if (weekNumber <= 24) return 2
  if (weekNumber <= 36) return 3
  if (weekNumber <= 48) return 4
  return 5
}

export function isDeloadWeek(focus: string | null): boolean {
  if (!focus) return false
  const f = focus.toLowerCase()
  return f.includes('deload') || f.includes('reset') || f.includes('transition')
}

export function rpeTone(rpe: number | null): 'low' | 'mid' | 'high' {
  if (rpe === null) return 'low'
  if (rpe >= 8) return 'high'
  if (rpe >= 6.5) return 'mid'
  return 'low'
}
