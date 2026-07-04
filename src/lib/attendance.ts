import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { JudoSession, WorkoutSession } from '@/lib/types'

export type AttendanceKind = 'lift' | 'judo' | 'both'

export type AttendanceDay = {
  date: string
  kinds: AttendanceKind[]
}

export type AttendanceSummary = {
  totalDays: number
  liftDays: number
  judoDays: number
  weekStreak: number
}

function sessionDate(session: WorkoutSession): string {
  return session.started_at.slice(0, 10)
}

export function buildAttendanceDays(
  workouts: WorkoutSession[],
  judo: JudoSession[],
): AttendanceDay[] {
  const byDate = new Map<string, Set<AttendanceKind>>()

  const add = (date: string, kind: AttendanceKind) => {
    const set = byDate.get(date) ?? new Set<AttendanceKind>()
    set.add(kind)
    byDate.set(date, set)
  }

  for (const w of workouts) {
    if (w.finished_at == null) continue
    add(sessionDate(w), 'lift')
  }
  for (const j of judo) {
    add(j.session_date, 'judo')
  }

  return [...byDate.entries()]
    .map(([date, kinds]) => ({
      date,
      kinds: normalizeKinds([...kinds]),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function normalizeKinds(kinds: AttendanceKind[]): AttendanceKind[] {
  if (kinds.includes('lift') && kinds.includes('judo')) return ['both']
  return kinds
}

export function attendanceForDate(days: AttendanceDay[], date: string): AttendanceKind[] {
  return days.find((d) => d.date === date)?.kinds ?? []
}

export function summarizeAttendance(days: AttendanceDay[]): AttendanceSummary {
  const liftDays = days.filter((d) => d.kinds.includes('lift') || d.kinds.includes('both')).length
  const judoDays = days.filter((d) => d.kinds.includes('judo') || d.kinds.includes('both')).length

  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date))
  let weekStreak = 0
  const seenWeeks = new Set<string>()
  for (const day of sorted) {
    const weekKey = format(startOfWeek(parseISO(day.date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    if (seenWeeks.has(weekKey)) continue
    seenWeeks.add(weekKey)
    weekStreak += 1
    if (weekStreak >= 12) break
  }

  return {
    totalDays: days.length,
    liftDays,
    judoDays,
    weekStreak,
  }
}

export function calendarGrid(month: Date): Date[] {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 0 }), 6)
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

export function isInMonth(day: Date, month: Date): boolean {
  return isSameMonth(day, month)
}
