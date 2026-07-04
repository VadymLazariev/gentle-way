import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calculator } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { toast, toastError } from '@/components/ui/Toast'
import { useApplyCalculatedTargets } from '@/api/dietTemplates'
import { useGoals } from '@/api/goals'
import {
  ACTIVITY_LEVELS,
  NUTRITION_GOALS,
  ageFromDateOfBirth,
  computeNutritionTargets,
  goalFromWeightGoal,
  type ActivityLevel,
  type NutritionGoal,
} from '@/lib/nutritionCalc'
import type { Profile, Sex } from '@/lib/types'

const calcSchema = z.object({
  sex: z.enum(['male', 'female', 'other']),
  ageYears: z.string().min(1, 'Age required'),
  weightKg: z.string().min(1, 'Weight required'),
  heightCm: z.string().min(1, 'Height required'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goal: z.enum(['cut', 'maintain', 'bulk']),
})

type CalcForm = z.infer<typeof calcSchema>

type NutritionCalculatorModalProps = {
  open: boolean
  onClose: () => void
  clientId: string
  profile: Profile | null
  latestWeightKg: number | null
}

export function NutritionCalculatorModal({
  open,
  onClose,
  clientId,
  profile,
  latestWeightKg,
}: NutritionCalculatorModalProps) {
  const goals = useGoals('active')
  const apply = useApplyCalculatedTargets()

  const defaultGoal = useMemo((): NutritionGoal => {
    const weightGoal = (goals.data ?? []).find((g) => g.goal_type === 'weight')
    const weight = latestWeightKg ?? profile?.starting_weight_kg ?? 70
    if (!weightGoal) return 'maintain'
    return goalFromWeightGoal(
      weightGoal.direction,
      weight,
      weightGoal.target_value != null ? Number(weightGoal.target_value) : null,
    )
  }, [goals.data, latestWeightKg, profile?.starting_weight_kg])

  const defaultAge = ageFromDateOfBirth(profile?.date_of_birth ?? null)

  const form = useForm<CalcForm>({
    resolver: zodResolver(calcSchema),
    values: {
      sex: (profile?.sex as Sex) ?? 'male',
      ageYears: defaultAge != null ? String(defaultAge) : '30',
      weightKg: String(latestWeightKg ?? profile?.starting_weight_kg ?? 70),
      heightCm: String(profile?.height_cm ?? 170),
      activityLevel: (profile?.activity_level as ActivityLevel) ?? 'moderate',
      goal: defaultGoal,
    },
  })

  const watched = form.watch()
  const preview = useMemo(() => {
    const age = Number(watched.ageYears)
    const weight = Number(watched.weightKg)
    const height = Number(watched.heightCm)
    if (!age || !weight || !height) return null
    return computeNutritionTargets({
      sex: watched.sex,
      ageYears: age,
      weightKg: weight,
      heightCm: height,
      activityLevel: watched.activityLevel,
      goal: watched.goal,
    })
  }, [watched])

  const onApply = form.handleSubmit(async (values) => {
    const result = computeNutritionTargets({
      sex: values.sex,
      ageYears: Number(values.ageYears),
      weightKg: Number(values.weightKg),
      heightCm: Number(values.heightCm),
      activityLevel: values.activityLevel,
      goal: values.goal,
    })
    try {
      await apply.mutateAsync({ clientId, result })
      toast('Nutrition targets applied', 'success')
      onClose()
    } catch (error) {
      toastError(error)
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Calculate nutrition targets"
      description="Mifflin-St Jeor BMR × activity, goal-adjusted calories, macro split"
    >
      <form onSubmit={onApply} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Sex</Label>
            <Select className="mt-1" {...form.register('sex')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label>Age</Label>
            <Input className="mt-1" type="number" {...form.register('ageYears')} data-testid="calc-age" />
          </div>
          <div>
            <Label>Weight (kg)</Label>
            <Input className="mt-1" type="number" step="0.1" {...form.register('weightKg')} data-testid="calc-weight" />
          </div>
          <div>
            <Label>Height (cm)</Label>
            <Input className="mt-1" type="number" {...form.register('heightCm')} data-testid="calc-height" />
          </div>
        </div>
        <div>
          <Label>Activity level</Label>
          <Select className="mt-1" {...form.register('activityLevel')} data-testid="calc-activity">
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label} (×{a.multiplier})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Goal</Label>
          <Select className="mt-1" {...form.register('goal')} data-testid="calc-goal">
            {NUTRITION_GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </div>

        {preview ? (
          <div
            className="rounded-xl bg-[var(--color-surface-2)] p-3 text-sm"
            data-testid="calc-preview"
          >
            <p className="font-medium text-[var(--color-fg)]">Preview</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[var(--color-muted)]">
              <span>BMR</span>
              <span className="text-right text-[var(--color-fg)]">{preview.bmr} kcal</span>
              <span>TDEE</span>
              <span className="text-right text-[var(--color-fg)]">{preview.tdee} kcal</span>
              <span>Daily calories</span>
              <span
                className="text-right font-semibold text-[var(--color-fg)]"
                data-testid="calc-preview-calories"
              >
                {preview.calories} kcal
              </span>
              <span>Protein</span>
              <span className="text-right text-[var(--color-fg)]">{preview.protein_g} g</span>
              <span>Carbs</span>
              <span className="text-right text-[var(--color-fg)]">{preview.carbs_g} g</span>
              <span>Fat</span>
              <span className="text-right text-[var(--color-fg)]">{preview.fat_g} g</span>
              <span>Water</span>
              <span className="text-right text-[var(--color-fg)]">{preview.water_ml} ml</span>
            </div>
          </div>
        ) : null}

        <Button type="submit" disabled={apply.isPending || !preview} data-testid="calc-apply-btn">
          <Calculator className="h-4 w-4" /> Apply to client
        </Button>
      </form>
    </Modal>
  )
}
