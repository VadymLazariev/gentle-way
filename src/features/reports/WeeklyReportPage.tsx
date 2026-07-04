import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Ruler } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Input'
import { LoadingState, ErrorState } from '@/components/ui/Feedback'
import { toast, toastError } from '@/components/ui/Toast'
import { useMeasurementForWeek } from '@/api/measurements'
import {
  useCurrentTrainingWeek,
  useCurrentWeeklyReport,
  useSubmitWeeklyReport,
} from '@/api/reports'
import { buildMeasurementSnapshot, snapshotReviewEntries, type MeasurementSnapshot } from '@/lib/measurements'
import { cn } from '@/lib/utils'
import type { WellbeingScale } from '@/lib/reports'

const scaleSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
])

const reportSchema = z.object({
  weightKg: z.number().min(30).max(250).nullable(),
  mood: scaleSchema.nullable(),
  recovery: scaleSchema.nullable(),
  overallFeeling: scaleSchema.nullable(),
  stress: scaleSchema.nullable(),
  clientNotes: z.string().max(2000),
})

type ReportForm = z.infer<typeof reportSchema>

const SCALE_LABELS: { key: keyof Pick<ReportForm, 'mood' | 'recovery' | 'overallFeeling' | 'stress'>; label: string; low: string; high: string; good: 'high' | 'low' }[] = [
  { key: 'mood', label: 'Mood', low: 'Low', high: 'Great', good: 'high' },
  { key: 'recovery', label: 'Recovery', low: 'Poor', high: 'Fully recovered', good: 'high' },
  { key: 'overallFeeling', label: 'Overall feeling', low: 'Rough', high: 'Excellent', good: 'high' },
  { key: 'stress', label: 'Stress', low: 'Calm', high: 'Overwhelmed', good: 'low' },
]

function parseStoredSnapshot(raw: unknown): MeasurementSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (typeof record.measured_at !== 'string') return null
  return record as MeasurementSnapshot
}

export function WeeklyReportPage() {
  const week = useCurrentTrainingWeek()
  const current = useCurrentWeeklyReport()
  const weekMeasurement = useMeasurementForWeek(week.weekStart, week.weekEnd)
  const submit = useSubmitWeeklyReport()

  const form = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      weightKg: null,
      mood: null,
      recovery: null,
      overallFeeling: null,
      stress: null,
      clientNotes: '',
    },
  })

  useEffect(() => {
    if (!current.data) {
      if (weekMeasurement.data?.weight_kg != null) {
        form.setValue('weightKg', weekMeasurement.data.weight_kg)
      }
      return
    }
    form.reset({
      weightKg: current.data.weight_kg ?? weekMeasurement.data?.weight_kg ?? null,
      mood: current.data.mood as WellbeingScale | null,
      recovery: current.data.recovery as WellbeingScale | null,
      overallFeeling: current.data.overall_feeling as WellbeingScale | null,
      stress: current.data.stress as WellbeingScale | null,
      clientNotes: current.data.client_notes ?? '',
    })
  }, [current.data, form, weekMeasurement.data])

  if (current.isLoading || weekMeasurement.isLoading) return <LoadingState />
  if (current.isError || weekMeasurement.isError) return <ErrorState />

  const alreadySubmitted = current.data?.status === 'submitted' || current.data?.status === 'reviewed'

  const linkedSnapshot =
    parseStoredSnapshot(current.data?.measurements_snapshot) ??
    (weekMeasurement.data ? buildMeasurementSnapshot(weekMeasurement.data) : null)

  const snapshotEntries = linkedSnapshot ? snapshotReviewEntries(linkedSnapshot) : []

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await submit.mutateAsync({
        weightKg: values.weightKg,
        mood: values.mood,
        recovery: values.recovery,
        overallFeeling: values.overallFeeling,
        stress: values.stress,
        clientNotes: values.clientNotes,
      })
      toast('Weekly report submitted', 'success')
    } catch (error) {
      toastError(error)
    }
  })

  return (
    <div>
      <Link
        to="/measurements"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft className="h-4 w-4" /> Measurements
      </Link>

      <PageHeader
        title="Weekly report"
        subtitle={`Week ${week.weekNumber} · ${format(parseISO(week.weekStart), 'MMM d')} – ${format(parseISO(week.weekEnd), 'MMM d')}`}
      />

      {alreadySubmitted ? (
        <Card className="mb-6">
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardCheck className="h-5 w-5 text-[var(--color-success)]" />
            <div>
              <p className="font-medium text-[var(--color-fg)]">Report submitted</p>
              <p className="text-sm text-[var(--color-muted)]">
                Your coach can review this week&apos;s summary on your dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {snapshotEntries.length > 0 ? (
        <Card className="mb-6" data-testid="weekly-report-measurements">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Ruler className="h-4 w-4 text-[var(--color-primary)]" />
              <p className="font-medium text-[var(--color-fg)]">Linked body measurements</p>
            </div>
            {linkedSnapshot ? (
              <p className="mb-3 text-xs text-[var(--color-muted)]">
                Logged {format(parseISO(linkedSnapshot.measured_at), 'EEEE, MMM d')}
              </p>
            ) : null}
            <ul className="flex flex-col gap-2">
              {snapshotEntries.map((entry) => (
                <li key={entry.label} className="flex justify-between text-sm">
                  <span className="text-[var(--color-muted)]">{entry.label}</span>
                  <span className="font-medium tabular-nums text-[var(--color-fg)]">
                    {entry.value.toFixed(entry.decimals)} {entry.unit}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : !alreadySubmitted ? (
        <Card className="mb-6 border-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-border))]">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-[var(--color-fg)]">No measurements this week</p>
              <p className="text-sm text-[var(--color-muted)]">
                Log body measurements to include them in your report.
              </p>
            </div>
            <Link to="/measurements">
              <Button variant="outline" size="sm">Log measurements</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <ScalePicker
              label="Weight (kg)"
              value={form.watch('weightKg') != null ? Math.round(form.watch('weightKg')!) : 70}
              onChange={(v) => form.setValue('weightKg', v)}
              min={40}
              max={150}
              unit="kg"
            />
            {SCALE_LABELS.map((scale) => (
              <WellbeingScalePicker
                key={scale.key}
                label={scale.label}
                low={scale.low}
                high={scale.high}
                value={form.watch(scale.key)}
                onChange={(v) => form.setValue(scale.key, v)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <Label htmlFor="report-notes">Notes for your coach</Label>
            <Textarea id="report-notes" className="mt-1.5" {...form.register('clientNotes')} />
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={submit.isPending || alreadySubmitted} data-testid="weekly-report-submit-btn">
          {alreadySubmitted ? 'Already submitted' : 'Submit weekly report'}
        </Button>
      </form>
    </div>
  )
}

function WellbeingScalePicker({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string
  low: string
  high: string
  value: WellbeingScale | null
  onChange: (v: WellbeingScale) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-1.5">
        {([1, 2, 3, 4, 5] as WellbeingScale[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={cn(
              'h-10 flex-1 rounded-lg text-sm font-semibold transition-colors',
              value === n
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                : 'bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-fg)]',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-[var(--color-muted)]">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}

function ScalePicker({
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  unit: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-lg font-bold tabular-nums text-[var(--color-fg)]">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />
    </div>
  )
}
