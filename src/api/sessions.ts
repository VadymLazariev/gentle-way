import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useClientId } from '@/lib/client/ClientContext'
import { parsePrescription } from '@/lib/prescription'
import { epley1RM } from '@/lib/stats'
import type { ExerciseAdjustment } from '@/lib/adjustments'
import type {
  DayCode,
  PlannedExercise,
  SessionAdjustment,
  SessionAdjustmentInsert,
  SessionSet,
  SessionSetInsert,
  SetType,
  WorkoutSession,
  WorkoutSessionUpdate,
} from '@/lib/types'

export type SessionProvenance = {
  templateId: string
  mesocycleId: string
  templateWeek: number
}

function setLinkFields(source: PlannedExercise['source']): {
  prescription_id: number | null
  template_session_id: string | null
} {
  switch (source.kind) {
    case 'builtin':
      return { prescription_id: source.prescriptionId, template_session_id: null }
    case 'template':
      return { prescription_id: null, template_session_id: source.templateSessionId }
    default: {
      const _exhaustive: never = source
      return _exhaustive
    }
  }
}

export type PreviousSet = {
  weightKg: number | null
  reps: number | null
  setType: SetType
}

export type SessionHistoryEntry = WorkoutSession & { sets: SessionSet[] }

export type ExerciseSetPoint = {
  startedAt: string
  topWeight: number | null
  volume: number
  totalReps: number
}

function invalidateSessions(qc: ReturnType<typeof useQueryClient>, clientId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.sessions(clientId) })
  qc.invalidateQueries({ queryKey: ['session_sets', clientId] })
  qc.invalidateQueries({ queryKey: ['session_adjustments', clientId] })
}

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

export function useSessionByWeekDay(
  weekNumber: number | undefined,
  dayCode: DayCode | undefined,
  templateId?: string | null,
) {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.sessionByWeekDay(
      clientId ?? '',
      weekNumber ?? 0,
      dayCode ?? 'A',
      templateId,
    ),
    enabled: !!clientId && weekNumber !== undefined && dayCode !== undefined,
    queryFn: async (): Promise<WorkoutSession | null> => {
      let query = supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', clientId!)
        .eq('week_number', weekNumber!)
        .eq('day_code', dayCode!)
      if (templateId) {
        query = query.eq('template_id', templateId)
      } else {
        query = query.is('template_id', null)
      }
      const { data, error } = await query
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useActiveSessions() {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.sessions(clientId ?? ''), 'active'],
    enabled: !!clientId,
    queryFn: async (): Promise<WorkoutSession[]> => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', clientId!)
        .is('finished_at', null)
        .order('started_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSession(id: string | undefined) {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.session(clientId ?? '', id ?? ''),
    enabled: !!clientId && !!id,
    queryFn: async (): Promise<WorkoutSession | null> => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', clientId!)
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSessionSets(sessionId: string | undefined) {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.sessionSets(clientId ?? '', sessionId ?? ''),
    enabled: !!clientId && !!sessionId,
    queryFn: async (): Promise<SessionSet[]> => {
      const { data, error } = await supabase
        .from('session_sets')
        .select('*')
        .eq('session_id', sessionId!)
        .order('set_index', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function usePreviousSets(
  sessionId: string | undefined,
  exercises: string[],
) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.previousSets(clientId ?? '', sessionId ?? ''), exercises],
    enabled: !!clientId && !!sessionId && exercises.length > 0,
    queryFn: async (): Promise<Map<string, Map<number, PreviousSet>>> => {
      const { data: sets, error } = await supabase
        .from('session_sets')
        .select('exercise, set_index, set_type, weight_kg, reps, session_id')
        .in('exercise', exercises)
        .neq('session_id', sessionId!)
        .eq('completed', true)
      if (error) throw error

      const sessionIds = [...new Set(sets.map((s) => s.session_id))]
      if (sessionIds.length === 0) return new Map()

      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, started_at')
        .eq('client_id', clientId!)
        .in('id', sessionIds)
      if (sessionsError) throw sessionsError

      const startedAt = new Map(sessions.map((s) => [s.id, new Date(s.started_at).getTime()]))
      const latestSession = new Map<string, string>()
      const latestTime = new Map<string, number>()
      for (const s of sets) {
        if (!startedAt.has(s.session_id)) continue
        const t = startedAt.get(s.session_id) ?? 0
        if (t > (latestTime.get(s.exercise) ?? -1)) {
          latestTime.set(s.exercise, t)
          latestSession.set(s.exercise, s.session_id)
        }
      }

      const result = new Map<string, Map<number, PreviousSet>>()
      for (const s of sets) {
        if (latestSession.get(s.exercise) !== s.session_id) continue
        const inner = result.get(s.exercise) ?? new Map<number, PreviousSet>()
        inner.set(s.set_index, {
          weightKg: s.weight_kg,
          reps: s.reps,
          setType: s.set_type as SetType,
        })
        result.set(s.exercise, inner)
      }
      return result
    },
  })
}

export function usePreviousSessionVolume(
  sessionId: string | undefined,
  dayCode: DayCode | undefined,
) {
  const clientId = useClientId()
  return useQuery({
    queryKey: ['session_sets', clientId ?? '', 'prev_volume', sessionId ?? '', dayCode ?? ''],
    enabled: !!clientId && !!sessionId && dayCode !== undefined,
    queryFn: async (): Promise<number | null> => {
      const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('client_id', clientId!)
        .eq('day_code', dayCode!)
        .neq('id', sessionId!)
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .limit(1)
      if (error) throw error
      if (sessions.length === 0) return null

      const { data: sets, error: setsError } = await supabase
        .from('session_sets')
        .select('weight_kg, reps')
        .eq('session_id', sessions[0].id)
        .eq('completed', true)
      if (setsError) throw setsError

      return sets.reduce((total, s) => total + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
    },
  })
}

export function useWorkoutCount() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.workoutCount(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!)
        .not('finished_at', 'is', null)
      if (error) throw error
      return count ?? 0
    },
  })
}

