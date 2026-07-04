import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useClientId } from '@/lib/client/ClientContext'
import type { PushSubscription } from '@/lib/types'

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

export function usePushSubscriptions() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.pushSubscriptions(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<PushSubscription[]> => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('client_id', clientId!)
      if (error) throw error
      return data
    },
  })
}

export function useSavePushSubscription() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: {
      endpoint: string
      p256dh: string
      auth: string
      userAgent: string | null
    }): Promise<PushSubscription> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            client_id: owner,
            endpoint: input.endpoint,
            p256dh: input.p256dh,
            auth: input.auth,
            user_agent: input.userAgent,
          },
          { onConflict: 'client_id,endpoint' },
        )
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pushSubscriptions(requireClientId(clientId)) })
    },
  })
}

export function useDeletePushSubscription() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (endpoint: string): Promise<void> => {
      const owner = requireClientId(clientId)
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('client_id', owner)
        .eq('endpoint', endpoint)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pushSubscriptions(requireClientId(clientId)) })
    },
  })
}
