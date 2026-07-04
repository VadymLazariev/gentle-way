import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarDays, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input, Textarea } from '@/components/ui/Input'
import {
  MeasurementValueInput,
  type MeasurementValueInputHandle,
} from '@/components/measurements/MeasurementValueInput'
import { toast, toastError } from '@/components/ui/Toast'
import { useCreateMeasurement } from '@/api/measurements'
import { useAttachMeasurementToReport, useCurrentTrainingWeek, useCurrentWeeklyReport } from '@/api/reports'
import { useAuth } from '@/lib/auth/AuthProvider'
import {
  buildMeasurementInsert,
  fieldDefForKey,
  MEASUREMENT_FIELDS,
  seedMeasurementValues,
  wizardFieldsForEntry,
  type MeasurementFieldKey,
} from '@/lib/measurements'
import { localDateString } from '@/lib/dates'
import type { BodyMeasurement } from '@/lib/types'

const notesSchema = z.object({
  notes: z.string().max(500).optional(),
})

type NotesForm = z.infer<typeof notesSchema>

type MeasurementEntryModalProps = {
  open: boolean
  onClose: () => void
  initial?: BodyMeasurement | null
}

export function MeasurementEntryModal({ open, onClose, initial }: MeasurementEntryModalProps) {
  const { profile } = useAuth()
  const create = useCreateMeasurement()
  const attachToReport = useAttachMeasurementToReport()
  const currentReport = useCurrentWeeklyReport()
  const week = useCurrentTrainingWeek()
  const inputRef = useRef<MeasurementValueInputHandle>(null)
  const [step, setStep] = useState(0)
  const [measuredAt, setMeasuredAt] = useState(localDateString())
  const [values, setValues] = useState<Partial<Record<MeasurementFieldKey, number>>>({})
  const [linkToReport, setLinkToReport] = useState(true)

  const fields = useMemo(
    () =>
      wizardFieldsForEntry({
        profileHeightCm: profile?.height_cm,
        initial,
      }),
    [initial, profile?.height_cm],
  )
  const currentField = fields[step]
  const currentDef = currentField ? fieldDefForKey(currentField.key) : null
  const currentValue = currentField
    ? (values[currentField.key] ?? (initial?.[currentField.key] as number | null) ?? currentDef!.min + (currentDef!.max - currentDef!.min) / 2)
    : 0

  const reportPending =
    currentReport.data != null &&
    currentReport.data.status !== 'submitted' &&
    currentReport.data.status !== 'reviewed'

  const { register, handleSubmit, reset } = useForm<NotesForm>({
    resolver: zodResolver(notesSchema),
    defaultValues: { notes: '' },
  })

  useEffect(() => {
    if (!open) return
    setStep(0)
    setMeasuredAt(localDateString())
    setLinkToReport(true)
    setValues(
      seedMeasurementValues({
        initial,
        profileHeightCm: profile?.height_cm,
      }),
    )
    reset({ notes: '' })
  }, [open, initial, profile?.height_cm, reset])

  const onConfirmField = () => {
    if (!currentField) return
    const committed = inputRef.current?.getValue() ?? currentValue
    setValues((prev) => ({ ...prev, [currentField.key]: committed }))
    if (step < fields.length - 1) {
      setStep(step + 1)
      return
    }
    setStep(fields.length)
  }

  const onSkipField = () => {
    if (!currentField) return
    setValues((prev) => {
      const next = { ...prev }
      delete next[currentField.key]
      return next
    })
    if (step < fields.length - 1) {
      setStep(step + 1)
      return
    }
    setStep(fields.length)
  }

  const onSave = handleSubmit(async (form) => {
    if (Object.keys(values).length === 0) {
      toastError(new Error('Log at least one measurement'))
      return
    }
    try {
      const payload = buildMeasurementInsert(
        measuredAt,
        values,
        form.notes?.trim() ? form.notes.trim() : null,
      )
      const saved = await create.mutateAsync(payload)

      if (linkToReport && reportPending) {
        await attachToReport.mutateAsync(saved)
        toast('Measurements saved and linked to this week\'s report', 'success')
      } else {
        toast('Measurements saved', 'success')
      }
      onClose()
    } catch (error) {
      toastError(error)
    }
  })

  const progress = useMemo(() => {
    if (step >= fields.length) return 100
    return Math.round(((step + 1) / fields.length) * 100)
  }, [fields.length, step])

  const reviewEntries = useMemo(
    () =>
      MEASUREMENT_FIELDS.filter((field) => values[field.key] != null).map((field) => ({
        field,
        value: values[field.key] as number,
      })),
    [values],
  )

  return (
    <Modal open={open} onClose={onClose} title="Log measurements">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <CalendarDays className="h-4 w-4 text-[var(--color-muted)]" />
            <Input
              type="date"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="border-0 bg-transparent p-0 focus-visible:ring-0"
              aria-label="Measurement date"
            />
          </div>
          <span className="text-sm font-medium tabular-nums text-[var(--color-muted)]">{progress}%</span>
        </div>

        <div className="h-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {step < fields.length && currentDef ? (
          <>
            <MeasurementValueInput
              ref={inputRef}
              key={currentField.key}
              label={currentDef.label}
              value={currentValue}
              onChange={(v) => {
                if (!currentField) return
                setValues((prev) => ({ ...prev, [currentField.key]: v }))
              }}
              min={currentDef.min}
              max={currentDef.max}
              step={currentDef.step}
              decimals={currentDef.decimals}
              unit={currentDef.unit}
            />
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep(Math.max(0, step - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-[var(--color-muted)]"
                onClick={onSkipField}
                data-testid="measurement-skip-btn"
              >
                Skip
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={onConfirmField}
                data-testid="measurement-next-btn"
              >
                {step === fields.length - 1 ? 'Review' : 'Next'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5">
              <p className="text-base font-semibold text-[var(--color-fg)]">
                {format(parseISO(measuredAt), 'EEEE, MMM d')}
              </p>
              <ul className="mt-4 flex flex-col gap-3" data-testid="measurement-review-list">
                {reviewEntries.map(({ field, value: val }) => (
                  <li key={field.key} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[var(--color-muted)]">{field.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--color-fg)]">
                      {val.toFixed(field.decimals)} {field.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Label htmlFor="measurement-notes" className="text-xs uppercase tracking-[0.15em] text-[var(--color-muted)]">
                Notes (optional)
              </Label>
              <Textarea id="measurement-notes" className="mt-2" {...register('notes')} />
            </div>
            {reportPending ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                <input
                  type="checkbox"
                  checked={linkToReport}
                  onChange={(e) => setLinkToReport(e.target.checked)}
                  className="mt-0.5 accent-[var(--color-primary)]"
                  data-testid="measurement-link-report"
                />
                <span className="text-sm text-[var(--color-fg)]">
                  Include in this week&apos;s report
                  <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                    Week {week.weekNumber} · {format(parseISO(week.weekStart), 'MMM d')} –{' '}
                    {format(parseISO(week.weekEnd), 'MMM d')}
                  </span>
                </span>
              </label>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={create.isPending || attachToReport.isPending}
              onClick={onSave}
              data-testid="measurement-confirm-btn"
            >
              <Check className="h-4 w-4" /> Confirm & save
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
