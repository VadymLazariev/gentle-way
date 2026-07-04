import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useClientId } from '@/lib/client/ClientContext'
import { DEFAULT_NUTRITION_TARGET } from '@/lib/nutrition'
import {
  applyCheatMealAdjustment,
  cheatMealPhotoPath,
  CHEAT_MEAL_PHOTO_BUCKET,
  estimateCheatMeal,
  revertCheatMealAdjustment,
} from '@/lib/cheatMeal'
import type {
  CheatMeal,
  CheatMealInsert,
  CheatMealStatus,
  CheatMealUpdate,
  NutritionTarget,
} from '@/lib/types'

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

function invalidateCheatMeals(qc: ReturnType<typeof useQueryClient>, clientId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.cheatMeals(clientId) })
  qc.invalidateQueries({ queryKey: queryKeys.myCheatMeals(clientId) })
  qc.invalidateQueries({ queryKey: ['cheat_meals', 'pending'] })
  qc.invalidateQueries({ queryKey: queryKeys.coachInboxCount })
  qc.invalidateQueries({ queryKey: queryKeys.nutritionTargets(clientId) })
}

async function fetchCurrentTarget(clientId: string): Promise<NutritionTarget> {
  const { data, error } = await supabase
    .from('nutrition_targets')
    .select('*')
    .eq('client_id', clientId)
    .order('effective_from', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (data) return data
  return {
    id: 'default',
    client_id: clientId,
    ...DEFAULT_NUTRITION_TARGET,
    set_by: null,
    created_at: '',
    updated_at: '',
    source: 'manual',
    template_id: null,
  }
}

function photoExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/heic') return 'heic'
  return 'jpg'
}

async function uploadCheatMealPhoto(
  clientId: string,
  cheatMealId: string,
  file: File,
): Promise<string> {
  const ext = photoExtension(file)
  const path = cheatMealPhotoPath(clientId, cheatMealId, ext)
  const { error } = await supabase.storage.from(CHEAT_MEAL_PHOTO_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  })
  if (error) throw error
  return path
}

export type CreateCheatMealInput = {
  name: string
  amountGrams: number | null
  notes?: string | null
  photo?: File | null
}

export function useCreateCheatMeal() {
  const qc = useQueryClient()
  const clientId = useClientId()

  return useMutation({
    mutationFn: async (input: CreateCheatMealInput): Promise<CheatMeal> => {
      const owner = requireClientId(clientId)
      const grams = input.amountGrams ?? 0
      const estimate = estimateCheatMeal(grams)
      const currentTarget = await fetchCurrentTarget(owner)

      const row: CheatMealInsert = {
        client_id: owner,
        name: input.name.trim(),
        amount_grams: input.amountGrams,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        estimated_calories: estimate.calories,
        adjustment: estimate.adjustment,
      }

      const { data: created, error: insertError } = await supabase
        .from('cheat_meals')
        .insert(row)
        .select('*')
        .single()
      if (insertError) throw insertError

      let storagePath: string | null = null
      if (input.photo) {
        storagePath = await uploadCheatMealPhoto(owner, created.id, input.photo)
      }

      const appliedTargetId = await applyCheatMealAdjustment(owner, currentTarget, estimate.adjustment)

      const patch: CheatMealUpdate = {
        applied_target_id: appliedTargetId,
        storage_path: storagePath,
      }
      const { data, error } = await supabase
        .from('cheat_meals')
        .update(patch)
        .eq('id', created.id)
        .select('*')
        .single()
      if (error) {
        await revertCheatMealAdjustment(appliedTargetId)
        throw error
      }
      return data
    },
    onSuccess: () => invalidateCheatMeals(qc, requireClientId(clientId)),
  })
}

