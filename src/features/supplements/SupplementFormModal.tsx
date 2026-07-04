import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { toast, toastError } from '@/components/ui/Toast'
import {
  DOSAGE_UNITS,
  inputValueToTime,
  normalizeScheduleTimes,
  timeToInputValue,
  WEEKDAY_LABELS,
} from '@/lib/supplements'
import type { Supplement } from '@/lib/types'
import type { SupplementInput } from '@/api/supplements'

const supplementFormSchema = z.object({
  name: z.string().min(1, 'Name required'),
  dosage_amount: z.string().optional(),
  dosage_unit: z.string().optional(),
  schedule_days: z.array(z.number()).min(1, 'Pick at least one day'),
  schedule_times: z.array(z.object({ value: z.string().min(1, 'Time required') })).min(1),
  notes: z.string().optional(),
})

export type SupplementFormValues = z.infer<typeof supplementFormSchema>

type SupplementFormModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (input: SupplementInput) => Promise<Supplement>
  pending: boolean
  initial?: Supplement | null
  title?: string
}

export function SupplementFormModal({
  open,
  onClose,
  onSubmit,
  pending,
  initial,
  title,
}: SupplementFormModalProps) {
  const form = useForm<SupplementFormValues>({
    resolver: zodResolver(supplementFormSchema),
    defaultValues: defaultFormValues(initial),
  })

  const times = useFieldArray({ control: form.control, name: 'schedule_times' })
  const selectedDays = form.watch('schedule_days')

  useEffect(() => {
    if (open) {
      form.reset(defaultFormValues(initial))
    }
  }, [open, initial, form])

  const toggleDay = (day: number) => {
    const current = form.getValues('schedule_days')
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()
    form.setValue('schedule_days', next, { shouldValidate: true })
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const amountRaw = values.dosage_amount?.trim()
    const amount = amountRaw ? Number(amountRaw) : null
    const unit = values.dosage_unit?.trim() || null
    const dosageText =
      amount != null && !Number.isNaN(amount) && unit ? `${amount}${unit}` : null

    try {
      await onSubmit({
        name: values.name,
        dosage: dosageText,
        dosage_amount: amount != null && !Number.isNaN(amount) ? amount : null,
        dosage_unit: unit,
        frequency: null,
        notes: values.notes?.trim() || null,
        is_active: true,
        schedule_days: values.schedule_days,
        schedule_times: values.schedule_times.map((row) => inputValueToTime(row.value)),
      })
      toast(initial ? 'Supplement updated' : 'Supplement added', 'success')
      form.reset(defaultFormValues())
      onClose()
    } catch (error) {
      toastError(error, initial ? 'Could not update supplement' : 'Could not add supplement')
    }
  })

  return (
    <Modal open={open} onClose={onClose} title={title ?? (initial ? 'Edit supplement' : 'Add supplement')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>Name</Label>
          <Input className="mt-1.5" data-testid="supplement-name-input" {...form.register('name')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Amount</Label>
            <Input
              className="mt-1.5"
              type="text"
              inputMode="decimal"
              placeholder="5"
              data-testid="supplement-dosage-amount"
              {...form.register('dosage_amount')}
            />
          </div>
          <div>
            <Label>Unit</Label>
            <select
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-fg)]"
              data-testid="supplement-dosage-unit"
              {...form.register('dosage_unit')}
            >
              <option value="">—</option>
              {DOSAGE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Days of week</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, day) => {
              const active = selectedDays.includes(day)
              return (
                <button
                  key={label}
                  type="button"
                  data-testid={`schedule-day-${day}`}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-fg)]'
                  }`}
                  onClick={() => toggleDay(day)}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {form.formState.errors.schedule_days ? (
            <p className="mt-1 text-xs text-[var(--color-danger)]">
              {form.formState.errors.schedule_days.message}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Times of day</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => times.append({ value: '08:00' })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add time
            </Button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {times.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  type="time"
                  className="flex-1"
                  data-testid={`schedule-time-${index}`}
                  {...form.register(`schedule_times.${index}.value`)}
                />
                {times.fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove time"
                    onClick={() => times.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Input className="mt-1.5" {...form.register('notes')} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" data-testid="supplement-save-btn" disabled={pending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function defaultFormValues(initial?: Supplement | null): SupplementFormValues {
  if (initial) {
    return {
      name: initial.name,
      dosage_amount: initial.dosage_amount != null ? String(initial.dosage_amount) : '',
      dosage_unit: initial.dosage_unit ?? '',
      schedule_days: initial.schedule_days,
      schedule_times: normalizeScheduleTimes(initial.schedule_times).map((t) => ({
        value: timeToInputValue(t),
      })),
      notes: initial.notes ?? '',
    }
  }
  return {
    name: '',
    dosage_amount: '',
    dosage_unit: 'g',
    schedule_days: [0, 1, 2, 3, 4, 5, 6],
    schedule_times: [{ value: '08:00' }],
    notes: '',
  }
}
