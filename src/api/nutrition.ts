import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfDay, parseISO, startOfDay } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/api/keys'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useClientId } from '@/lib/client/ClientContext'
import { DEFAULT_NUTRITION_TARGET, sumMealLogItems, type MacroTotals } from '@/lib/nutrition'
import {
  fetchOpenFoodFactsByBarcode,
  parseOffProduct,
  searchOpenFoodFacts,
  type ParsedFoodMacros,
} from '@/lib/openFoodFacts'
import type {
  FoodItem,
  FoodItemInsert,
  MealLog,
  MealLogItem,
  MealLogWithItems,
  MealType,
  NutritionTarget,
  NutritionTargetInsert,
} from '@/lib/types'

function requireClientId(clientId: string | undefined): string {
  if (!clientId) throw new Error('No client selected')
  return clientId
}

function dayBounds(date: string): { start: string; end: string } {
  const d = parseISO(date)
  return {
    start: startOfDay(d).toISOString(),
    end: endOfDay(d).toISOString(),
  }
}

export { dayBounds }

function invalidateNutrition(qc: ReturnType<typeof useQueryClient>, clientId: string, date?: string) {
  qc.invalidateQueries({ queryKey: queryKeys.nutritionTargets(clientId) })
  qc.invalidateQueries({ queryKey: queryKeys.foodItems(clientId) })
  qc.invalidateQueries({ queryKey: queryKeys.myFoods(clientId) })
  qc.invalidateQueries({ queryKey: queryKeys.planAdherence(clientId) })
  if (date) {
    qc.invalidateQueries({ queryKey: queryKeys.mealLogs(clientId, date) })
    qc.invalidateQueries({ queryKey: queryKeys.dailyNutrition(clientId, date) })
    qc.invalidateQueries({ queryKey: queryKeys.planAdherence(clientId, date) })
  } else {
    qc.invalidateQueries({ queryKey: ['meal_logs', clientId] })
    qc.invalidateQueries({ queryKey: ['nutrition_daily', clientId] })
  }
}

function parsedToFoodInsert(parsed: ParsedFoodMacros, ownerClientId: string | null): FoodItemInsert {
  return {
    owner_client_id: ownerClientId,
    barcode: parsed.barcode,
    off_product_id: parsed.offProductId,
    name: parsed.name,
    brand: parsed.brand,
    source: 'off',
    calories_per_100g: parsed.caloriesPer100g,
    protein_per_100g: parsed.proteinPer100g,
    carbs_per_100g: parsed.carbsPer100g,
    fat_per_100g: parsed.fatPer100g,
    serving_size_g: parsed.servingSizeG,
    serving_description: parsed.servingDescription,
    calories_per_serving: parsed.caloriesPerServing,
    protein_per_serving: parsed.proteinPerServing,
    carbs_per_serving: parsed.carbsPerServing,
    fat_per_serving: parsed.fatPerServing,
  }
}