export function useCancelCheatMeal() {
  const qc = useQueryClient()
  const clientId = useClientId()

  return useMutation({
    mutationFn: async (cheatMealId: string): Promise<CheatMeal> => {
      const owner = requireClientId(clientId)

      const { data: existing, error: fetchError } = await supabase
        .from('cheat_meals')
        .select('*')
        .eq('id', cheatMealId)
        .eq('client_id', owner)
        .single()
      if (fetchError) throw fetchError
      if (existing.status !== 'pending') {
        throw new Error('Only pending cheat meals can be cancelled')
      }

      await revertCheatMealAdjustment(existing.applied_target_id)

      const { data, error } = await supabase
        .from('cheat_meals')
        .update({ status: 'cancelled' })
        .eq('id', cheatMealId)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateCheatMeals(qc, requireClientId(clientId)),
  })
}

export type ReviewCheatMealInput = {
  cheatMealId: string
  status: Extract<CheatMealStatus, 'approved' | 'rejected'>
  coachNotes?: string | null
}

export function useReviewCheatMeal() {
  const qc = useQueryClient()
  const clientId = useClientId()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: ReviewCheatMealInput): Promise<CheatMeal> => {
      const { data: existing, error: fetchError } = await supabase
        .from('cheat_meals')
        .select('*')
        .eq('id', input.cheatMealId)
        .single()
      if (fetchError) throw fetchError
      if (existing.status !== 'pending') {
        throw new Error('Only pending cheat meals can be reviewed')
      }

      if (input.status === 'rejected') {
        await revertCheatMealAdjustment(existing.applied_target_id)
      }

      const patch: CheatMealUpdate = {
        status: input.status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
        coach_notes: input.coachNotes?.trim() ? input.coachNotes.trim() : null,
        ...(input.status === 'rejected' ? { applied_target_id: null } : {}),
      }

      const { data, error } = await supabase
        .from('cheat_meals')
        .update(patch)
        .eq('id', input.cheatMealId)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => invalidateCheatMeals(qc, data.client_id || requireClientId(clientId)),
  })
}

export function useMyCheatMeals(limit = 20) {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.myCheatMeals(clientId ?? ''), limit],
    enabled: !!clientId,
    queryFn: async (): Promise<CheatMeal[]> => {
      const { data, error } = await supabase
        .from('cheat_meals')
        .select('*')
        .eq('client_id', clientId!)
        .order('submitted_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCheatMealsForClient(clientId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: [...queryKeys.cheatMeals(clientId ?? ''), limit],
    enabled: !!clientId,
    queryFn: async (): Promise<CheatMeal[]> => {
      const { data, error } = await supabase
        .from('cheat_meals')
        .select('*')
        .eq('client_id', clientId!)
        .order('submitted_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    },
  })
}

export function usePendingCheatMeals(limit = 200) {
  return useQuery({
    queryKey: queryKeys.pendingCheatMeals(limit),
    queryFn: async (): Promise<(CheatMeal & { client_name: string | null })[]> => {
      const { data: meals, error } = await supabase
        .from('cheat_meals')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })
        .limit(limit)
      if (error) throw error

      const clientIds = [...new Set((meals ?? []).map((m) => m.client_id))]
      if (clientIds.length === 0) return []

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', clientIds)
      if (profileError) throw profileError

      const names = new Map((profiles ?? []).map((p) => [p.id, p.name]))
      return (meals ?? []).map((m) => ({ ...m, client_name: names.get(m.client_id) ?? null }))
    },
  })
}

export function useCoachInboxCount() {
  return useQuery({
    queryKey: queryKeys.coachInboxCount,
    queryFn: async (): Promise<number> => {
      const [cheatRes, reportRes] = await Promise.all([
        supabase
          .from('cheat_meals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('weekly_reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'submitted'),
      ])
      if (cheatRes.error) throw cheatRes.error
      if (reportRes.error) throw reportRes.error
      return (cheatRes.count ?? 0) + (reportRes.count ?? 0)
    },
    refetchInterval: 60_000,
  })
}

export function useCheatMealPhotoUrl(storagePath: string | null | undefined) {
  return useQuery({
    queryKey: ['cheat_meal_photo', storagePath ?? ''],
    enabled: !!storagePath,
    staleTime: 300_000,
    queryFn: async (): Promise<string | null> => {
      if (!storagePath) return null
      const { data, error } = await supabase.storage
        .from(CHEAT_MEAL_PHOTO_BUCKET)
        .createSignedUrl(storagePath, 3600)
      if (error) throw error
      return data.signedUrl
    },
  })
}
