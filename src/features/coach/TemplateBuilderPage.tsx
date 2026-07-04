import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingState, ErrorState } from '@/components/ui/Feedback'
import { toast, toastError } from '@/components/ui/Toast'
import { FoodSearchModal } from '@/features/nutrition/FoodSearchModal'
import { MacroBar } from '@/features/nutrition/MacroProgress'
import {
  useAddTemplateItem,
  useAddTemplateMeal,
  useDeleteTemplateItem,
  useDeleteTemplateMeal,
  useDietTemplateDetail,
} from '@/api/dietTemplates'
import { MEAL_TYPES, mealTypeLabel, sumMealLogItems } from '@/lib/nutrition'
import type { DietTemplateMealWithItems, MealType } from '@/lib/types'

export function TemplateBuilderPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const detail = useDietTemplateDetail(templateId)
  const [addMealOpen, setAddMealOpen] = useState(false)
  const [addFoodMeal, setAddFoodMeal] = useState<DietTemplateMealWithItems | null>(null)

  if (detail.isLoading) return <LoadingState />
  if (detail.isError || !detail.data) return <ErrorState />

  const template = detail.data
  const rollup = sumMealLogItems(
    template.items.map((item) => ({
      calories: item.calories ?? 0,
      protein_g: item.protein_g ?? 0,
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
    })),
  )

  return (
    <div>
      <PageHeader
        title={template.name}
        subtitle="Build meals and foods — macros roll up automatically"
        action={
          <Link to="/coach/nutrition">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <Card className="mb-6" data-testid="template-macro-preview">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Plan totals</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-lg font-bold text-[var(--color-fg)]">
            {Math.round(rollup.calories)} kcal
            {template.items.length > 0 && rollup.calories !== template.target_calories ? (
              <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">
                (saved: {template.target_calories})
              </span>
            ) : null}
          </p>
          <MacroBar label="Carbs" consumed={rollup.carbsG} target={rollup.carbsG || 1} color="#60a5fa" />
          <MacroBar label="Fat" consumed={rollup.fatG} target={rollup.fatG || 1} color="#fbbf24" />
          <MacroBar label="Protein" consumed={rollup.proteinG} target={rollup.proteinG || 1} color="#34d399" />
        </CardContent>
      </Card>

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setAddMealOpen(true)} data-testid="add-template-meal-btn">
          <Plus className="h-4 w-4" /> Add meal
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {template.meals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-[var(--color-muted)]">
              Add a meal section, then search foods to build the plan.
            </CardContent>
          </Card>
        ) : (
          template.meals.map((meal) => (
            <MealSection
              key={meal.id}
              meal={meal}
              templateId={template.id}
              onAddFood={() => setAddFoodMeal(meal)}
            />
          ))
        )}
      </div>

      <AddMealModal
        open={addMealOpen}
        onClose={() => setAddMealOpen(false)}
        templateId={template.id}
        nextSortOrder={template.meals.length}
      />

      {addFoodMeal ? (
        <TemplateFoodModal
          meal={addFoodMeal}
          templateId={template.id}
          onClose={() => setAddFoodMeal(null)}
        />
      ) : null}
    </div>
  )
}

function MealSection({
  meal,
  templateId,
  onAddFood,
}: {
  meal: DietTemplateMealWithItems
  templateId: string
  onAddFood: () => void
}) {
  const removeMeal = useDeleteTemplateMeal()
  const removeItem = useDeleteTemplateItem()
  const mealTotals = sumMealLogItems(
    meal.items.map((item) => ({
      calories: item.calories ?? 0,
      protein_g: item.protein_g ?? 0,
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
    })),
  )

  const onDeleteMeal = async () => {
    if (!window.confirm(`Delete "${meal.name}" and its foods?`)) return
    try {
      await removeMeal.mutateAsync({ id: meal.id, templateId })
      toast('Meal removed', 'success')
    } catch (error) {
      toastError(error)
    }
  }

  const onDeleteItem = async (itemId: string) => {
    try {
      await removeItem.mutateAsync({ id: itemId, templateId })
      toast('Food removed', 'success')
    } catch (error) {
      toastError(error)
    }
  }

  return (
    <Card data-testid={`template-meal-${meal.id}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">{meal.name}</CardTitle>
          <p className="text-xs text-[var(--color-muted)]">{mealTypeLabel(meal.meal_type as MealType)}</p>
        </div>
        <div className="flex items-center gap-2">
          {meal.items.length > 0 ? (
            <span className="text-xs text-[var(--color-muted)]">
              {Math.round(mealTotals.calories)} kcal
            </span>
          ) : null}
          <Button size="sm" variant="outline" onClick={onAddFood} data-testid={`add-food-meal-${meal.id}`}>
            <Plus className="h-3.5 w-3.5" /> Add food
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDeleteMeal}
            disabled={removeMeal.isPending}
            aria-label={`Delete ${meal.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-[var(--color-border)] p-0">
        {meal.items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--color-muted)]">No foods yet</p>
        ) : (
          meal.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--color-fg)]">
                  {item.food_item?.name ?? item.label ?? 'Food'}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {item.quantity}
                  {item.unit} · {Math.round(Number(item.calories ?? 0))} kcal · P{' '}
                  {Math.round(Number(item.protein_g ?? 0))} C {Math.round(Number(item.carbs_g ?? 0))} F{' '}
                  {Math.round(Number(item.fat_g ?? 0))}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteItem(item.id)}
                aria-label="Remove food"
              >
                <Trash2 className="h-4 w-4 text-[var(--color-muted)]" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function AddMealModal({
  open,
  onClose,
  templateId,
  nextSortOrder,
}: {
  open: boolean
  onClose: () => void
  templateId: string
  nextSortOrder: number
}) {
  const addMeal = useAddTemplateMeal()
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState<MealType>('breakfast')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast('Meal name required', 'error')
      return
    }
    try {
      await addMeal.mutateAsync({
        templateId,
        name: name.trim(),
        mealType,
        sortOrder: nextSortOrder,
      })
      toast('Meal added', 'success')
      setName('')
      setMealType('breakfast')
      onClose()
    } catch (error) {
      toastError(error)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add meal" description="Name this meal section">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <Label>Name</Label>
          <Input
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pre-workout"
            data-testid="template-meal-name"
          />
        </div>
        <div>
          <Label>Meal type</Label>
          <Select
            className="mt-1"
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            data-testid="template-meal-type"
          >
            {MEAL_TYPES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={addMeal.isPending} data-testid="template-meal-save">
          Add meal
        </Button>
      </form>
    </Modal>
  )
}

function TemplateFoodModal({
  meal,
  templateId,
  onClose,
}: {
  meal: DietTemplateMealWithItems
  templateId: string
  onClose: () => void
}) {
  const addItem = useAddTemplateItem()

  return (
    <FoodSearchModal
      open
      onClose={onClose}
      mealType={meal.meal_type as MealType}
      submitLabel={`Add to ${meal.name}`}
      onAddFood={async (payload) => {
        await addItem.mutateAsync({
          templateId,
          mealId: meal.id,
          foodItemId: payload.foodItemId,
          quantity: payload.quantity,
          unit: payload.unit,
          calories: payload.calories,
          proteinG: payload.proteinG,
          carbsG: payload.carbsG,
          fatG: payload.fatG,
          sortOrder: meal.items.length,
        })
      }}
    />
  )
}
