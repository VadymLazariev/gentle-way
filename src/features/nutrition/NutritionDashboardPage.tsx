import { useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  Activity,
  ChevronRight,
  ClipboardCheck,
  Cookie,
  Plus,
  Settings2,
  Utensils,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState, ErrorState } from '@/components/ui/Feedback'
import { DueNowBanner } from '@/features/supplements/DueNowBanner'
import { FoodSearchModal } from '@/features/nutrition/FoodSearchModal'
import { MacroBar, ProgressRing } from '@/features/nutrition/MacroProgress'
import { NutritionTargetsModal } from '@/features/nutrition/NutritionTargetsModal'
import { WeightMiniChart } from '@/features/nutrition/WeightMiniChart'
import { CheatMealModal } from '@/features/nutrition/CheatMealModal'
import { useNutritionDashboard } from '@/api/nutrition'
import { useActiveDietAssignment, usePlanAdherence } from '@/api/dietTemplates'
import { useCancelCheatMeal, useMyCheatMeals } from '@/api/cheatMeals'
import { caloriesRemaining } from '@/lib/nutrition'
import { localDateString } from '@/lib/dates'
import { toast, toastError } from '@/components/ui/Toast'
import type { CheatMeal, CheatMealAdjustment, MealType } from '@/lib/types'