export function useNutritionTargets() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.nutritionTargets(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<NutritionTarget | null> => {
      const { data, error } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('client_id', clientId!)
        .order('effective_from', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpsertNutritionTargets() {
  const qc = useQueryClient()
  const clientId = useClientId()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (
      input: Omit<NutritionTargetInsert, 'client_id' | 'id' | 'created_at' | 'updated_at'>,
    ): Promise<NutritionTarget> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('nutrition_targets')
        .insert({
          ...input,
          client_id: owner,
          set_by: user?.id ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateNutrition(qc, requireClientId(clientId)),
  })
}

export function useDefaultNutritionTarget(): NutritionTarget {
  const targets = useNutritionTargets()
  if (targets.data) return targets.data
  return {
    id: 'default',
    client_id: '',
    ...DEFAULT_NUTRITION_TARGET,
    set_by: null,
    created_at: '',
    updated_at: '',
  }
}

export function useSearchFood(query: string, enabled = true) {
  return useQuery({
    queryKey: ['off_search', query],
    enabled: enabled && query.trim().length >= 2,
    staleTime: 60_000,
    queryFn: async (): Promise<ParsedFoodMacros[]> => searchOpenFoodFacts(query),
  })
}

export function useMyFoods() {
  const clientId = useClientId()
  return useQuery({
    queryKey: queryKeys.myFoods(clientId ?? ''),
    enabled: !!clientId,
    queryFn: async (): Promise<FoodItem[]> => {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('owner_client_id', clientId!)
        .order('is_favorite', { ascending: false })
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useFavoriteFoods() {
  const clientId = useClientId()
  return useQuery({
    queryKey: [...queryKeys.myFoods(clientId ?? ''), 'favorites'],
    enabled: !!clientId,
    queryFn: async (): Promise<FoodItem[]> => {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('owner_client_id', clientId!)
        .eq('is_favorite', true)
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

async function upsertOffFoodItem(parsed: ParsedFoodMacros): Promise<FoodItem> {
  const { data: existing } = await supabase
    .from('food_items')
    .select('*')
    .eq('off_product_id', parsed.offProductId)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('food_items')
    .insert(parsedToFoodInsert(parsed, null))
    .select('*')
    .single()
  if (error) {
    const { data: retry } = await supabase
      .from('food_items')
      .select('*')
      .eq('off_product_id', parsed.offProductId)
      .maybeSingle()
    if (retry) return retry
    throw error
  }
  return data
}

export function useCacheOffProduct() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (parsed: ParsedFoodMacros): Promise<FoodItem> => upsertOffFoodItem(parsed),
    onSuccess: () => {
      if (clientId) invalidateNutrition(qc, clientId)
    },
  })
}

export function useCreateCustomFood() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (
      input: Omit<FoodItemInsert, 'client_id' | 'id' | 'created_at' | 'updated_at' | 'source' | 'owner_client_id'>,
    ): Promise<FoodItem> => {
      const owner = requireClientId(clientId)
      const { data, error } = await supabase
        .from('food_items')
        .insert({
          ...input,
          owner_client_id: owner,
          source: 'custom',
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateNutrition(qc, requireClientId(clientId)),
  })
}

export function useToggleFoodFavorite() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async ({ food, isFavorite }: { food: FoodItem; isFavorite: boolean }): Promise<FoodItem> => {
      const owner = requireClientId(clientId)

      if (food.owner_client_id === owner) {
        const { data, error } = await supabase
          .from('food_items')
          .update({ is_favorite: isFavorite })
          .eq('id', food.id)
          .select('*')
          .single()
        if (error) throw error
        return data
      }

      if (food.source === 'off' && isFavorite) {
        const { data, error } = await supabase
          .from('food_items')
          .insert({
            owner_client_id: owner,
            barcode: food.barcode,
            off_product_id: null,
            name: food.name,
            brand: food.brand,
            source: 'custom',
            calories_per_100g: food.calories_per_100g,
            protein_per_100g: food.protein_per_100g,
            carbs_per_100g: food.carbs_per_100g,
            fat_per_100g: food.fat_per_100g,
            serving_size_g: food.serving_size_g,
            serving_description: food.serving_description,
            calories_per_serving: food.calories_per_serving,
            protein_per_serving: food.protein_per_serving,
            carbs_per_serving: food.carbs_per_serving,
            fat_per_serving: food.fat_per_serving,
            is_favorite: true,
          })
          .select('*')
          .single()
        if (error) throw error
        return data
      }

      throw new Error('Cannot update favorite for this food item')
    },
    onSuccess: () => invalidateNutrition(qc, requireClientId(clientId)),
  })
}

export function useMealLogsForDay(date: string) {
  const clientId = useClientId()
  const bounds = dayBounds(date)
  return useQuery({
    queryKey: queryKeys.mealLogs(clientId ?? '', date),
    enabled: !!clientId,
    queryFn: async (): Promise<MealLogWithItems[]> => {
      const { data: logs, error: logsError } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('client_id', clientId!)
        .gte('logged_at', bounds.start)
        .lte('logged_at', bounds.end)
        .order('logged_at', { ascending: true })
      if (logsError) throw logsError
      if (!logs?.length) return []

      const logIds = logs.map((l) => l.id)
      const { data: items, error: itemsError } = await supabase
        .from('meal_log_items')
        .select('*, food_item:food_items(*)')
        .in('meal_log_id', logIds)
      if (itemsError) throw itemsError

      return logs.map((log) => ({
        ...log,
        items: (items ?? [])
          .filter((i) => i.meal_log_id === log.id)
          .map((i) => ({
            ...i,
            food_item: i.food_item as FoodItem,
          })),
      }))
    },
  })
}

export function useDailyNutritionTotals(date: string) {
  const meals = useMealLogsForDay(date)
  const allItems = (meals.data ?? []).flatMap((m) => m.items)
  const totals = sumMealLogItems(allItems)
  return { ...meals, totals }
}

export type AddMealItemInput = {
  date: string
  mealType: MealType
  foodItemId: string
  quantity: number
  unit: 'g' | 'serving'
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  notes?: string | null
  templateItemId?: string | null
}

export function useAddMealItem() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async (input: AddMealItemInput): Promise<MealLogItem> => {
      const owner = requireClientId(clientId)
      const bounds = dayBounds(input.date)

      let mealLog: MealLog | null = null
      const { data: existing } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('client_id', owner)
        .eq('meal_type', input.mealType)
        .gte('logged_at', bounds.start)
        .lte('logged_at', bounds.end)
        .limit(1)
        .maybeSingle()

      if (existing) {
        mealLog = existing
      } else {
        const loggedAt = `${input.date}T12:00:00`
        const { data: created, error: createError } = await supabase
          .from('meal_logs')
          .insert({
            client_id: owner,
            meal_type: input.mealType,
            logged_at: loggedAt,
            notes: input.notes ?? null,
          })
          .select('*')
          .single()
        if (createError) throw createError
        mealLog = created
      }

      const { data, error } = await supabase
        .from('meal_log_items')
        .insert({
          meal_log_id: mealLog.id,
          food_item_id: input.foodItemId,
          quantity: input.quantity,
          unit: input.unit,
          calories: input.calories,
          protein_g: input.proteinG,
          carbs_g: input.carbsG,
          fat_g: input.fatG,
          template_item_id: input.templateItemId ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => invalidateNutrition(qc, requireClientId(clientId), variables.date),
  })
}

export function useDeleteMealLogItem() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async ({ id }: { id: string; date: string }): Promise<void> => {
      const { error } = await supabase.from('meal_log_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => invalidateNutrition(qc, requireClientId(clientId), variables.date),
  })
}

export type ConfirmPlannedItemInput = {
  date: string
  mealType: MealType
  templateItemId: string
  foodItemId: string
  quantity: number
  unit: 'g' | 'serving'
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export function useConfirmPlannedItem() {
  const addItem = useAddMealItem()
  return useMutation({
    mutationFn: async (input: ConfirmPlannedItemInput) =>
      addItem.mutateAsync({
        ...input,
        templateItemId: input.templateItemId,
      }),
  })
}

export function useUnconfirmPlannedItem() {
  const qc = useQueryClient()
  const clientId = useClientId()
  return useMutation({
    mutationFn: async ({
      templateItemId,
    }: {
      templateItemId: string
      date: string
    }): Promise<void> => {
      const { error } = await supabase
        .from('meal_log_items')
        .delete()
        .eq('template_item_id', templateItemId)
      if (error) throw error
    },
    onSuccess: (_data, variables) =>
      invalidateNutrition(qc, requireClientId(clientId), variables.date),
  })
}

export async function resolveFoodFromOff(parsed: ParsedFoodMacros): Promise<FoodItem> {
  return upsertOffFoodItem(parsed)
}

export async function resolveFoodFromBarcode(barcode: string): Promise<FoodItem | null> {
  const { data: cached } = await supabase
    .from('food_items')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle()
  if (cached) return cached

  const parsed = await fetchOpenFoodFactsByBarcode(barcode)
  if (!parsed) return null
  return upsertOffFoodItem(parsed)
}

export type DailySummary = {
  date: string
  totals: MacroTotals
  target: NutritionTarget | null
}

export function useNutritionDashboard(date: string) {
  const targets = useNutritionTargets()
  const daily = useDailyNutritionTotals(date)
  const target = targets.data ?? null

  return {
    target,
    effectiveTarget: target ?? {
      id: 'default',
      client_id: '',
      ...DEFAULT_NUTRITION_TARGET,
      set_by: null,
      created_at: '',
      updated_at: '',
    },
    totals: daily.totals,
    meals: daily.data ?? [],
    isLoading: targets.isLoading || daily.isLoading,
    isError: targets.isError || daily.isError,
  }
}

export { searchOpenFoodFacts, fetchOpenFoodFactsByBarcode, parseOffProduct }
