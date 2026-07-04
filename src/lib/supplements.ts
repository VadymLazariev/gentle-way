import { format, getDay, subDays } from 'date-fns'
import type { Supplement, SupplementLog } from '@/lib/types'

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const DOSAGE_UNITS = [
  'mg',
  'g',
  'mcg',
  'ml',
  'IU',
  'capsule',
  'tablet',
  'scoop',
  'drop',
  'serving',
] as const

export type DosageUnit = (typeof DOSAGE_UNITS)[number]

export type DueDose = {
  supplementId: string
  supplementName: string
  slotIndex: number
  timeLabel: string
  dosageLabel: string
  status: 'due' | 'upcoming' | 'taken'
  minutesUntil: number
}

const DEFAULT_TIME = '08:00:00'

export function normalizeScheduleTimes(times: string[] | null | undefined): string[] {
  if (!times || times.length === 0) return [DEFAULT_TIME]
  return times.map(normalizeTimeString)
}

export function normalizeTimeString(time: string): string {
  const parts = time.split(':')
  if (parts.length >= 2) {
    const h = parts[0].padStart(2, '0')
    const m = parts[1].padStart(2, '0')
    return `${h}:${m}:00`
  }
  return DEFAULT_TIME
}

export function timeToInputValue(time: string): string {
  const normalized = normalizeTimeString(time)
  return normalized.slice(0, 5)
}

export function inputValueToTime(value: string): string {
  if (!value) return DEFAULT_TIME
  return `${value}:00`
}

export function dosesPerDay(supplement: Pick<Supplement, 'schedule_times'>): number {
  return normalizeScheduleTimes(supplement.schedule_times).length
}

export function formatDosage(supplement: Pick<Supplement, 'dosage_amount' | 'dosage_unit' | 'dosage'>): string {
  if (supplement.dosage_amount != null && supplement.dosage_unit) {
    const amount =
      supplement.dosage_amount % 1 === 0
        ? String(supplement.dosage_amount)
        : String(supplement.dosage_amount)
    return `${amount} ${supplement.dosage_unit}`
  }
  return supplement.dosage ?? ''
}

export function formatScheduleDays(days: number[]): string {
  if (days.length === 7) return 'Every day'
  if (days.length === 0) return 'No days'
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d] ?? '?')
    .join(', ')
}

export function formatScheduleTimes(times: string[] | null | undefined): string {
  return normalizeScheduleTimes(times)
    .map((t) => timeToInputValue(t))
    .join(', ')
}

export function isScheduledOnDate(
  supplement: Pick<Supplement, 'schedule_days' | 'is_active'>,
  date: Date,
): boolean {
  if (!supplement.is_active) return false
  const day = getDay(date)
  return supplement.schedule_days.includes(day)
}

export function expectedDosesOnDate(
  supplements: Supplement[],
  date: Date,
): number {
  return supplements
    .filter((s) => isScheduledOnDate(s, date))
    .reduce((sum, s) => sum + dosesPerDay(s), 0)
}

export function buildExpectedPerDayMap(
  supplements: Supplement[],
  days: number,
  fromDate: Date = new Date(),
): Map<string, number> {
  const active = supplements.filter((s) => s.is_active)
  const map = new Map<string, number>()
  for (let i = 0; i < days; i += 1) {
    const d = subDays(fromDate, i)
    const date = format(d, 'yyyy-MM-dd')
    map.set(date, expectedDosesOnDate(active, d))
  }
  return map
}

export function countTakenDosesForLog(
  log: SupplementLog,
  supplement: Pick<Supplement, 'schedule_times'>,
): number {
  if (log.taken_slots.length > 0) return log.taken_slots.length
  if (log.taken) return dosesPerDay(supplement)
  return 0
}

export function takenSlotsForLog(log: SupplementLog | undefined): number[] {
  return log?.taken_slots ?? []
}

export function isSlotTaken(log: SupplementLog | undefined, slotIndex: number): boolean {
  const slots = takenSlotsForLog(log)
  if (slots.includes(slotIndex)) return true
  if (log?.taken && slots.length === 0) return true
  return false
}

function minutesFromMidnight(time: string): number {
  const normalized = timeToInputValue(normalizeTimeString(time))
  const [h, m] = normalized.split(':').map(Number)
  return h * 60 + m
}

function minutesNow(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function getDueDoses(
  supplements: Supplement[],
  logs: SupplementLog[],
  now: Date = new Date(),
  upcomingWindowMinutes = 120,
): DueDose[] {
  const today = format(now, 'yyyy-MM-dd')
  const logBySupplement = new Map(
    logs.filter((l) => l.logged_on === today).map((l) => [l.supplement_id, l]),
  )
  const nowMinutes = minutesNow(now)
  const rows: DueDose[] = []

  for (const supplement of supplements) {
    if (!isScheduledOnDate(supplement, now)) continue
    const log = logBySupplement.get(supplement.id)
    const times = normalizeScheduleTimes(supplement.schedule_times)
    const dosageLabel = formatDosage(supplement) || '—'

    times.forEach((time, slotIndex) => {
      const slotMinutes = minutesFromMidnight(time)
      const taken = isSlotTaken(log, slotIndex)
      const diff = slotMinutes - nowMinutes

      let status: DueDose['status']
      if (taken) {
        status = 'taken'
      } else if (diff <= 15 && diff >= -30) {
        status = 'due'
      } else if (diff > 15 && diff <= upcomingWindowMinutes) {
        status = 'upcoming'
      } else {
        return
      }

      rows.push({
        supplementId: supplement.id,
        supplementName: supplement.name,
        slotIndex,
        timeLabel: timeToInputValue(time),
        dosageLabel,
        status,
        minutesUntil: diff,
      })
    })
  }

  return rows.sort((a, b) => {
    const order = { due: 0, upcoming: 1, taken: 2 }
    const byStatus = order[a.status] - order[b.status]
    if (byStatus !== 0) return byStatus
    return a.minutesUntil - b.minutesUntil
  })
}

export function countTakenDosesOnDate(
  supplements: Supplement[],
  logs: SupplementLog[],
  dateStr: string,
): number {
  const dayLogs = logs.filter((l) => l.logged_on === dateStr)
  const byId = new Map(supplements.map((s) => [s.id, s]))
  let total = 0
  for (const log of dayLogs) {
    const supplement = byId.get(log.supplement_id)
    if (!supplement) continue
    total += countTakenDosesForLog(log, supplement)
  }
  return total
}

export function legacyFrequencyLabel(supplement: Supplement): string {
  const days = formatScheduleDays(supplement.schedule_days)
  const times = formatScheduleTimes(supplement.schedule_times)
  if (supplement.frequency) return supplement.frequency
  return `${days} · ${times}`
}