export function NutritionDashboardPage() {
  const today = localDateString()
  const dashboard = useNutritionDashboard(today)
  const dietAssignment = useActiveDietAssignment()
  const planAdherence = usePlanAdherence(today)
  const cheatMeals = useMyCheatMeals()
  const cancelCheatMeal = useCancelCheatMeal()
  const [targetsOpen, setTargetsOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [cheatMealOpen, setCheatMealOpen] = useState(false)
  const [addMealType, setAddMealType] = useState<MealType>('breakfast')

  if (dashboard.isLoading || cheatMeals.isLoading) return <LoadingState />
  if (dashboard.isError || cheatMeals.isError) return <ErrorState />

  const { effectiveTarget, totals } = dashboard
  const remaining = caloriesRemaining(effectiveTarget, totals)
  const consumedPct = effectiveTarget.calories > 0 ? totals.calories / effectiveTarget.calories : 0
  const pendingCheatMeal = (cheatMeals.data ?? []).find((m) => m.status === 'pending') ?? null

  const openQuickAdd = (mealType: MealType = 'snack') => {
    setAddMealType(mealType)
    setAddOpen(true)
  }

  const onCancelCheatMeal = async (id: string) => {
    try {
      await cancelCheatMeal.mutateAsync(id)
      toast('Cheat meal report cancelled', 'success')
    } catch (error) {
      toastError(error)
    }
  }

  return (
    <div className="relative pb-20">
      <PageHeader
        title="Nutrition"
        subtitle={format(new Date(), 'EEEE, MMMM d')}
        action={
          <div className="flex items-center gap-2">
            {dashboard.target?.source === 'template' || dashboard.target?.source === 'calculated' ? (
              <Badge variant="primary" data-testid="prescribed-badge">
                Prescribed by coach
              </Badge>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setTargetsOpen(true)}>
              <Settings2 className="h-4 w-4" /> Targets
            </Button>
          </div>
        }
      />

      {dietAssignment.data ? (
        <Card className="mb-6 border-[color-mix(in_srgb,var(--color-primary)_25%,var(--color-border))]" data-testid="assigned-diet-summary">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-[var(--color-fg)]">
              {dietAssignment.data.template.name}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Coach diet plan · started {dietAssignment.data.start_date}
              {dietAssignment.data.template.description
                ? ` · ${dietAssignment.data.template.description}`
                : ''}
            </p>
            {planAdherence.isPrescribed ? (
              <div className="mt-3 rounded-lg bg-[var(--color-surface-2)] p-3" data-testid="plan-adherence-summary">
                <p className="text-xs font-medium text-[var(--color-fg)]">Plan adherence today</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {planAdherence.adherence.confirmedItemCount} / {planAdherence.adherence.plannedItemCount} foods confirmed
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <MacroBar
                    label="Calories (plan)"
                    consumed={planAdherence.adherence.eaten.calories}
                    target={planAdherence.adherence.planned.calories || 1}
                    unit=" kcal"
                    color="var(--color-primary)"
                  />
                  <MacroBar
                    label="Protein"
                    consumed={planAdherence.adherence.eaten.proteinG}
                    target={planAdherence.adherence.planned.proteinG || 1}
                    color="#34d399"
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="sm:col-span-2 lg:col-span-1" data-testid="calories-remaining-card">
          <CardContent className="flex items-center gap-6 p-6">
            <ProgressRing
              value={totals.calories}
              max={effectiveTarget.calories}
              size={140}
              stroke={12}
              color={remaining >= 0 ? 'var(--color-primary)' : 'var(--color-accent)'}
              label={String(Math.round(Math.abs(remaining)))}
              sublabel={remaining >= 0 ? 'remaining' : 'over'}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-muted)]">Calories</p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-fg)]">
                {Math.round(totals.calories)}{' '}
                <span className="text-base font-normal text-[var(--color-muted)]">
                  / {effectiveTarget.calories}
                </span>
              </p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                Goal minus food logged today
                {consumedPct > 1 ? ' · over target' : ''}
              </p>
              <Link to="/nutrition/diary" className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline">
                Open diary <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Utensils className="h-4 w-4 text-[var(--color-primary)]" />
              Macros
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4" data-testid="macro-bars">
            <MacroBar
              label="Carbs"
              consumed={totals.carbsG}
              target={Number(effectiveTarget.carbs_g)}
              color="#60a5fa"
            />
            <MacroBar
              label="Fat"
              consumed={totals.fatG}
              target={Number(effectiveTarget.fat_g)}
              color="#fbbf24"
            />
            <MacroBar
              label="Protein"
              consumed={totals.proteinG}
              target={Number(effectiveTarget.protein_g)}
              color="#34d399"
            />
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-[var(--color-accent)]" />
              Weight (90 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeightMiniChart />
          </CardContent>
        </Card>

        <Card data-testid="cheat-meal-card">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Cookie className="mt-0.5 h-5 w-5 text-[var(--color-accent)]" />
              <div>
                <p className="font-medium text-[var(--color-fg)]">Report cheat meal</p>
                <p className="text-sm text-[var(--color-muted)]">
                  Log off-plan food for coach review and a suggested plan adjustment.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCheatMealOpen(true)}
              data-testid="cheat-meal-open-btn"
            >
              Report
            </Button>
          </CardContent>
        </Card>

        {pendingCheatMeal ? (
          <PendingCheatMealBanner
            meal={pendingCheatMeal}
            onCancel={onCancelCheatMeal}
            cancelling={cancelCheatMeal.isPending}
          />
        ) : null}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="border-[color-mix(in_srgb,var(--color-primary)_25%,var(--color-border))]">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
              <div>
                <p className="font-medium text-[var(--color-fg)]">Weekly check-in</p>
                <p className="text-sm text-[var(--color-muted)]">Submit your end-of-week report</p>
              </div>
            </div>
            <Link to="/weekly-report">
              <Button variant="outline" size="sm">Go</Button>
            </Link>
          </CardContent>
        </Card>

        <DueNowBanner compact />
      </div>

      <button
        type="button"
        onClick={() => openQuickAdd('snack')}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-lg transition-transform hover:scale-105 md:bottom-8"
        aria-label="Quick log food"
        data-testid="nutrition-fab"
      >
        <Plus className="h-6 w-6" />
      </button>

      <NutritionTargetsModal
        open={targetsOpen}
        onClose={() => setTargetsOpen(false)}
        current={dashboard.target}
      />

      <FoodSearchModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        date={today}
        mealType={addMealType}
      />

      <CheatMealModal open={cheatMealOpen} onClose={() => setCheatMealOpen(false)} />
    </div>
  )
}

function PendingCheatMealBanner({
  meal,
  onCancel,
  cancelling,
}: {
  meal: CheatMeal
  onCancel: (id: string) => void
  cancelling: boolean
}) {
  const adjustment = meal.adjustment as CheatMealAdjustment | null

  return (
    <Card
      className="border-[color-mix(in_srgb,var(--color-accent)_30%,var(--color-border))]"
      data-testid="pending-cheat-meal"
    >
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-[var(--color-fg)]">{meal.name}</p>
            <Badge variant="accent">Pending review</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {meal.estimated_calories != null ? `~${Math.round(Number(meal.estimated_calories))} kcal` : null}
            {adjustment?.cardio_minutes
              ? ` · suggested cardio ${adjustment.cardio_minutes} min`
              : null}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cancelling}
          onClick={() => onCancel(meal.id)}
          data-testid="cheat-meal-cancel-btn"
        >
          Cancel report
        </Button>
      </CardContent>
    </Card>
  )
}
