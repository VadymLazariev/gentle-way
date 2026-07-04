import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { dayBounds } from '@/api/nutrition'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useClientId } from '@/lib/client/ClientContext'
import { localDateString } from '@/lib/dates'
import { sumMealLogItems, type MacroTotals } from '@/lib/nutrition'
import type { CalcResult } from '@/lib/nutritionCalc'
import type {
  ClientDietAssignment,
  DietTemplate,
  DietTemplateDetail,
  DietTemplateInsert,
  DietTemplateItem,
  DietTemplateItemWithFood,
  DietTemplateMeal,
  FoodItem,
  MealLogItem,
  MealType,
  NutritionTarget,
} from '@/lib/types'

export type DietTemplateWithItems = DietTemplate & { items: DietTemplateItem[] }

function requireUserId(userId: string | undefined): string {
  if (!userId) throw new Error('Not signed in')
  return userId
}

function invalidateDiet(qc: ReturnType<typeof useQueryClient>, coachId: string, clientId?: string) {
  qc.invalidateQueries({ queryKey: queryKeys.dietTemplates(coachId) })
  if (clientId) {
    qc.invalidateQueries({ queryKey: queryKeys.clientDietAssignment(clientId) })
    qc.invalidateQueries({ queryKey: queryKeys.nutritionTargets(clientId) })
    qc.invalidateQueries({ queryKey: queryKeys.planAdherence(clientId) })
  }
}

function invalidateTemplate(qc: ReturnType<typeof useQueryClient>, templateId: string, coachId: string) {
  qc.invalidateQueries({ queryKey: queryKeys.dietTemplate(templateId) })
  invalidateDiet(qc, coachId)
}

async function fetchTemplateDetail(templateId: string): Promise<DietTemplateDetail> {
  const [templateRes, mealsRes, itemsRes] = await Promise.all([
    supabase.from('diet_templates').select('*').eq('id', templateId).single(),
    supabase
      .from('diet_template_meals')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('diet_template_items')
      .select('*, food_item:food_items(*)')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true }),
  ])
  if (templateRes.error) throw templateRes.error
  if (mealsRes.error) throw mealsRes.error
  if (itemsRes.error) throw itemsRes.error

  const items: DietTemplateItemWithFood[] = (itemsRes.data ?? []).map((row) => ({
    ...row,
    food_item: row.food_item as FoodItem | null,
  }))

  const meals = (mealsRes.data ?? []).map((meal) => ({
    ...meal,
    items: items.filter((item) => item.meal_id === meal.id),
  }))

  return { ...templateRes.data, meals, items }
}

export async function recomputeTemplateMacros(templateId: string): Promise<DietTemplate> {
  const { data: items, error: itemsError } = await supabase
    .from('diet_template_items')
    .select('calories, protein_g, carbs_g, fat_g')
    .eq('template_id', templateId)
  if (itemsError) throw itemsError

  const totals = sumMealLogItems(
    (items ?? []).map((item) => ({
      calories: item.calories ?? 0,
      protein_g: item.protein_g ?? 0,
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
    })),
  )

  const targetCalories = Math.max(Math.round(totals.calories), 1)
  const { data, error } = await supabase
    .from('diet_templates')
    .update({
      target_calories: targetCalories,
      protein_g: totals.proteinG,
      carbs_g: totals.carbsG,
      fat_g: totals.fatG,
    })
    .eq('id', templateId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export function useDietTemplates() {
  const { user } = useAuth()
  const coachId = user?.id
  return useQuery({
    queryKey: queryKeys.dietTemplates(coachId ?? ''),
    enabled: !!coachId,
    queryFn: async (): Promise<DietTemplate[]> => {
      const { data, error } = await supabase
        .from('diet_templates')
        .select('*')
        .order('coach_id', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useDietTemplateDetail(templateId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dietTemplate(templateId ?? ''),
    enabled: !!templateId,
    queryFn: () => fetchTemplateDetail(templateId!),
  })
}

export type DietTemplateInput = {
  name: string
  description?: string | null
  target_calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml?: number | null
  notes?: string | null
}

export function useCreateDietTemplate() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input: DietTemplateInput): Promise<DietTemplate> => {
      const owner = requireUserId(coachId)
      const row: DietTemplateInsert = {
        coach_id: owner,
        name: input.name,
        description: input.description ?? null,
        target_calories: input.target_calories,
        protein_g: input.protein_g,
        carbs_g: input.carbs_g,
        fat_g: input.fat_g,
        water_ml: input.water_ml ?? null,
        notes: input.notes ?? null,
      }
      const { data, error } = await supabase.from('diet_templates').insert(row).select('*').single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateDiet(qc, requireUserId(coachId)),
  })
}

export function useUpdateDietTemplate() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: DietTemplateInput & { id: string }): Promise<DietTemplate> => {
      const { data, error } = await supabase
        .from('diet_templates')
        .update({
          name: input.name,
          description: input.description ?? null,
          target_calories: input.target_calories,
          protein_g: input.protein_g,
          carbs_g: input.carbs_g,
          fat_g: input.fat_g,
          water_ml: input.water_ml ?? null,
          notes: input.notes ?? null,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      invalidateDiet(qc, requireUserId(coachId))
      qc.invalidateQueries({ queryKey: queryKeys.dietTemplate(data.id) })
    },
  })
}

