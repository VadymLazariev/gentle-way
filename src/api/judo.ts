import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useClientId } from '@/lib/client/ClientContext'
import type { JudoSession, JudoSessionInsert, JudoSessionUpdate } from '@/lib/types'

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

export function useJudoSessions(limit = 200) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.judoSessions(clientId ?? ''), limit],
    enabled: !!clientId,
    queryFn: async (): Promise<JudoSession[]> => {
      const { data, error } = await supabase
        .from('judo_sessions')
        .select('*')
        .eq('client_id', clientId!)
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },
  })
}

export function useCreateJudoSession() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: JudoSessionInsert): Promise<JudoSession> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('judo_sessions')
        .insert({ ...input, client_id: owner })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.judoSessions(requireClientId(clientId)) }),
  })
}

export function useUpdateJudoSession() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: { id: string; patch: JudoSessionUpdate }): Promise<JudoSession> => {
      const { data, error } = await supabase
        .from('judo_sessions')
        .update(input.patch)
        .eq('id', input.id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.judoSessions(requireClientId(clientId)) }),
  })
}

export function useDeleteJudoSession() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('judo_sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.judoSessions(requireClientId(clientId)) }),
  })
}
