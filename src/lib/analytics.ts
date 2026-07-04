import { format, parseISO, subDays } from 'date-fns'
import { countTakenDosesOnDate } from '@/lib/supplements'
import type { SessionCheckin, Supplement, SupplementLog } from '@/lib/types'

export type DailySupplementAdherence = {
  date: string
  expected: number
  taken: number
  pct: number | null
}

export type AdherenceRecoveryPoint = {
  date: string
  adherencePct: number | null
  recovery: number | null
}

export type WeeklyCompliance = {
  weekLabel: string
  sessionsExpected: number
  sessionsDone: number
  supplementPct: number | null
  avgRecovery: number | null
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

export function computeDailyAdherence(
  supplements: Supplement[],
  logs: SupplementLog[],
  expectedPerDay: Map<string, number>,
  days = 14,
): DailySupplementAdherence[] {
  const today = new Date()
  const rows: DailySupplementAdherence[] = []

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = subDays(today, i)
    const date = format(d, 'yyyy-MM-dd')
    const expected = expectedPerDay.get(date) ?? 0
    const taken = countTakenDosesOnDate(supplements, logs, date)
    rows.push({
      date,
      expected,
      taken,
      pct: expected > 0 ? Math.round((taken / expected) * 1000) / 10 : null,
    })
  }

  return rows
}

export function correlateAdherenceRecovery(
  adherence: DailySupplementAdherence[],
  checkins: SessionCheckin[],
): AdherenceRecoveryPoint[] {
  const recoveryByDate = new Map<string, number[]>()
  for (const c of checkins) {
    if (c.recovery == null) continue
    const date = c.created_at.slice(0, 10)
    const list = recoveryByDate.get(date) ?? []
    list.push(c.recovery)
    recoveryByDate.set(date, list)
  }

  return adherence.map((row) => ({
    date: format(parseISO(row.date), 'MMM d'),
    adherencePct: row.pct,
    recovery: avg(recoveryByDate.get(row.date) ?? []),
  }))
}

export function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  const den = Math.sqrt(denX * denY)
  if (den === 0) return null
  return Math.round((num / den) * 100) / 100
}

export function correlationFromPoints(points: AdherenceRecoveryPoint[]): number | null {
  const pairs = points.filter(
    (p): p is AdherenceRecoveryPoint & { adherencePct: number; recovery: number } =>
      p.adherencePct != null && p.recovery != null,
  )
  return pearsonCorrelation(
    pairs.map((p) => p.adherencePct),
    pairs.map((p) => p.recovery),
  )
}
