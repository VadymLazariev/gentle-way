import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useActiveAssignment } from '@/api/programs'
import { useClientSettings } from '@/api/settings'
import { useClientId } from '@/lib/client/ClientContext'
import { useAuth } from '@/lib/auth/AuthProvider'
import { localDateString } from '@/lib/dates'
import { buildMeasurementSnapshot } from '@/lib/measurements'
import {
  resolveTrainingWeek,
  type WeightSummary,
  type WeeklyReportFormValues,
} from '@/lib/reports'
import type { BodyMeasurement, WeeklyReport, WeeklyReportInsert, WeeklyReportUpdate } from '@/lib/types'

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

function invalidateReports(qc: ReturnType<typeof useQueryClient>, clientId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.weeklyReports(clientId) })
  qc.invalidateQueries({ queryKey: queryKeys.currentWeeklyReport(clientId) })
}

async function fetchMeasurementForWeek(
  clientId: string,
  weekStart: string,
  weekEnd: string,
): Promise<BodyMeasurement | null> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('client_id', clientId)
    .gte('measured_at', weekStart)
    .lte('measured_at', weekEnd)
    .order('measured_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export function useWeeklyReports(limit = 52) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.weeklyReports(clientId ?? ''), limit],
    enabled: !!clientId,
    queryFn: async (): Promise<WeeklyReport[]> => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('client_id', clientId!)
        .order('week_start', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },
  })
}

export function useTrainingWeekAnchor() {
  const assignment = useActiveAssignment()
  const settings = useClientSettings()
  return assignment.data?.start_date ?? settings.data?.program_start_date ?? localDateString()
}

export function useCurrentTrainingWeek() {
  const anchor = useTrainingWeekAnchor()
  return resolveTrainingWeek(anchor)
}

