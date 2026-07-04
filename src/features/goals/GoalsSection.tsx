import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Plus, Target, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast, toastError } from '@/components/ui/Toast'
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoal, type GoalInput } from '@/api/goals'
import { useBodyMeasurements } from '@/api/measurements'
import { useSessionHistory } from '@/api/sessions'
import { useJudoSessions } from '@/api/judo'
import { MEASUREMENT_FIELDS } from '@/lib/measurements'
import {
  computeGoalProgress,
  goalTypeLabel,
  isGoalAchieved,
} from '@/lib/goals'
import type { GoalType } from '@/lib/types'

const goalSchema = z.object({
  goal_type: z.enum(['weight', 'lift', 'measurement', 'attendance']),
  title: z.string().min(1, 'Title required'),
  target_value: z.string().optional(),
  target_count: z.string().optional(),
  target_unit: z.string().optional(),
  exercise_name: z.string().optional(),
  measurement_field: z.string().optional(),
  direction: z.enum(['increase', 'decrease', 'reach']).optional(),
  period: z.enum(['week', 'month', 'total']).optional(),
  deadline: z.string().optional(),
  notes: z.string().optional(),
})

type GoalFormValues = z.infer<typeof goalSchema>

export function GoalsSection({ coachMode = false }: { coachMode?: boolean }) {
  const goals = useGoals()
  const measurements = useBodyMeasurements(60)
  const history = useSessionHistory(200)
  const judo = useJudoSessions(200)
  const [modalOpen, setModalOpen] = useState(false)

  const judoDates = useMemo(
    () => (judo.data ?? []).map((j) => j.session_date),
    [judo.data],
  )

  const progressRows = useMemo(() => {
    const ctx = {
      measurements: measurements.data ?? [],
      workouts: history.data ?? [],
      judoDates,
    }
    return (goals.data ?? []).map((g) => computeGoalProgress(g, ctx))
  }, [goals.data, measurements.data, history.data, judoDates])

  if (goals.isLoading) return null

  return (
    <Card data-testid="goals-section">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--color-warning)]" />
            Goals
          </CardTitle>
          {coachMode ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add goal
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {progressRows.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            {coachMode ? 'Set targets for this client.' : 'No goals assigned yet.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {progressRows.map((row) => (
              <GoalRow key={row.goal.id} row={row} coachMode={coachMode} ctx={{
                measurements: measurements.data ?? [],
                workouts: history.data ?? [],
                judoDates,
              }} />
            ))}
          </div>
        )}
      </CardContent>
      {coachMode ? (
        <GoalFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
      ) : null}
    </Card>
  )
}

