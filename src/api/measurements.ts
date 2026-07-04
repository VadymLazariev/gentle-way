import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useClientId } from '@/lib/client/ClientContext'
import type { MeasurementFieldKey } from '@/lib/measurements'
import type { BodyMeasurement, BodyMeasurementInsert } from '@/lib/types'

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

export type BodyMeasurementInput = Omit<BodyMeasurementInsert, 'client_id' | 'id' | 'created_at' | 'updated_at'>

export function useBodyMeasurements(limit = 120) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.bodyMeasurements(clientId ?? ''), limit],
    enabled: !!clientId,
    queryFn: async (): Promise<BodyMeasurement[]> => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('client_id', clientId!)
        .order('measured_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },
  })
}

export function useLatestMeasurement() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.latestMeasurement(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<BodyMeasurement | null> => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('client_id', clientId!)
        .order('measured_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useMeasurementForWeek(weekStart: string, weekEnd: string) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.bodyMeasurements(clientId ?? ''), 'week', weekStart, weekEnd],
    enabled: !!clientId && !!weekStart && !!weekEnd,
    queryFn: async (): Promise<BodyMeasurement | null> => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('client_id', clientId!)
        .gte('measured_at', weekStart)
        .lte('measured_at', weekEnd)
        .order('measured_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useMeasurementTrend(field: MeasurementFieldKey) {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.measurementTrend(clientId ?? '', field),
    enabled: !!clientId,
    queryFn: async (): Promise<{ measuredAt: string; value: number }[]> => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('client_id', clientId!)
        .order('measured_at', { ascending: true })
      if (error) throw error
      return (data ?? [])
        .map((row) => ({
          measuredAt: row.measured_at,
          value: row[field] as number | null,
        }))
        .filter((p): p is { measuredAt: string; value: number } => p.value != null)
    },
  })
}

function invalidateMeasurements(qc: ReturnType<typeof useQueryClient>, clientId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.bodyMeasurements(clientId) })
  qc.invalidateQueries({ queryKey: queryKeys.latestMeasurement(clientId) })
  qc.invalidateQueries({ queryKey: ['body_measurements', clientId, 'trend'] })
  qc.invalidateQueries({ queryKey: ['body_measurements', clientId, 'week'] })
}

export function useCreateMeasurement() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: BodyMeasurementInput): Promise<BodyMeasurement> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('body_measurements')
        .insert({ ...input, client_id: owner })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateMeasurements(qc, requireClientId(clientId)),
  })
}

export function useDeleteMeasurement() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('body_measurements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateMeasurements(qc, requireClientId(clientId)),
  })
}