export function useExerciseBests(sessionId: string | undefined, exercises: string[]) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.exerciseBests(clientId ?? '', sessionId ?? ''), exercises],
    enabled: !!clientId && !!sessionId && exercises.length > 0,
    queryFn: async (): Promise<Map<string, number>> => {
      const { data: sets, error } = await supabase
        .from('session_sets')
        .select('exercise, weight_kg, reps, session_id')
        .in('exercise', exercises)
        .neq('session_id', sessionId!)
        .eq('completed', true)
      if (error) throw error

      const sessionIds = [...new Set(sets.map((s) => s.session_id))]
      if (sessionIds.length === 0) return new Map()

      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('client_id', clientId!)
        .in('id', sessionIds)
        .not('finished_at', 'is', null)
      if (sessionsError) throw sessionsError

      const finished = new Set(sessions.map((s) => s.id))
      const bests = new Map<string, number>()
      for (const s of sets) {
        if (!finished.has(s.session_id)) continue
        if ((s.weight_kg ?? 0) <= 0 || s.reps == null || s.reps <= 0) continue
        const e = epley1RM(s.weight_kg ?? 0, s.reps)
        const current = bests.get(s.exercise)
        if (current == null || e > current) bests.set(s.exercise, e)
      }
      return bests
    },
  })
}

