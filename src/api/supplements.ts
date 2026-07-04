import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useClientId } from '@/lib/client/ClientContext'
import type { Supplement, SupplementInsert, SupplementLog, SupplementUpdate } from '@/lib/types'

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

export type SupplementInput = Omit<
  SupplementInsert,
  'client_id' | 'id' | 'created_at' | 'updated_at' | 'created_by'
>

export type SupplementWithLogs = Supplement & { logs: SupplementLog[] }

function invalidateSupplements(qc: ReturnType<typeof useQueryClient>, clientId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.supplements(clientId) })
  qc.invalidateQueries({ queryKey: queryKeys.supplementLogs(clientId) })
}

export function useSupplements(activeOnly = true) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.supplements(clientId ?? ''), activeOnly],
    enabled: !!clientId,
    queryFn: async (): Promise<Supplement[]> => {
      let q = supabase
        .from('supplements')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (activeOnly) q = q.eq('is_active', true)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useSupplementLogs(days = 30) {
  const clientId = useClientId()
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')
  return useQuery({
    queryKey: [...queryKeys.supplementLogs(clientId ?? ''), days],
    enabled: !!clientId,
    queryFn: async (): Promise<SupplementLog[]> => {
      const { data, error } = await supabase
        .from('supplement_logs')
        .select('*')
        .eq('client_id', clientId!)
        .gte('logged_on', since)
        .order('logged_on', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSupplementsWithLogs(days = 30) {
  const supplements = useSupplements(false)
  const logs = useSupplementLogs(days)
  const combined = supplements.data?.map((s) => ({
    ...s,
    logs: (logs.data ?? []).filter((l) => l.supplement_id === s.id),
  }))

  return {
    supplements: supplements.data ?? [],
    logs: logs.data ?? [],
    combined: combined ?? [],
    isLoading: supplements.isLoading || logs.isLoading,
    isError: supplements.isError || logs.isError,
  }
}

export function useCreateSupplement() {
  const qc = useQueryClient()
  const clientId = useClientId()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: SupplementInput): Promise<Supplement> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('supplements')
        .insert({ ...input, client_id: owner, created_by: user?.id ?? null })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateSupplements(qc, requireClientId(clientId)),
  })
}

export function useUpdateSupplement() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: SupplementUpdate
    }): Promise<Supplement> => {
      const { data, error } = await supabase
        .from('supplements')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateSupplements(qc, requireClientId(clientId)),
  })
}

export function useLogSupplement() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async ({
      supplementId,
      loggedOn,
      takenSlots,
      doseCount,
    }: {
      supplementId: string
      loggedOn: string
      takenSlots: number[]
      doseCount: number
    }): Promise<SupplementLog> => {
      const owner = requireClientId(clientId)
      const uniqueSlots = [...new Set(takenSlots)].sort((a, b) => a - b)
      const taken = uniqueSlots.length >= doseCount
      const { data, error } = await supabase
        .from('supplement_logs')
        .upsert(
          {
            supplement_id: supplementId,
            client_id: owner,
            logged_on: loggedOn,
            taken,
            taken_slots: uniqueSlots,
          },
          { onConflict: 'supplement_id,logged_on' },
        )
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateSupplements(qc, requireClientId(clientId)),
  })
}

export function useDeleteSupplement() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('supplements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateSupplements(qc, requireClientId(clientId)),
  })
}