function GoalRow({
  row,
  coachMode,
  ctx,
}: {
  row: ReturnType<typeof computeGoalProgress>
  coachMode: boolean
  ctx: Parameters<typeof computeGoalProgress>[1]
}) {
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const { goal, progressPct, label } = row
  const target = goal.target_value ?? goal.target_count
  const achieved = goal.status === 'achieved' || isGoalAchieved(goal, ctx)

  const onMarkAchieved = async () => {
    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        patch: { status: 'achieved', achieved_at: new Date().toISOString() },
      })
      toast('Goal marked achieved', 'success')
    } catch (error) {
      toastError(error, 'Could not update goal')
    }
  }

  const onDelete = async () => {
    try {
      await deleteGoal.mutateAsync(goal.id)
      toast('Goal removed', 'success')
    } catch (error) {
      toastError(error, 'Could not delete goal')
    }
  }

  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-[var(--color-fg)]">{goal.title}</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {goalTypeLabel(goal.goal_type)}
            {target != null ? ` · target ${target}${goal.target_unit ? ` ${goal.target_unit}` : ''}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={achieved ? 'primary' : goal.status === 'active' ? 'accent' : 'outline'}>
            {achieved ? 'Achieved' : goal.status}
          </Badge>
          {coachMode ? (
            <>
              {goal.status === 'active' && achieved ? (
                <Button type="button" size="sm" variant="outline" onClick={onMarkAchieved}>
                  Confirm
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-[var(--color-muted)]">
          <span>Current: {label}</span>
          <span>{progressPct != null ? `${progressPct}%` : '—'}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-surface)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${progressPct ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function GoalFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createGoal = useCreateGoal()
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goal_type: 'weight',
      title: '',
      direction: 'decrease',
      period: 'week',
    },
  })

  const goalType = form.watch('goal_type')

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createGoal.mutateAsync(formValuesToInsert(values))
      toast('Goal created', 'success')
      form.reset()
      onClose()
    } catch (error) {
      toastError(error, 'Could not create goal')
    }
  })

  return (
    <Modal open={open} onClose={onClose} title="Add goal">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label>Type</Label>
          <Select className="mt-1.5" {...form.register('goal_type')}>
            <option value="weight">Body weight</option>
            <option value="lift">Lift (e1RM)</option>
            <option value="measurement">Measurement</option>
            <option value="attendance">Attendance</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="goal-title">Title</Label>
          <Input id="goal-title" className="mt-1.5" data-testid="goal-title-input" {...form.register('title')} />
        </div>
        <TypeFields goalType={goalType} form={form} />
        <div>
          <Label>Deadline (optional)</Label>
          <Input type="date" className="mt-1.5" {...form.register('deadline')} />
        </div>
        <div>
          <Label>Notes</Label>
          <Input className="mt-1.5" {...form.register('notes')} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" data-testid="goal-save-btn" disabled={createGoal.isPending}>
            Save goal
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function TypeFields({
  goalType,
  form,
}: {
  goalType: GoalType
  form: ReturnType<typeof useForm<GoalFormValues>>
}) {
  switch (goalType) {
    case 'weight':
      return (
        <>
          <div>
            <Label htmlFor="goal-target-weight">Target weight (kg)</Label>
            <Input
              id="goal-target-weight"
              type="number"
              step="0.1"
              className="mt-1.5"
              data-testid="goal-target-weight-input"
              {...form.register('target_value')}
            />
          </div>
          <div>
            <Label>Direction</Label>
            <Select className="mt-1.5" {...form.register('direction')}>
              <option value="decrease">Decrease to</option>
              <option value="increase">Increase to</option>
              <option value="reach">Reach</option>
            </Select>
          </div>
        </>
      )
    case 'lift':
      return (
        <>
          <div>
            <Label>Exercise</Label>
            <Input className="mt-1.5" placeholder="Back Squat" {...form.register('exercise_name')} />
          </div>
          <div>
            <Label>Target e1RM (kg)</Label>
            <Input type="number" step="0.5" className="mt-1.5" {...form.register('target_value')} />
          </div>
        </>
      )
    case 'measurement':
      return (
        <>
          <div>
            <Label>Measurement</Label>
            <Select className="mt-1.5" {...form.register('measurement_field')}>
              {MEASUREMENT_FIELDS.filter((f) => f.key !== 'height_cm').map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Target</Label>
            <Input type="number" step="0.1" className="mt-1.5" {...form.register('target_value')} />
          </div>
          <div>
            <Label>Direction</Label>
            <Select className="mt-1.5" {...form.register('direction')}>
              <option value="decrease">Decrease to</option>
              <option value="increase">Increase to</option>
              <option value="reach">Reach</option>
            </Select>
          </div>
        </>
      )
    case 'attendance':
      return (
        <>
          <div>
            <Label>Sessions target</Label>
            <Input type="number" className="mt-1.5" {...form.register('target_count')} />
          </div>
          <div>
            <Label>Period</Label>
            <Select className="mt-1.5" {...form.register('period')}>
              <option value="week">Per week</option>
              <option value="month">Per month</option>
              <option value="total">All time</option>
            </Select>
          </div>
        </>
      )
    default: {
      const _exhaustive: never = goalType
      return _exhaustive
    }
  }
}

function formValuesToInsert(values: GoalFormValues): GoalInput {
  const targetValue = values.target_value?.trim()
    ? Number(values.target_value)
    : null
  const targetCount = values.target_count?.trim()
    ? Number.parseInt(values.target_count, 10)
    : null

  return {
    goal_type: values.goal_type,
    title: values.title,
    target_value: targetValue,
    target_count: targetCount,
    target_unit: values.goal_type === 'weight' ? 'kg' : values.goal_type === 'lift' ? 'kg' : 'cm',
    exercise_name: values.exercise_name || null,
    measurement_field: values.measurement_field || null,
    direction: values.direction ?? null,
    period: values.period ?? null,
    deadline: values.deadline || null,
    notes: values.notes || null,
  }
}
