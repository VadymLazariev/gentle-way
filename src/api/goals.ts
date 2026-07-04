import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useClientId } from '@/lib/client/ClientContext'
import type { Goal, GoalInsert, GoalUpdate } from '@/lib/types'

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

export type GoalInput = Omit<GoalInsert, 'client_id' | 'id' | 'created_at' | 'updated_at' | 'created_by'>

function invalidateGoals(qc: ReturnType<typeof useQueryClient>, clientId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.goals(clientId) })
}

export function useGoals(status?: Goal['status']) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.goals(clientId ?? ''), status ?? 'all'],
    enabled: !!clientId,
    queryFn: async (): Promise<Goal[]> => {
      let q = supabase
        .from('goals')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Goal[]
    },
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  const clientId = useClientId()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: GoalInput): Promise<Goal> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...input, client_id: owner, created_by: user?.id ?? null })
        .select('*')
        .single()
      if (error) throw error
      return data as Goal
    },
    onSuccess: () => invalidateGoals(qc, requireClientId(clientId)),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: GoalUpdate }): Promise<Goal> => {
      const { data, error } = await supabase
        .from('goals')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as Goal
    },
    onSuccess: () => invalidateGoals(qc, requireClientId(clientId)),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateGoals(qc, requireClientId(clientId)),
  })
}
