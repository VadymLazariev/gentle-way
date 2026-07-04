import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export type TrainingWeek = {
  weekStart: string
  weekEnd: string
  weekNumber: number
}

export function resolveTrainingWeek(
  anchorDate: string,
  today: Date = new Date(),
): TrainingWeek {
  const start = parseISO(anchorDate)
  const days = differenceInCalendarDays(today, start)
  const weekNumber = days < 0 ? 0 : Math.floor(days / 7)
  const weekStart = addDays(start, weekNumber * 7)
  const weekEnd = addDays(weekStart, 6)
  return {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    weekNumber: weekNumber + 1,
  }
}

export type WellbeingScale = 1 | 2 | 3 | 4 | 5

export type WeeklyReportFormValues = {
  weightKg: number | null
  mood: WellbeingScale | null
  recovery: WellbeingScale | null
  overallFeeling: WellbeingScale | null
  stress: WellbeingScale | null
  clientNotes: string
}

export type WeightSummary = {
  sessionsCount: number
  totalVolumeKg: number
  avgRpe: number | null
}

export function emptyWeightSummary(): WeightSummary {
  return { sessionsCount: 0, totalVolumeKg: 0, avgRpe: null }
}