export function useStartSession() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: {
      weekNumber: number
      dayCode: DayCode
      blockId: number | null
      title: string
      exercises: PlannedExercise[]
      provenance?: SessionProvenance | null
      checkinId?: string | null
      adjustments?: ExerciseAdjustment[]
    }): Promise<WorkoutSession> => {
      const owner = requireClientId(clientId)
      const { data: session, error } = await supabase
        .from('workout_sessions')
        .insert({
          client_id: owner,
          week_number: input.weekNumber,
          day_code: input.dayCode,
          block_id: input.blockId,
          title: input.title,
          checkin_id: input.checkinId ?? null,
          template_id: input.provenance?.templateId ?? null,
          mesocycle_id: input.provenance?.mesocycleId ?? null,
          template_week: input.provenance?.templateWeek ?? null,
        })
        .select('*')
        .single()
      if (error) throw error

      const adjustmentByPrescription = new Map<number, ExerciseAdjustment>()
      for (const a of input.adjustments ?? []) adjustmentByPrescription.set(a.prescriptionId, a)

      const rows: SessionSetInsert[] = []
      for (const planned of input.exercises) {
        const prescriptionId =
          planned.source.kind === 'builtin' ? planned.source.prescriptionId : null
        const adjustment = prescriptionId != null ? adjustmentByPrescription.get(prescriptionId) : undefined
        if (adjustment?.action === 'skip') continue
        const exercise =
          adjustment?.action === 'swap' && adjustment.substitute
            ? adjustment.substitute
            : planned.exercise
        const parsed = parsePrescription(planned.prescription)
        const links = setLinkFields(planned.source)
        for (let i = 1; i <= parsed.sets; i += 1) {
          rows.push({
            session_id: session.id,
            exercise,
            ...links,
            set_index: i,
            set_type: 'normal',
            reps: parsed.reps,
            weight_kg: null,
            completed: false,
          })
        }
      }
      // Seed the session's sets and adjustments. If either fails, roll back the
      // just-created session row so a half-seeded workout is never left behind.
      const rollback = async (cause: unknown): Promise<never> => {
        await supabase.from('workout_sessions').delete().eq('id', session.id)
        throw cause
      }

      if (rows.length > 0) {
        const { error: setsError } = await supabase.from('session_sets').insert(rows)
        if (setsError) return rollback(setsError)
      }

      const adjustmentRows: SessionAdjustmentInsert[] = (input.adjustments ?? [])
        .filter((a) => a.action !== 'keep')
        .map((a) => ({
          session_id: session.id,
          prescription_id: a.prescriptionId,
          exercise: a.exercise,
          action: a.action,
          substitute_exercise: a.substitute,
          rpe_cap: a.rpeCap,
          reason: a.reason,
        }))
      if (adjustmentRows.length > 0) {
        const { error: adjError } = await supabase
          .from('session_adjustments')
          .insert(adjustmentRows)
        if (adjError) return rollback(adjError)
      }
      return session
    },
    onSuccess: (session, variables) => {
      const owner = requireClientId(clientId)
      qc.setQueryData(
        queryKeys.sessionByWeekDay(
          owner,
          variables.weekNumber,
          variables.dayCode,
          variables.provenance?.templateId ?? null,
        ),
        session,
      )
      invalidateSessions(qc, owner)
    },
  })
}

export function useSessionAdjustments(sessionId: string | undefined) {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.sessionAdjustments(clientId ?? '', sessionId ?? ''),
    enabled: !!clientId && !!sessionId,
    queryFn: async (): Promise<SessionAdjustment[]> => {
      const { data, error } = await supabase
        .from('session_adjustments')
        .select('*')
        .eq('session_id', sessionId!)
      if (error) throw error
      return data
    },
  })
}

export function useAddSet() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: {
      sessionId: string
      exercise: string
      prescriptionId: number | null
      templateSessionId?: string | null
      setIndex: number
      setType?: SetType
      weightKg?: number | null
      reps?: number | null
    }): Promise<SessionSet> => {
      const { data, error } = await supabase
        .from('session_sets')
        .insert({
          session_id: input.sessionId,
          exercise: input.exercise,
          prescription_id: input.prescriptionId,
          template_session_id: input.templateSessionId ?? null,
          set_index: input.setIndex,
          set_type: input.setType ?? 'normal',
          weight_kg: input.weightKg ?? null,
          reps: input.reps ?? null,
          completed: false,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateSessions(qc, requireClientId(clientId)),
  })
}

export function useUpdateSet() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: {
      id: string
      weight_kg?: number | null
      reps?: number | null
      rpe?: number | null
      completed?: boolean
      set_type?: SetType
      is_bodyweight?: boolean
    }): Promise<SessionSet> => {
      const { id, ...patch } = input
      const { data, error } = await supabase
        .from('session_sets')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateSessions(qc, requireClientId(clientId)),
  })
}

export function useDeleteSet() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('session_sets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateSessions(qc, requireClientId(clientId)),
  })
}

export function usePauseSession() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (id: string): Promise<WorkoutSession> => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .update({ paused_at: new Date().toISOString() })
        .eq('id', id)
        .is('paused_at', null)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateSessions(qc, requireClientId(clientId)),
  })
}

