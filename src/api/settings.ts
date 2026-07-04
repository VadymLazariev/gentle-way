import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useClientId } from '@/lib/client/ClientContext'
import type { ClientSettings } from '@/lib/types'

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

export function useClientSettings() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.settings(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<ClientSettings> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('client_settings')
        .select('*')
        .eq('client_id', owner)
        .maybeSingle()
      if (error) throw error
      if (!data) {
        const inserted = await supabase
          .from('client_settings')
          .insert({ client_id: owner })
          .select('*')
          .single()
        if (inserted.error) throw inserted.error
        return inserted.data
      }
      return data
    },
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (patch: {
      program_start_date?: string
      current_week?: number | null
    }): Promise<ClientSettings> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('client_settings')
        .update(patch)
        .eq('client_id', owner)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings(requireClientId(clientId)) })
    },
  })
}
