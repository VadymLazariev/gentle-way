import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useAuth } from '@/lib/auth/AuthProvider'
import type { ClientInvite, Profile } from '@/lib/types'

export type CoachClientSummary = {
  clientId: string
  profile: Profile | null
  linkedAt: string
  lastActiveAt: string | null
  workoutCount: number
  judoCount: number
}

function requireCoachId(coachId: string | undefined): string {
  if (!coachId) throw new Error('Not signed in as a coach')
  return coachId
}

// A URL-safe, high-entropy invite token (24 random bytes → 32 base64url chars).
function generateInviteToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function inviteLink(token: string): string {
  return `${window.location.origin}/onboard/${token}`
}

export function useClients() {
  const { user } = useAuth()
  const coachId = user?.id
  return useQuery({
    queryKey: queryKeys.coachClients(coachId ?? ''),
    enabled: !!coachId,
    queryFn: async (): Promise<CoachClientSummary[]> => {
      const owner = requireCoachId(coachId)
      const { data: links, error } = await supabase
        .from('coach_clients')
        .select('client_id, created_at')
        .eq('coach_id', owner)
        .order('created_at', { ascending: true })
      if (error) throw error
      if (links.length === 0) return []

      const clientIds = links.map((l) => l.client_id)

      const [profilesRes, workoutsRes, judoRes] = await Promise.all([
        supabase.from('profiles').select('*').in('id', clientIds),
        supabase
          .from('workout_sessions')
          .select('client_id, started_at')
          .in('client_id', clientIds),
        supabase
          .from('judo_sessions')
          .select('client_id, session_date')
          .in('client_id', clientIds),
      ])
      if (profilesRes.error) throw profilesRes.error
      if (workoutsRes.error) throw workoutsRes.error
      if (judoRes.error) throw judoRes.error

      const profileById = new Map(profilesRes.data.map((p) => [p.id, p]))
      const workoutCount = new Map<string, number>()
      const judoCount = new Map<string, number>()
      const lastActive = new Map<string, number>()

      const touch = (id: string, iso: string | null) => {
        if (!iso) return
        const t = new Date(iso).getTime()
        if (Number.isNaN(t)) return
        if (t > (lastActive.get(id) ?? -1)) lastActive.set(id, t)
      }

      for (const w of workoutsRes.data) {
        workoutCount.set(w.client_id, (workoutCount.get(w.client_id) ?? 0) + 1)
        touch(w.client_id, w.started_at)
      }
      for (const j of judoRes.data) {
        judoCount.set(j.client_id, (judoCount.get(j.client_id) ?? 0) + 1)
        touch(j.client_id, j.session_date)
      }

      return links.map((link) => {
        const last = lastActive.get(link.client_id)
        return {
          clientId: link.client_id,
          profile: profileById.get(link.client_id) ?? null,
          linkedAt: link.created_at,
          lastActiveAt: last != null ? new Date(last).toISOString() : null,
          workoutCount: workoutCount.get(link.client_id) ?? 0,
          judoCount: judoCount.get(link.client_id) ?? 0,
        }
      })
    },
  })
}

export function useClientProfile(clientId: string | undefined) {
  const { user } = useAuth()
  const coachId = user?.id
  return useQuery({
    queryKey: queryKeys.clientProfile(coachId ?? '', clientId ?? ''),
    enabled: !!coachId && !!clientId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// Pending (unused, unexpired) invites the coach can still hand out or revoke.
export function useInvites() {
  const { user } = useAuth()
  const coachId = user?.id
  return useQuery({
    queryKey: queryKeys.clientInvites(coachId ?? ''),
    enabled: !!coachId,
    queryFn: async (): Promise<ClientInvite[]> => {
      const owner = requireCoachId(coachId)
      const nowIso = new Date().toISOString()
      const { data, error } = await supabase
        .from('client_invites')
        .select('*')
        .eq('coach_id', owner)
        .is('used_at', null)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

const DEFAULT_INVITE_TTL_DAYS = 7

export function useCreateInvite() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input?: {
      email?: string | null
      ttlDays?: number
    }): Promise<ClientInvite> => {
      const owner = requireCoachId(coachId)
      const ttlDays = input?.ttlDays ?? DEFAULT_INVITE_TTL_DAYS
      const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('client_invites')
        .insert({
          token: generateInviteToken(),
          coach_id: owner,
          email: input?.email?.trim() ? input.email.trim() : null,
          expires_at: expiresAt,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clientInvites(requireCoachId(coachId)) })
    },
  })
}

export function useRevokeInvite() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('client_invites').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clientInvites(requireCoachId(coachId)) })
    },
  })
}
