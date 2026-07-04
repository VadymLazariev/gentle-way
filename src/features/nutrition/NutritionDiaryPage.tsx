import { useState } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState, ErrorState } from '@/components/ui/Feedback'
import { toast, toastError } from '@/components/ui/Toast'
import { FoodSearchModal } from '@/features/nutrition/FoodSearchModal'
import { MacroBar } from '@/features/nutrition/MacroProgress'
import { useActiveDietAssignment, useDietTemplateDetail } from '@/api/dietTemplates'
import {
  useConfirmPlannedItem,
  useDeleteMealLogItem,
  useMealLogsForDay,
  useNutritionTargets,
  useUnconfirmPlannedItem,
} from '@/api/nutrition'
import { DEFAULT_NUTRITION_TARGET, MEAL_TYPES, mealTypeLabel, sumMealLogItems } from '@/lib/nutrition'
import { localDateString } from '@/lib/dates'
import type {
  DietTemplateItemWithFood,
  DietTemplateMealWithItems,
  FoodItem,
  MealLogItem,
  MealType,
} from '@/lib/types'

export function NutritionDiaryPage() {
  const [date, setDate] = useState(localDateString())
  const targets = useNutritionTargets()
  const meals = useMealLogsForDay(date)
  const assignment = useActiveDietAssignment()
  const template = useDietTemplateDetail(assignment.data?.template_id)
  const removeItem = useDeleteMealLogItem()
  const confirmPlanned = useConfirmPlannedItem()
  const unconfirmPlanned = useUnconfirmPlannedItem()
  const [addMealType, setAddMealType] = useState<MealType | null>(null)

  const isPrescribed =
    assignment.data?.mode === 'prescribed' && (template.data?.meals.length ?? 0) > 0

  if (meals.isLoading || targets.isLoading || assignment.isLoading || template.isLoading) {
    return <LoadingState />
  }
  if (meals.isError || targets.isError || assignment.isError || template.isError) {
    return <ErrorState />
  }

  const target = targets.data ?? {
    id: 'default',
    client_id: '',
    ...DEFAULT_NUTRITION_TARGET,
    set_by: null,
    created_at: '',
    updated_at: '',
  }

  const allItems = (meals.data ?? []).flatMap((m) => m.items)
  const totals = sumMealLogItems(allItems)

  const confirmedByTemplateId = new Map<string, MealLogItem>()
  for (const item of allItems) {
    if (item.template_item_id) {
      confirmedByTemplateId.set(item.template_item_id, item)
    }
  }

  const shiftDate = (delta: number) => {
    setDate(localDateString(addDays(parseISO(date), delta)))
  }

  const onDelete = async (itemId: string) => {
    try {
      await removeItem.mutateAsync({ id: itemId, date })
      toast('Item removed', 'success')
    } catch (error) {
      toastError(error)
    }
  }

  const onTogglePlanned = async (planned: DietTemplateItemWithFood, mealType: MealType) => {
    const confirmed = confirmedByTemplateId.get(planned.id)
    try {
      if (confirmed) {
        await unconfirmPlanned.mutateAsync({ templateItemId: planned.id, date })
        toast('Planned item unchecked', 'success')
      } else {
        if (!planned.food_item_id) {
          toast('Food item missing from plan', 'error')
          return
        }
        await confirmPlanned.mutateAsync({
          date,
          mealType,
          templateItemId: planned.id,
          foodItemId: planned.food_item_id,
          quantity: Number(planned.quantity ?? 0),
          unit: (planned.unit ?? 'g') as 'g' | 'serving',
          calories: Number(planned.calories ?? 0),
          proteinG: Number(planned.protein_g ?? 0),
          carbsG: Number(planned.carbs_g ?? 0),
          fatG: Number(planned.fat_g ?? 0),
        })
        toast('Planned item confirmed', 'success')
      }
    } catch (error) {
      toastError(error)
    }
  }

  const freeItemsByMealType = (mealType: MealType) => {
    const log = (meals.data ?? []).find((m) => m.meal_type === mealType)
    return (log?.items ?? []).filter((item) => !item.template_item_id)
  }

  return (
    <div>
      <PageHeader
        title="Food diary"
        subtitle={isPrescribed ? 'Follow your coach plan or add extras' : 'Log meals by type'}
        action={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => shiftDate(-1)} aria-label="Previous day">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="min-w-[7rem] text-center text-sm font-medium text-[var(--color-fg)]">
              {format(parseISO(date), 'MMM d, yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => shiftDate(1)}
              aria-label="Next day"
              disabled={date >= localDateString()}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        }
      />

      <Card className="mb-6" data-testid="diary-daily-totals">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily totals</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-lg font-bold text-[var(--color-fg)]">
            {Math.round(totals.calories)} / {target.calories} kcal
          </p>
          <MacroBar label="Carbs" consumed={totals.carbsG} target={Number(target.carbs_g)} color="#60a5fa" />
          <MacroBar label="Fat" consumed={totals.fatG} target={Number(target.fat_g)} color="#fbbf24" />
          <MacroBar label="Protein" consumed={totals.proteinG} target={Number(target.protein_g)} color="#34d399" />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {isPrescribed && template.data
          ? template.data.meals.map((meal) => (
              <PrescribedMealCard
                key={meal.id}
                meal={meal}
                confirmedByTemplateId={confirmedByTemplateId}
                freeItems={freeItemsByMealType(meal.meal_type as MealType)}
                onTogglePlanned={onTogglePlanned}
                onDeleteFree={onDelete}
                onAdd={() => setAddMealType(meal.meal_type as MealType)}
                toggling={confirmPlanned.isPending || unconfirmPlanned.isPending}
              />
            ))
          : MEAL_TYPES.map((meal) => {
              const log = (meals.data ?? []).find((m) => m.meal_type === meal.value)
              const items = log?.items ?? []
              const mealTotals = sumMealLogItems(items)

              return (
                <Card key={meal.value}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">{meal.label}</CardTitle>
                    <div className="flex items-center gap-2">
                      {items.length > 0 ? (
                        <span className="text-xs text-[var(--color-muted)]">
                          {Math.round(mealTotals.calories)} kcal
                        </span>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddMealType(meal.value)}
                        data-testid={`add-food-${meal.value}`}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col divide-y divide-[var(--color-border)] p-0">
                    {items.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-[var(--color-muted)]">Nothing logged yet</p>
                    ) : (
                      items.map((item) => (
                        <LoggedItemRow key={item.id} item={item} onDelete={() => onDelete(item.id)} />
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
      </div>

      {addMealType ? (
        <FoodSearchModal
          open
          onClose={() => setAddMealType(null)}
          date={date}
          mealType={addMealType}
        />
      ) : null}
    </div>
  )
}

function PrescribedMealCard({
  meal,
  confirmedByTemplateId,
  freeItems,
  onTogglePlanned,
  onDeleteFree,
  onAdd,
  toggling,
}: {
  meal: DietTemplateMealWithItems
  confirmedByTemplateId: Map<string, MealLogItem>
  freeItems: (MealLogItem & { food_item?: FoodItem })[]
  onTogglePlanned: (planned: DietTemplateItemWithFood, mealType: MealType) => void
  onDeleteFree: (itemId: string) => void
  onAdd: () => void
  toggling: boolean
}) {
  const mealType = meal.meal_type as MealType
  const plannedTotals = sumMealLogItems(
    meal.items.map((item) => ({
      calories: item.calories ?? 0,
      protein_g: item.protein_g ?? 0,
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
    })),
  )

  return (
    <Card data-testid={`prescribed-meal-${meal.id}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">{meal.name}</CardTitle>
          <p className="text-xs text-[var(--color-muted)]">{mealTypeLabel(mealType)} · coach plan</p>
        </div>
        <div className="flex items-center gap-2">
          {meal.items.length > 0 ? (
            <span className="text-xs text-[var(--color-muted)]">
              {Math.round(plannedTotals.calories)} kcal planned
            </span>
          ) : null}
          <Button size="sm" variant="outline" onClick={onAdd} data-testid={`add-food-${mealType}`}>
            <Plus className="h-3.5 w-3.5" /> Add extra
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-[var(--color-border)] p-0">
        {meal.items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--color-muted)]">No planned foods</p>
        ) : (
          meal.items.map((item) => {
            const checked = confirmedByTemplateId.has(item.id)
            return (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-2)]"
                data-testid={`planned-item-${item.id}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={toggling}
                  onChange={() => onTogglePlanned(item, mealType)}
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                  data-testid={`planned-check-${item.id}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--color-fg)]">
                    {item.food_item?.name ?? item.label ?? 'Food'}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {item.quantity}
                    {item.unit} · {Math.round(Number(item.calories ?? 0))} kcal
                  </p>
                </div>
              </label>
            )
          })
        )}
        {freeItems.length > 0 ? (
          <>
            <p className="px-5 py-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Extra items
            </p>
            {freeItems.map((item) => (
              <LoggedItemRow key={item.id} item={item} onDelete={() => onDeleteFree(item.id)} />
            ))}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function LoggedItemRow({
  item,
  onDelete,
}: {
  item: MealLogItem & { food_item?: FoodItem }
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-[var(--color-fg)]">
          {item.food_item?.name ?? 'Food'}
        </p>
        <p className="text-xs text-[var(--color-muted)]">
          {item.quantity}
          {item.unit} · {Math.round(Number(item.calories))} kcal · P{' '}
          {Math.round(Number(item.protein_g))} C {Math.round(Number(item.carbs_g))} F{' '}
          {Math.round(Number(item.fat_g))}
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Remove ${item.food_item?.name}`}>
        <Trash2 className="h-4 w-4 text-[var(--color-muted)]" />
      </Button>
    </div>
  )
}
