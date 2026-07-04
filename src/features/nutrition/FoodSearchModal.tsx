import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Search, Star } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingState } from '@/components/ui/Feedback'
import { toast, toastError } from '@/components/ui/Toast'
import {
  useAddMealItem,
  useCacheOffProduct,
  useCreateCustomFood,
  useFavoriteFoods,
  useSearchFood,
} from '@/api/nutrition'
import { computeMacrosForQuantity, mealTypeLabel } from '@/lib/nutrition'
import type { ParsedFoodMacros } from '@/lib/openFoodFacts'
import type { FoodItem, MealType } from '@/lib/types'

const customFoodSchema = z.object({
  name: z.string().min(1, 'Name required'),
  brand: z.string().optional(),
  calories_per_100g: z.string().min(1, 'Calories required'),
  protein_per_100g: z.string().optional(),
  carbs_per_100g: z.string().optional(),
  fat_per_100g: z.string().optional(),
  serving_size_g: z.string().optional(),
})

type CustomFoodForm = z.infer<typeof customFoodSchema>

type FoodAddPayload = {
  foodItemId: string
  quantity: number
  unit: 'g' | 'serving'
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

type FoodSearchModalProps = {
  open: boolean
  onClose: () => void
  date?: string
  mealType: MealType
  onLogged?: () => void
  onAddFood?: (payload: FoodAddPayload) => Promise<void>
  submitLabel?: string
}

export function FoodSearchModal({
  open,
  onClose,
  date,
  mealType,
  onLogged,
  onAddFood,
  submitLabel,
}: FoodSearchModalProps) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [tab, setTab] = useState<'search' | 'custom' | 'my'>('search')
  const [selected, setSelected] = useState<ParsedFoodMacros | FoodItem | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [unit, setUnit] = useState<'g' | 'serving'>('g')

  const search = useSearchFood(debounced, tab === 'search')
  const favorites = useFavoriteFoods()
  const cacheOff = useCacheOffProduct()
  const createCustom = useCreateCustomFood()
  const addItem = useAddMealItem()

  const customForm = useForm<CustomFoodForm>({
    resolver: zodResolver(customFoodSchema),
    defaultValues: {
      name: '',
      brand: '',
      calories_per_100g: '',
      protein_per_100g: '0',
      carbs_per_100g: '0',
      fat_per_100g: '0',
      serving_size_g: '100',
    },
  })

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setDebounced(query), 350)
    return () => clearTimeout(t)
  }, [query, open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebounced('')
      setSelected(null)
      setTab('search')
      setQuantity('100')
      setUnit('g')
      customForm.reset()
    }
  }, [open, customForm])

  const onSelectFood = (food: ParsedFoodMacros | FoodItem) => {
    setSelected(food)
    if ('offProductId' in food && food.servingSizeG) {
      setQuantity(String(food.servingSizeG))
      setUnit('g')
    } else if ('serving_size_g' in food && food.serving_size_g) {
      setQuantity(String(food.serving_size_g))
      setUnit('g')
    } else {
      setQuantity('100')
      setUnit('g')
    }
  }

  const onAddSelected = async () => {
    if (!selected) return
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      toast('Enter a valid quantity', 'error')
      return
    }

    try {
      let foodItem: FoodItem
      if ('offProductId' in selected) {
        foodItem = await cacheOff.mutateAsync(selected)
      } else {
        foodItem = selected
      }

      const macros = computeMacrosForQuantity(foodItem, qty, unit)
      const payload: FoodAddPayload = {
        foodItemId: foodItem.id,
        quantity: qty,
        unit,
        calories: macros.calories,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
      }

      if (onAddFood) {
        await onAddFood(payload)
      } else {
        if (!date) {
          toast('Date required', 'error')
          return
        }
        await addItem.mutateAsync({
          date,
          mealType,
          ...payload,
        })
      }
      toast('Food logged', 'success')
      onLogged?.()
      onClose()
    } catch (error) {
      toastError(error)
    }
  }

  const onCreateCustom = customForm.handleSubmit(async (values) => {
    try {
      const servingG = values.serving_size_g ? Number(values.serving_size_g) : 100
      const food = await createCustom.mutateAsync({
        name: values.name,
        brand: values.brand?.trim() || null,
        calories_per_100g: Number(values.calories_per_100g),
        protein_per_100g: Number(values.protein_per_100g || 0),
        carbs_per_100g: Number(values.carbs_per_100g || 0),
        fat_per_100g: Number(values.fat_per_100g || 0),
        serving_size_g: servingG,
        calories_per_serving: (Number(values.calories_per_100g) * servingG) / 100,
        protein_per_serving: (Number(values.protein_per_100g || 0) * servingG) / 100,
        carbs_per_serving: (Number(values.carbs_per_100g || 0) * servingG) / 100,
        fat_per_serving: (Number(values.fat_per_100g || 0) * servingG) / 100,
        is_favorite: true,
      })
      onSelectFood(food)
      setTab('search')
      toast('Custom food saved to My Foods', 'success')
    } catch (error) {
      toastError(error)
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add to ${mealTypeLabel(mealType)}`}
      description="Search Open Food Facts or add a custom entry"
    >
      <div className="mb-4 flex gap-2">
        {(['search', 'my', 'custom'] as const).map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={tab === t ? 'primary' : 'outline'}
            onClick={() => setTab(t)}
          >
            {t === 'search' ? 'Search' : t === 'my' ? 'My Foods' : 'Custom'}
          </Button>
        ))}
      </div>

      {tab === 'search' ? (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <Input
              className="pl-9"
              placeholder="Search foods…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="food-search-input"
            />
          </div>

          {search.isLoading ? <LoadingState /> : null}

          <div className="max-h-48 overflow-y-auto">
            {(search.data ?? []).map((hit) => (
              <FoodHitRow
                key={hit.offProductId}
                name={hit.name}
                brand={hit.brand}
                calories={hit.caloriesPer100g}
                selected={
                  selected != null &&
                  'offProductId' in selected &&
                  selected.offProductId === hit.offProductId
                }
                onSelect={() => onSelectFood(hit)}
              />
            ))}
            {debounced.length >= 2 && !search.isLoading && (search.data ?? []).length === 0 ? (
              <div className="py-6 text-center" data-testid="food-search-empty">
                <p className="text-sm font-medium text-[var(--color-fg)]">No matching foods found</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Try a different search term or add a custom food.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === 'my' ? (
        <div className="max-h-56 overflow-y-auto">
          {(favorites.data ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--color-muted)]">
              Save custom foods or favorites to see them here.
            </p>
          ) : (
            favorites.data?.map((food) => (
              <FoodHitRow
                key={food.id}
                name={food.name}
                brand={food.brand}
                calories={food.calories_per_100g}
                favorite
                selected={selected != null && 'id' in selected && selected.id === food.id}
                onSelect={() => onSelectFood(food)}
              />
            ))
          )}
        </div>
      ) : null}

      {tab === 'custom' ? (
        <form onSubmit={onCreateCustom} className="flex flex-col gap-3">
          <div>
            <Label>Name</Label>
            <Input className="mt-1" {...customForm.register('name')} data-testid="custom-food-name" />
          </div>
          <div>
            <Label>Brand (optional)</Label>
            <Input className="mt-1" {...customForm.register('brand')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Calories / 100g</Label>
              <Input className="mt-1" type="number" {...customForm.register('calories_per_100g')} data-testid="custom-food-calories" />
            </div>
            <div>
              <Label>Protein / 100g</Label>
              <Input className="mt-1" type="number" step="0.1" {...customForm.register('protein_per_100g')} />
            </div>
            <div>
              <Label>Carbs / 100g</Label>
              <Input className="mt-1" type="number" step="0.1" {...customForm.register('carbs_per_100g')} />
            </div>
            <div>
              <Label>Fat / 100g</Label>
              <Input className="mt-1" type="number" step="0.1" {...customForm.register('fat_per_100g')} />
            </div>
          </div>
          <Button type="submit" disabled={createCustom.isPending}>
            <Plus className="h-4 w-4" /> Save &amp; use
          </Button>
        </form>
      ) : null}

      {selected && tab !== 'custom' ? (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <p className="font-medium text-[var(--color-fg)]">
            {'offProductId' in selected ? selected.name : selected.name}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                className="mt-1"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-testid="food-quantity-input"
              />
            </div>
            <div>
              <Label>Unit</Label>
              <select
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'g' | 'serving')}
              >
                <option value="g">grams</option>
                <option value="serving">serving</option>
              </select>
            </div>
          </div>
          <Button
            className="mt-4 w-full"
            onClick={onAddSelected}
            disabled={addItem.isPending || cacheOff.isPending}
            data-testid="food-add-btn"
          >
            {submitLabel ?? `Add to ${mealTypeLabel(mealType)}`}
          </Button>
        </div>
      ) : null}
    </Modal>
  )
}

function FoodHitRow({
  name,
  brand,
  calories,
  selected,
  favorite,
  onSelect,
}: {
  name: string
  brand: string | null | undefined
  calories: number | null | undefined
  selected?: boolean
  favorite?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-2 border-b border-[var(--color-border)] px-2 py-3 text-left transition-colors hover:bg-[var(--color-surface-2)] ${
        selected ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]' : ''
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--color-fg)]">
          {favorite ? <Star className="mr-1 inline h-3.5 w-3.5 text-[var(--color-accent)]" /> : null}
          {name}
        </p>
        {brand ? <p className="truncate text-xs text-[var(--color-muted)]">{brand}</p> : null}
      </div>
      {calories != null ? (
        <span className="shrink-0 text-xs text-[var(--color-muted)]">{Math.round(calories)} kcal/100g</span>
      ) : null}
    </button>
  )
}