export function useResumeSession() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: {
      id: string
      pausedAt: string
      pausedSeconds: number
    }): Promise<WorkoutSession> => {
      const elapsed = Math.max(
        0,
        Math.round((Date.now() - new Date(input.pausedAt).getTime()) / 1000),
      )
      const { data, error } = await supabase
        .from('workout_sessions')
        .update({
          paused_at: null,
          paused_seconds: input.pausedSeconds + elapsed,
        })
        .eq('id', input.id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateSessions(qc, requireClientId(clientId)),
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: {
      id: string
      patch: WorkoutSessionUpdate
    }): Promise<WorkoutSession> => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .update(input.patch)
        .eq('id', input.id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateSessions(qc, requireClientId(clientId)),
  })
}

export function useFinishSession() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: {
      id: string
      startedAt: string
      pausedSeconds?: number
      pausedAt?: string | null
      notes?: string | null
    }): Promise<WorkoutSession> => {
      const finishedAt = new Date()
      const openPause = input.pausedAt
        ? Math.max(0, Math.round((finishedAt.getTime() - new Date(input.pausedAt).getTime()) / 1000))
        : 0
      const totalPaused = (input.pausedSeconds ?? 0) + openPause
      const duration = Math.max(
        0,
        Math.round((finishedAt.getTime() - new Date(input.startedAt).getTime()) / 1000) - totalPaused,
      )
      const patch: WorkoutSessionUpdate = {
        finished_at: finishedAt.toISOString(),
        duration_seconds: duration,
        paused_at: null,
        paused_seconds: totalPaused,
      }
      if (input.notes !== undefined) patch.notes = input.notes
      const { data, error } = await supabase
        .from('workout_sessions')
        .update(patch)
        .eq('id', input.id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateSessions(qc, requireClientId(clientId)),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('workout_sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateSessions(qc, requireClientId(clientId)),
  })
}

export function useSessionHistory(limit = 100) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.sessions(clientId ?? ''), 'history', limit],
    enabled: !!clientId,
    queryFn: async (): Promise<SessionHistoryEntry[]> => {
      const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', clientId!)
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      if (sessions.length === 0) return []

      const { data: sets, error: setsError } = await supabase
        .from('session_sets')
        .select('*')
        .in(
          'session_id',
          sessions.map((s) => s.id),
        )
        .order('set_index', { ascending: true })
      if (setsError) throw setsError

      const bySession = new Map<string, SessionSet[]>()
      for (const set of sets) {
        const list = bySession.get(set.session_id) ?? []
        list.push(set)
        bySession.set(set.session_id, list)
      }
      return sessions.map((s) => ({ ...s, sets: bySession.get(s.id) ?? [] }))
    },
  })
}

export function useProgressExercises() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.progressExercises(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('session_sets')
        .select('exercise, workout_sessions!inner(client_id)')
        .eq('completed', true)
        .eq('workout_sessions.client_id', clientId!)
        .order('exercise', { ascending: true })
      if (error) throw error
      return [...new Set(data.map((row) => row.exercise))]
    },
  })
}

export function useExerciseSetHistory(exercise: string | undefined) {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.progressByExercise(clientId ?? '', exercise ?? ''),
    enabled: !!clientId && !!exercise,
    queryFn: async (): Promise<ExerciseSetPoint[]> => {
      const { data: sets, error } = await supabase
        .from('session_sets')
        .select('session_id, weight_kg, reps, completed')
        .eq('exercise', exercise!)
        .eq('completed', true)
      if (error) throw error
      if (sets.length === 0) return []

      const sessionIds = [...new Set(sets.map((s) => s.session_id))]
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, started_at')
        .eq('client_id', clientId!)
        .in('id', sessionIds)
      if (sessionsError) throw sessionsError

      const startedAt = new Map(sessions.map((s) => [s.id, s.started_at]))
      const bySession = new Map<string, ExerciseSetPoint>()
      for (const set of sets) {
        const started = startedAt.get(set.session_id)
        if (!started) continue
        const point = bySession.get(set.session_id) ?? {
          startedAt: started,
          topWeight: null,
          volume: 0,
          totalReps: 0,
        }
        const weight = set.weight_kg ?? 0
        const reps = set.reps ?? 0
        point.volume += weight * reps
        point.totalReps += reps
        if (set.weight_kg != null && (point.topWeight == null || set.weight_kg > point.topWeight)) {
          point.topWeight = set.weight_kg
        }
        bySession.set(set.session_id, point)
      }
      return [...bySession.values()].sort(
        (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      )
    },
  })
}