export function useDeleteDietTemplate() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('diet_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateDiet(qc, requireUserId(coachId)),
  })
}

export type AddTemplateMealInput = {
  templateId: string
  name: string
  mealType: MealType
  sortOrder?: number
}

export function useAddTemplateMeal() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input: AddTemplateMealInput): Promise<DietTemplateMeal> => {
      const { data, error } = await supabase
        .from('diet_template_meals')
        .insert({
          template_id: input.templateId,
          name: input.name,
          meal_type: input.mealType,
          sort_order: input.sortOrder ?? 0,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) =>
      invalidateTemplate(qc, variables.templateId, requireUserId(coachId)),
  })
}

export function useDeleteTemplateMeal() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }): Promise<void> => {
      const { error } = await supabase.from('diet_template_meals').delete().eq('id', id)
      if (error) throw error
      await recomputeTemplateMacros(templateId)
    },
    onSuccess: (_data, variables) =>
      invalidateTemplate(qc, variables.templateId, requireUserId(coachId)),
  })
}

export type AddTemplateItemInput = {
  templateId: string
  mealId: string
  foodItemId: string
  quantity: number
  unit: 'g' | 'serving'
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  sortOrder?: number
}

export function useAddTemplateItem() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input: AddTemplateItemInput): Promise<DietTemplateItem> => {
      const { data, error } = await supabase
        .from('diet_template_items')
        .insert({
          template_id: input.templateId,
          meal_id: input.mealId,
          food_item_id: input.foodItemId,
          quantity: input.quantity,
          unit: input.unit,
          calories: input.calories,
          protein_g: input.proteinG,
          carbs_g: input.carbsG,
          fat_g: input.fatG,
          sort_order: input.sortOrder ?? 0,
        })
        .select('*')
        .single()
      if (error) throw error
      await recomputeTemplateMacros(input.templateId)
      return data
    },
    onSuccess: (_data, variables) =>
      invalidateTemplate(qc, variables.templateId, requireUserId(coachId)),
  })
}

export type UpdateTemplateItemInput = {
  id: string
  templateId: string
  quantity: number
  unit: 'g' | 'serving'
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export function useUpdateTemplateItem() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input: UpdateTemplateItemInput): Promise<DietTemplateItem> => {
      const { data, error } = await supabase
        .from('diet_template_items')
        .update({
          quantity: input.quantity,
          unit: input.unit,
          calories: input.calories,
          protein_g: input.proteinG,
          carbs_g: input.carbsG,
          fat_g: input.fatG,
        })
        .eq('id', input.id)
        .select('*')
        .single()
      if (error) throw error
      await recomputeTemplateMacros(input.templateId)
      return data
    },
    onSuccess: (_data, variables) =>
      invalidateTemplate(qc, variables.templateId, requireUserId(coachId)),
  })
}

export function useDeleteTemplateItem() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }): Promise<void> => {
      const { error } = await supabase.from('diet_template_items').delete().eq('id', id)
      if (error) throw error
      await recomputeTemplateMacros(templateId)
    },
    onSuccess: (_data, variables) =>
      invalidateTemplate(qc, variables.templateId, requireUserId(coachId)),
  })
}

export function useActiveDietAssignment() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.clientDietAssignment(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<(ClientDietAssignment & { template: DietTemplate }) | null> => {
      const { data, error } = await supabase
        .from('client_diet_assignments')
        .select('*, template:diet_templates(*)')
        .eq('client_id', clientId!)
        .eq('active', true)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return { ...data, template: data.template as DietTemplate }
    },
  })
}

export type AssignDietTemplateInput = {
  clientId: string
  templateId: string
  startDate?: string
  overrides?: {
    calories?: number | null
    protein_g?: number | null
    carbs_g?: number | null
    fat_g?: number | null
    water_ml?: number | null
  }
}

