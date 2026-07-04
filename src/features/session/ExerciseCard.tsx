import { useEffect, useState } from 'react'
import { ArrowRight, Check, Info, Plus, ShieldAlert, Timer } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RpeTextBadge } from '@/components/RpeBadge'
import { cn } from '@/lib/utils'
import { formatDuration, parseRestSeconds } from '@/lib/prescription'
import { sanitizeNumericInput, parseNumericInput } from '@/lib/numeric'
import { toastError } from '@/components/ui/Toast'
import { SetTypeMenu } from '@/features/session/SetTypeMenu'
import { ExerciseInfoModal } from '@/features/session/ExerciseInfoModal'
import { RpePicker, formatRpe } from '@/features/session/RpePicker'
import { useAddSet, useDeleteSet, useUpdateSet } from '@/api/sessions'
import type { PreviousSet } from '@/api/sessions'
import type { AdjustmentAction, Prescription, SessionSet, SetType } from '@/lib/types'

const ROW_GRID = 'grid grid-cols-[2rem_minmax(0,1fr)_3.25rem_2.5rem_2.75rem_2.25rem] items-center gap-1.5'

export type CardAdjustment = {
  action: AdjustmentAction
  rpeCap: number | null
  substitute: string | null
  reason: string | null
}

type SetWithLabel = { set: SessionSet; label: string }

function withLabels(sets: SessionSet[]): SetWithLabel[] {
  let normal = 0
  return sets.map((set) => {
    if (set.set_type === 'normal') {
      normal += 1
      return { set, label: String(normal) }
    }
    return { set, label: '' }
  })
}

function previousText(previous: PreviousSet | undefined): string {
  if (!previous || previous.weightKg == null) return '—'
  const reps = previous.reps != null ? ` × ${previous.reps}` : ''
  return `${previous.weightKg} kg${reps}`
}

export function ExerciseCard({
  sessionId,
  prescription,
  exerciseName,
  adjustment,
  sets,
  previous,
  onStartRest,
  disabled,
}: {
  sessionId: string
  prescription: Prescription
  exerciseName?: string
  adjustment?: CardAdjustment | null
  sets: SessionSet[]
  previous: Map<number, PreviousSet> | undefined
  onStartRest: (seconds: number) => void
  disabled: boolean
}) {
  const addSet = useAddSet()
  const [infoOpen, setInfoOpen] = useState(false)
  const restSeconds = parseRestSeconds(prescription.rest)
  const labelled = withLabels(sets)
  const displayName = exerciseName ?? prescription.exercise
  const isSwap = adjustment?.action === 'swap'
  const isCap = adjustment?.action === 'cap_rpe'

  const onAdd = () => {
    const nextIndex = sets.length > 0 ? Math.max(...sets.map((s) => s.set_index)) + 1 : 1
    const template = sets[sets.length - 1]
    addSet.mutate({
      sessionId,
      exercise: displayName,
      prescriptionId: prescription.id,
      setIndex: nextIndex,
      reps: template?.reps ?? null,
    })
  }

  const restLabel = restSeconds != null ? formatDuration(restSeconds) : prescription.rest

  return (
    <Card className={adjustment ? 'border-[var(--color-accent)]' : undefined}>
      <CardContent className="p-4">
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex items-center gap-1 font-semibold text-[var(--color-primary)] hover:underline"
            >
              {displayName}
              <Info className="h-3.5 w-3.5 opacity-70" />
            </button>
            {isSwap ? <Badge variant="accent">Adjusted</Badge> : null}
            {isCap ? (
              <Badge variant="accent">
                <ShieldAlert className="h-3 w-3" /> RPE ≤ {adjustment?.rpeCap ?? '—'}
              </Badge>
            ) : null}
          </div>
          {isSwap ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-muted)]">
              <ArrowRight className="h-3 w-3" /> from {prescription.exercise}
            </p>
          ) : null}
          {adjustment?.reason ? (
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{adjustment.reason}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {prescription.prescription ? (
              <span className="text-xs text-[var(--color-muted)]">{prescription.prescription}</span>
            ) : null}
            <RpeTextBadge
              value={
                isCap && adjustment?.rpeCap != null ? String(adjustment.rpeCap) : prescription.target_rpe
              }
            />
            {prescription.rest ? (
              <Badge variant="outline">
                <Timer className="h-3 w-3" /> {prescription.rest}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className={cn(ROW_GRID, 'px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]')}>
          <span>Set</span>
          <span>Previous</span>
          <span className="text-center">kg</span>
          <span className="text-center">Reps</span>
          <span className="text-center">RPE</span>
          <span className="text-center">
            <Check className="mx-auto h-3.5 w-3.5" />
          </span>
        </div>

        <div className="flex flex-col">
          {labelled.map(({ set, label }, i) => (
            <div key={set.id}>
              <SetRow
                set={set}
                label={label}
                previous={previous?.get(set.set_index)}
                disabled={disabled}
                canRemove={sets.length > 1}
                rpeCap={isCap ? (adjustment?.rpeCap ?? null) : null}
                onCompleted={() => {
                  if (restSeconds != null) onStartRest(restSeconds)
                }}
              />
              {i < labelled.length - 1 && restLabel ? <RestLine label={restLabel} /> : null}
            </div>
          ))}
        </div>

        {!disabled ? (
          <button
            type="button"
            onClick={onAdd}
            disabled={addSet.isPending}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] py-2.5 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-border)] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Set{restLabel ? ` (${restLabel})` : ''}
          </button>
        ) : null}
      </CardContent>

      <ExerciseInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        exerciseName={displayName}
      />
    </Card>
  )
}

function RestLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="h-px flex-1 bg-[var(--color-border)]" />
      <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
      <div className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  )
}

function SetRow({
  set,
  label,
  previous,
  disabled,
  canRemove,
  rpeCap,
  onCompleted,
}: {
  set: SessionSet
  label: string
  previous: PreviousSet | undefined
  disabled: boolean
  canRemove: boolean
  rpeCap: number | null
  onCompleted: () => void
}) {
  const update = useUpdateSet()
  const remove = useDeleteSet()
  const [weight, setWeight] = useState(set.weight_kg != null ? String(set.weight_kg) : '')
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : '')

  useEffect(() => {
    setWeight(set.weight_kg != null ? String(set.weight_kg) : '')
  }, [set.weight_kg])
  useEffect(() => {
    setReps(set.reps != null ? String(set.reps) : '')
  }, [set.reps])

  const commitWeight = () => {
    const value = parseNumericInput(weight)
    if (value !== set.weight_kg) {
      update.mutate({ id: set.id, weight_kg: value }, { onError: (e) => toastError(e, 'Could not save weight') })
    }
    setWeight(value != null ? String(value) : '')
  }
  const commitReps = () => {
    const value = parseNumericInput(reps)
    if (value !== set.reps) {
      update.mutate({ id: set.id, reps: value }, { onError: (e) => toastError(e, 'Could not save reps') })
    }
    setReps(value != null ? String(value) : '')
  }

  const toggleDone = () => {
    const nextCompleted = !set.completed
    update.mutate(
      {
        id: set.id,
        completed: nextCompleted,
        weight_kg: parseNumericInput(weight),
        reps: parseNumericInput(reps),
      },
      { onError: (e) => toastError(e, 'Could not update set') },
    )
    if (nextCompleted) onCompleted()
  }

  const changeType = (type: SetType) =>
    update.mutate({ id: set.id, set_type: type }, { onError: (e) => toastError(e, 'Could not change set type') })

  const changeRpe = (rpe: number | null) =>
    update.mutate({ id: set.id, rpe }, { onError: (e) => toastError(e, 'Could not save RPE') })

  const toggleBodyweight = () =>
    update.mutate(
      { id: set.id, is_bodyweight: !set.is_bodyweight },
      { onError: (e) => toastError(e, 'Could not update set') },
    )

  const isBw = set.is_bodyweight

  return (
    <div
      className={cn(
        ROW_GRID,
        'rounded-lg px-1 py-1.5 transition-colors',
        set.completed ? 'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)]' : '',
      )}
    >
      <SetTypeMenu
        value={set.set_type as SetType}
        displayLabel={label || '•'}
        isBodyweight={isBw}
        onSelect={changeType}
        onToggleBodyweight={disabled ? undefined : toggleBodyweight}
        onRemove={canRemove && !disabled ? () => remove.mutate(set.id) : undefined}
      />

      <span className="truncate text-sm text-[var(--color-muted)]">{previousText(previous)}</span>

      {isBw ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[var(--color-accent)]">
            BW
          </span>
          <input
            inputMode="decimal"
            disabled={disabled}
            value={weight}
            placeholder="+kg"
            aria-label="Added load in kilograms"
            onChange={(e) => setWeight(sanitizeNumericInput(e.target.value, true))}
            onBlur={commitWeight}
            className="h-9 w-full rounded-lg bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] pl-4 text-center text-sm font-medium text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60"
          />
        </div>
      ) : (
        <input
          inputMode="decimal"
          disabled={disabled}
          value={weight}
          placeholder={previous?.weightKg != null ? String(previous.weightKg) : '—'}
          onChange={(e) => setWeight(sanitizeNumericInput(e.target.value, true))}
          onBlur={commitWeight}
          className="h-9 w-full rounded-lg bg-[var(--color-surface-2)] text-center text-sm font-medium text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60"
        />
      )}
      <input
        inputMode="numeric"
        disabled={disabled}
        value={reps}
        placeholder={previous?.reps != null ? String(previous.reps) : '—'}
        onChange={(e) => setReps(sanitizeNumericInput(e.target.value, false))}
        onBlur={commitReps}
        className="h-9 w-full rounded-lg bg-[var(--color-surface-2)] text-center text-sm font-medium text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60"
      />
      <RpeCell value={set.rpe} cap={rpeCap} disabled={disabled} onChange={changeRpe} />
      <button
        type="button"
        onClick={toggleDone}
        disabled={disabled}
        aria-label={set.completed ? 'Mark set not done' : 'Mark set done'}
        aria-pressed={set.completed}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-60',
          set.completed
            ? 'bg-[var(--color-success)] text-white'
            : 'bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-fg)]',
        )}
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  )
}

function RpeCell({
  value,
  cap,
  disabled,
  onChange,
}: {
  value: number | null
  cap: number | null
  disabled: boolean
  onChange: (rpe: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const overCap = value != null && cap != null && value > cap

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label="Set RPE"
        aria-haspopup="dialog"
        title={cap != null ? `Recommended cap RPE ${formatRpe(cap)}` : undefined}
        className={cn(
          'h-9 w-full rounded-lg text-center text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60',
          overCap
            ? 'bg-[color-mix(in_srgb,var(--color-danger)_16%,transparent)] text-[var(--color-danger)]'
            : value != null
              ? 'bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[var(--color-primary)]'
              : 'bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-fg)]',
        )}
      >
        {value != null ? formatRpe(value) : 'RPE'}
      </button>
      <RpePicker
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        cap={cap}
        onChange={onChange}
      />
    </>
  )
}
