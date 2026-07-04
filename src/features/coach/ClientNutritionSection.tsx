import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calculator, UtensilsCrossed } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { toast, toastError } from '@/components/ui/Toast'
import {
  effectiveTemplateMacros,
  useActiveDietAssignment,
  useAssignDietTemplate,
  useDietTemplateDetail,
  useDietTemplates,
  usePlanAdherence,
} from '@/api/dietTemplates'
import { useClientProfile } from '@/api/coach'
import { useLatestMeasurement } from '@/api/measurements'
import { NutritionCalculatorModal } from '@/features/coach/NutritionCalculatorModal'
import { MacroBar } from '@/features/nutrition/MacroProgress'
import { localDateString } from '@/lib/dates'
import { mealTypeLabel } from '@/lib/nutrition'
import type { MealType } from '@/lib/types'

const assignSchema = z.object({
  templateId: z.string().min(1, 'Pick a template'),
  startDate: z.string().min(1),
})

type AssignForm = z.infer<typeof assignSchema>

export function ClientNutritionSection({ clientId }: { clientId: string }) {
  const profile = useClientProfile(clientId)
  const latest = useLatestMeasurement()
  const assignment = useActiveDietAssignment()
  const templates = useDietTemplates()
  const assign = useAssignDietTemplate()
  const templateDetail = useDietTemplateDetail(assignment.data?.template_id)
  const planAdherence = usePlanAdherence(localDateString())
  const [calcOpen, setCalcOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  const form = useForm<AssignForm>({
    resolver: zodResolver(assignSchema),
    values: {
      templateId: '',
      startDate: localDateString(),
    },
  })

  const ownTemplates = (templates.data ?? []).filter((t) => t.coach_id != null)
  const active = assignment.data
  const macros = active ? effectiveTemplateMacros(active.template, active) : null
  const isPrescribed = active?.mode === 'prescribed' && (templateDetail.data?.meals.length ?? 0) > 0

  const onAssign = form.handleSubmit(async (values) => {
    try {
      await assign.mutateAsync({
        clientId,
        templateId: values.templateId,
        startDate: values.startDate,
      })
      toast('Diet template assigned', 'success')
      setAssignOpen(false)
      form.reset()
    } catch (error) {
      toastError(error)
    }
  })

  return (
    <>
      <Card data-testid="client-nutrition-section">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-[var(--color-primary)]" />
              Nutrition
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCalcOpen(true)}
                data-testid="nutrition-calc-btn"
              >
                <Calculator className="h-3.5 w-3.5" />
                Calculate targets
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAssignOpen(true)}
                data-testid="assign-diet-btn"
              >
                Assign template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {active && macros ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--color-fg)]">{active.template.name}</p>
                  <Badge variant="primary">Active diet</Badge>
                  {isPrescribed ? <Badge variant="outline">Prescribed plan</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Since {active.start_date} · {macros.target_calories} kcal · P {macros.protein_g}g · C{' '}
                  {macros.carbs_g}g · F {macros.fat_g}g
                  {macros.water_ml != null ? ` · ${macros.water_ml} ml water` : ''}
                </p>
                {active.template.description ? (
                  <p className="mt-2 text-xs text-[var(--color-fg)]">{active.template.description}</p>
                ) : null}
              </div>

              {isPrescribed && templateDetail.data ? (
                <div className="rounded-xl border border-[var(--color-border)] p-3" data-testid="client-plan-meals">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Plan meals
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {templateDetail.data.meals.map((meal) => (
                      <li key={meal.id} className="text-sm text-[var(--color-fg)]">
                        <span className="font-medium">{meal.name}</span>
                        <span className="text-[var(--color-muted)]">
                          {' '}
                          · {mealTypeLabel(meal.meal_type as MealType)} · {meal.items.length} food
                          {meal.items.length === 1 ? '' : 's'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {planAdherence.isPrescribed ? (
                <div className="rounded-xl border border-[var(--color-border)] p-3" data-testid="client-plan-adherence">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Today&apos;s adherence
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-fg)]">
                    {planAdherence.adherence.confirmedItemCount} / {planAdherence.adherence.plannedItemCount} planned
                    foods confirmed
                  </p>
                  <div className="mt-2">
                    <MacroBar
                      label="Calories from plan"
                      consumed={planAdherence.adherence.eaten.calories}
                      target={planAdherence.adherence.planned.calories || 1}
                      unit=" kcal"
                      color="var(--color-primary)"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              No diet template assigned. Calculate targets or assign a template from your library.
            </p>
          )}
        </CardContent>
      </Card>

      <NutritionCalculatorModal
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        clientId={clientId}
        profile={profile.data ?? null}
        latestWeightKg={latest.data?.weight_kg ?? profile.data?.starting_weight_kg ?? null}
      />

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign diet template"
        description="Copy template macros to this client's nutrition targets"
      >
        <form onSubmit={onAssign} className="flex flex-col gap-3">
          <div>
            <Label>Template</Label>
            <Select className="mt-1" {...form.register('templateId')} data-testid="diet-template-select">
              <option value="">Select…</option>
              {ownTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.target_calories} kcal)
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Start date</Label>
            <Input className="mt-1" type="date" {...form.register('startDate')} />
          </div>
          {ownTemplates.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">
              Create templates under Coach → Nutrition first.
            </p>
          ) : null}
          <Button type="submit" disabled={assign.isPending || ownTemplates.length === 0}>
            Assign to client
          </Button>
        </form>
      </Modal>
    </>
  )
}
