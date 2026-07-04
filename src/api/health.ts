import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useClientId } from '@/lib/client/ClientContext'
import { localDateString } from '@/lib/dates'
import type {
  BodyArea,
  Injury,
  InjuryInsert,
  InjurySeverity,
  InjuryStatus,
  InjuryUpdate,
  SessionCheckin,
} from '@/lib/types'

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

export function useInjuries() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.injuries(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<Injury[]> => {
      const { data, error } = await supabase
        .from('injuries')
        .select('*')
        .eq('client_id', clientId!)
        .order('noted_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSessionCheckins(limit = 60) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.checkins(clientId ?? ''), limit],
    enabled: !!clientId,
    queryFn: async (): Promise<SessionCheckin[]> => {
      const { data, error } = await supabase
        .from('session_checkins')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },
  })
}

export function useActiveInjuries() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.activeInjuries(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<Injury[]> => {
      const { data, error } = await supabase
        .from('injuries')
        .select('*')
        .eq('client_id', clientId!)
        .in('status', ['active', 'improving'])
        .order('noted_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

function invalidateInjuries(qc: ReturnType<typeof useQueryClient>, clientId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.injuries(clientId) })
  qc.invalidateQueries({ queryKey: queryKeys.activeInjuries(clientId) })
}

export function useCreateInjury() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: InjuryInsert): Promise<Injury> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('injuries')
        .insert({ ...input, client_id: owner })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateInjuries(qc, requireClientId(clientId)),
  })
}

export function useUpdateInjury() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: {
      id: string
      severity?: InjurySeverity
      status?: InjuryStatus
      notes?: string | null
    }): Promise<Injury> => {
      const { id, status, severity, notes } = input
      const patch: InjuryUpdate = {}
      if (severity !== undefined) patch.severity = severity
      if (notes !== undefined) patch.notes = notes
      if (status) {
        patch.status = status
        patch.resolved_at = status === 'resolved' ? localDateString() : null
      }
      const { data, error } = await supabase
        .from('injuries')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateInjuries(qc, requireClientId(clientId)),
  })
}

export function useDeleteInjury() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('injuries').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateInjuries(qc, requireClientId(clientId)),
  })
}

// Pre-workout check-in persistence is deferred to workout Start: the UI collects
// a draft in memory and only this mutation writes to the database, so backing out
// before starting never leaves orphan injuries, check-ins, or join rows behind.
export type CommitCheckinInput = {
  sleepQuality: number | null
  soreness: number | null
  fatigue: number | null
  mood: number | null
  stress: number | null
  recovery: number | null
  overallFeeling: number | null
  notes: string | null
  injuryUpdates: { injuryId: string; status?: InjuryStatus; severity?: InjurySeverity }[]
  existingJoins: { injuryId: string; severityAtTime: InjurySeverity }[]
  newInjuries: { bodyArea: BodyArea; severity: InjurySeverity }[]
}

export function useCommitCheckin() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: CommitCheckinInput): Promise<SessionCheckin> => {
      const owner = requireClientId(clientId)
      for (const u of input.injuryUpdates) {
        const patch: InjuryUpdate = {}
        if (u.severity !== undefined) patch.severity = u.severity
        if (u.status !== undefined) {
          patch.status = u.status
          patch.resolved_at = u.status === 'resolved' ? localDateString() : null
        }
        const { error } = await supabase.from('injuries').update(patch).eq('id', u.injuryId)
        if (error) throw error
      }

      const joins = [...input.existingJoins]
      for (const n of input.newInjuries) {
        const { data, error } = await supabase
          .from('injuries')
          .insert({ body_area: n.bodyArea, severity: n.severity, status: 'active', client_id: owner })
          .select('id')
          .single()
        if (error) throw error
        joins.push({ injuryId: data.id, severityAtTime: n.severity })
      }

      const { data: checkin, error } = await supabase
        .from('session_checkins')
        .insert({
          client_id: owner,
          sleep_quality: input.sleepQuality,
          soreness: input.soreness,
          fatigue: input.fatigue,
          mood: input.mood,
          stress: input.stress,
          recovery: input.recovery,
          overall_feeling: input.overallFeeling,
          notes: input.notes,
        })
        .select('*')
        .single()
      if (error) throw error

      if (joins.length > 0) {
        const { error: joinError } = await supabase.from('checkin_injuries').insert(
          joins.map((j) => ({
            checkin_id: checkin.id,
            injury_id: j.injuryId,
            severity_at_time: j.severityAtTime,
          })),
        )
        if (joinError) throw joinError
      }
      return checkin
    },
    onSuccess: () => {
      invalidateInjuries(qc, requireClientId(clientId))
      qc.invalidateQueries({ queryKey: queryKeys.checkins(requireClientId(clientId)) })
    },
  })
}