export function useAssignDietTemplate() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input: AssignDietTemplateInput): Promise<ClientDietAssignment> => {
      const owner = requireUserId(coachId)

      await supabase
        .from('client_diet_assignments')
        .update({ active: false })
        .eq('client_id', input.clientId)
        .eq('active', true)

      const { data: template, error: templateError } = await supabase
        .from('diet_templates')
        .select('*')
        .eq('id', input.templateId)
        .single()
      if (templateError) throw templateError

      const { data: assignment, error: assignError } = await supabase
        .from('client_diet_assignments')
        .insert({
          client_id: input.clientId,
          template_id: input.templateId,
          coach_id: owner,
          start_date: input.startDate ?? localDateString(),
          active: true,
          mode: 'prescribed',
          override_calories: input.overrides?.calories ?? null,
          override_protein_g: input.overrides?.protein_g ?? null,
          override_carbs_g: input.overrides?.carbs_g ?? null,
          override_fat_g: input.overrides?.fat_g ?? null,
          override_water_ml: input.overrides?.water_ml ?? null,
        })
        .select('*')
        .single()
      if (assignError) throw assignError

      const calories = input.overrides?.calories ?? template.target_calories
      const protein_g = input.overrides?.protein_g ?? template.protein_g
      const carbs_g = input.overrides?.carbs_g ?? template.carbs_g
      const fat_g = input.overrides?.fat_g ?? template.fat_g
      const water_ml = input.overrides?.water_ml ?? template.water_ml

      const { error: targetError } = await supabase.from('nutrition_targets').insert({
        client_id: input.clientId,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        water_ml,
        effective_from: input.startDate ?? localDateString(),
        set_by: owner,
        auto_calculated: false,
        source: 'template',
        template_id: input.templateId,
      })
      if (targetError) throw targetError

      return assignment
    },
    onSuccess: (_data, variables) => invalidateDiet(qc, requireUserId(coachId), variables.clientId),
  })
}

export type ApplyCalculatedTargetsInput = {
  clientId: string
  result: CalcResult
}

export function useApplyCalculatedTargets() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const coachId = user?.id
  return useMutation({
    mutationFn: async (input: ApplyCalculatedTargetsInput): Promise<NutritionTarget> => {
      const owner = requireUserId(coachId)
      const { data, error } = await supabase
        .from('nutrition_targets')
        .insert({
          client_id: input.clientId,
          calories: input.result.calories,
          protein_g: input.result.protein_g,
          carbs_g: input.result.carbs_g,
          fat_g: input.result.fat_g,
          water_ml: input.result.water_ml,
          effective_from: localDateString(),
          set_by: owner,
          auto_calculated: true,
          source: 'calculated',
          template_id: null,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => invalidateDiet(qc, requireUserId(coachId), variables.clientId),
  })
}

export function effectiveTemplateMacros(
  template: DietTemplate,
  assignment: ClientDietAssignment | null,
): Pick<DietTemplate, 'target_calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'water_ml'> {
  if (!assignment) return template
  return {
    target_calories: assignment.override_calories ?? template.target_calories,
    protein_g: assignment.override_protein_g ?? template.protein_g,
    carbs_g: assignment.override_carbs_g ?? template.carbs_g,
    fat_g: assignment.override_fat_g ?? template.fat_g,
    water_ml: assignment.override_water_ml ?? template.water_ml,
  }
}

export type PlanAdherence = {
  planned: MacroTotals
  eaten: MacroTotals
  plannedItemCount: number
  confirmedItemCount: number
}

export function computePlanAdherence(
  plannedItems: Pick<DietTemplateItem, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'id'>[],
  loggedItems: Pick<
    MealLogItem,
    'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'template_item_id'
  >[],
): PlanAdherence {
  const planned = sumMealLogItems(
    plannedItems.map((item) => ({
      calories: item.calories ?? 0,
      protein_g: item.protein_g ?? 0,
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
    })),
  )

  const confirmedIds = new Set(
    loggedItems.filter((item) => item.template_item_id).map((item) => item.template_item_id),
  )

  const eaten = sumMealLogItems(
    loggedItems
      .filter((item) => item.template_item_id != null)
      .map((item) => ({
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      })),
  )

  return {
    planned,
    eaten,
    plannedItemCount: plannedItems.length,
    confirmedItemCount: confirmedIds.size,
  }
}

export function usePlanAdherence(date: string) {
  const clientId = useClientId()
  const assignment = useActiveDietAssignment()
  const template = useDietTemplateDetail(assignment.data?.template_id)
  const mealsQuery = useQuery({
    queryKey: queryKeys.planAdherence(clientId ?? '', date),
    enabled: !!clientId && assignment.data?.mode === 'prescribed' && !!assignment.data?.template_id,
    queryFn: async () => {
      const bounds = dayBounds(date)
      const { data: logs, error: logsError } = await supabase
        .from('meal_logs')
        .select('id')
        .eq('client_id', clientId!)
        .gte('logged_at', bounds.start)
        .lte('logged_at', bounds.end)
      if (logsError) throw logsError
      if (!logs?.length) return []

      const logIds = logs.map((l) => l.id)
      const { data: items, error: itemsError } = await supabase
        .from('meal_log_items')
        .select('*')
        .in('meal_log_id', logIds)
      if (itemsError) throw itemsError
      return items ?? []
    },
  })

  const plannedItems = template.data?.items.filter((item) => item.meal_id != null) ?? []
  const adherence = computePlanAdherence(plannedItems, mealsQuery.data ?? [])

  return {
    assignment: assignment.data,
    template: template.data,
    adherence,
    isPrescribed: assignment.data?.mode === 'prescribed' && (template.data?.meals.length ?? 0) > 0,
    isLoading: assignment.isLoading || template.isLoading || mealsQuery.isLoading,
    isError: assignment.isError || template.isError || mealsQuery.isError,
  }
}