export function useCurrentWeeklyReport() {
  const clientId = useClientId()
  const week = useCurrentTrainingWeek()
  return useQuery({
    queryKey: queryKeys.currentWeeklyReport(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<WeeklyReport | null> => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('client_id', clientId!)
        .eq('week_start', week.weekStart)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function computeWeightSummary(
  sessions: { started_at: string; finished_at: string | null; sets: { completed: boolean; weight_kg: number | null; reps: number | null; rpe: number | null }[] }[],
  weekStart: string,
  weekEnd: string,
): WeightSummary {
  const start = parseISO(weekStart)
  const end = parseISO(weekEnd)
  end.setHours(23, 59, 59, 999)

  let sessionsCount = 0
  let totalVolumeKg = 0
  const rpes: number[] = []

  for (const session of sessions) {
    if (session.finished_at == null) continue
    const started = parseISO(session.started_at)
    if (started < start || started > end) continue
    sessionsCount += 1
    for (const set of session.sets) {
      if (!set.completed) continue
      totalVolumeKg += (set.weight_kg ?? 0) * (set.reps ?? 0)
      if (set.rpe != null) rpes.push(set.rpe)
    }
  }

  return {
    sessionsCount,
    totalVolumeKg: Math.round(totalVolumeKg),
    avgRpe: rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null,
  }
}

export function useSubmitWeeklyReport() {
  const qc = useQueryClient()
  const clientId = useClientId()
  const week = useCurrentTrainingWeek()

  return useMutation({
    mutationFn: async (values: WeeklyReportFormValues): Promise<WeeklyReport> => {
      const owner = requireClientId(clientId)

      const { data: sessions, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('started_at, finished_at, session_sets(weight_kg, reps, rpe, completed)')
        .eq('client_id', owner)
        .gte('started_at', `${week.weekStart}T00:00:00`)
        .lte('started_at', `${week.weekEnd}T23:59:59`)
      if (sessionError) throw sessionError

      const normalized = (sessions ?? []).map((s) => ({
        started_at: s.started_at,
        finished_at: s.finished_at,
        sets: (s.session_sets ?? []).map((set) => ({
          completed: set.completed,
          weight_kg: set.weight_kg,
          reps: set.reps,
          rpe: set.rpe,
        })),
      }))

      const weightSummary = computeWeightSummary(normalized, week.weekStart, week.weekEnd)
      const weekMeasurement = await fetchMeasurementForWeek(owner, week.weekStart, week.weekEnd)
      const snapshot = weekMeasurement ? buildMeasurementSnapshot(weekMeasurement) : null

      const row: WeeklyReportInsert = {
        client_id: owner,
        week_start: week.weekStart,
        week_end: week.weekEnd,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        weight_kg: values.weightKg ?? weekMeasurement?.weight_kg ?? null,
        mood: values.mood,
        recovery: values.recovery,
        overall_feeling: values.overallFeeling,
        stress: values.stress,
        client_notes: values.clientNotes.trim() ? values.clientNotes.trim() : null,
        measurements_snapshot: snapshot,
        weight_summary: weightSummary,
      }

      const { data, error } = await supabase
        .from('weekly_reports')
        .upsert(row, { onConflict: 'client_id,week_start' })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateReports(qc, requireClientId(clientId)),
  })
}

export function useAttachMeasurementToReport() {
  const qc = useQueryClient()
  const clientId = useClientId()
  const week = useCurrentTrainingWeek()

  return useMutation({
    mutationFn: async (measurement: BodyMeasurement): Promise<WeeklyReport> => {
      const owner = requireClientId(clientId)
      const snapshot = buildMeasurementSnapshot(measurement)

      const { data: existing } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('client_id', owner)
        .eq('week_start', week.weekStart)
        .maybeSingle()

      if (existing && (existing.status === 'submitted' || existing.status === 'reviewed')) {
        return existing
      }

      const patch: WeeklyReportInsert = {
        client_id: owner,
        week_start: week.weekStart,
        week_end: week.weekEnd,
        status: 'draft',
        weight_kg: measurement.weight_kg ?? existing?.weight_kg ?? null,
        mood: existing?.mood ?? null,
        recovery: existing?.recovery ?? null,
        overall_feeling: existing?.overall_feeling ?? null,
        stress: existing?.stress ?? null,
        client_notes: existing?.client_notes ?? null,
        measurements_snapshot: snapshot,
        weight_summary: existing?.weight_summary ?? null,
      }

      const { data, error } = await supabase
        .from('weekly_reports')
        .upsert(patch, { onConflict: 'client_id,week_start' })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateReports(qc, requireClientId(clientId)),
  })
}

export function useReviewWeeklyReport() {
  const qc = useQueryClient()
  const clientId = useClientId()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: { reportId: string; coachNotes: string | null }): Promise<WeeklyReport> => {
      const patch: WeeklyReportUpdate = {
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
        coach_notes: input.coachNotes?.trim() ? input.coachNotes.trim() : null,
      }
      const { data, error } = await supabase
        .from('weekly_reports')
        .update(patch)
        .eq('id', input.reportId)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateReports(qc, requireClientId(clientId)),
  })
}

export function useCoachWeeklyReports(limit = 100) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.weeklyReports(clientId ?? ''), 'coach', limit],
    enabled: !!clientId,
    queryFn: async (): Promise<WeeklyReport[]> => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('client_id', clientId!)
        .in('status', ['submitted', 'reviewed'])
        .order('submitted_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },
  })
}

export function useAllSubmittedReports(limit = 200) {
  return useQuery({
    queryKey: queryKeys.coachSubmittedReports(limit),
    queryFn: async (): Promise<(WeeklyReport & { client_name: string | null })[]> => {
      const { data: reports, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .in('status', ['submitted', 'reviewed'])
        .order('submitted_at', { ascending: false })
        .limit(limit)
      if (error) throw error

      const clientIds = [...new Set((reports ?? []).map((r) => r.client_id))]
      if (clientIds.length === 0) return []

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', clientIds)
      if (profileError) throw profileError

      const names = new Map((profiles ?? []).map((p) => [p.id, p.name]))
      return (reports ?? []).map((r) => ({ ...r, client_name: names.get(r.client_id) ?? null }))
    },
  })
}
