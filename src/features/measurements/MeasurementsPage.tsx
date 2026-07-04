import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { Plus, Ruler, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { toast, toastError } from '@/components/ui/Toast'
import { useBodyMeasurements, useDeleteMeasurement, useLatestMeasurement } from '@/api/measurements'
import { useCurrentWeeklyReport } from '@/api/reports'
import { MeasurementEntryModal } from '@/features/measurements/MeasurementEntryModal'
import { MeasurementTrendChart } from '@/features/measurements/MeasurementTrendChart'
import { fieldDefForKey, MEASUREMENT_FIELDS, type MeasurementFieldKey } from '@/lib/measurements'
import type { BodyMeasurement } from '@/lib/types'

export function MeasurementsPage() {
  const measurements = useBodyMeasurements()
  const latest = useLatestMeasurement()
  const currentReport = useCurrentWeeklyReport()
  const remove = useDeleteMeasurement()
  const [entryOpen, setEntryOpen] = useState(false)

  if (measurements.isLoading) return <LoadingState />
  if (measurements.isError) return <ErrorState />

  const rows = measurements.data ?? []
  const reportSubmitted = currentReport.data?.status === 'submitted' || currentReport.data?.status === 'reviewed'

  const onDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id)
      toast('Entry removed', 'success')
    } catch (error) {
      toastError(error)
    }
  }

  return (
    <div>
      <PageHeader
        title="Body measurements"
        subtitle="Track weight and circumference over time"
        action={
          <Button onClick={() => setEntryOpen(true)} data-testid="measurement-log-btn">
            <Plus className="h-4 w-4" /> Log
          </Button>
        }
      />

      {!reportSubmitted ? (
        <Card className="mb-6 border-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-border))]">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-[var(--color-fg)]">Weekly report due</p>
              <p className="text-sm text-[var(--color-muted)]">
                Submit your end-of-week check-in for your coach.
              </p>
            </div>
            <Link to="/weekly-report">
              <Button variant="outline">Submit report</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-[var(--color-primary)]" />
              Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MeasurementTrendChart />
          </CardContent>
        </Card>

        <LatestSnapshot measurement={latest.data} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No measurements yet"
          description="Use the guided entry flow to log your first check-in."
          icon={<Ruler className="h-7 w-7" />}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-[var(--color-border)]">
            {rows.map((row) => (
              <HistoryRow key={row.id} row={row} onDelete={() => onDelete(row.id)} />
            ))}
          </CardContent>
        </Card>
      )}

      <MeasurementEntryModal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        initial={latest.data}
      />
    </div>
  )
}

function LatestSnapshot({ measurement }: { measurement: BodyMeasurement | null | undefined }) {
  if (!measurement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latest</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted)]">Nothing logged yet.</p>
        </CardContent>
      </Card>
    )
  }

  const highlights: MeasurementFieldKey[] = ['weight_kg', 'waist_cm', 'chest_cm']
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest · {format(parseISO(measurement.measured_at), 'MMM d, yyyy')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {highlights.map((key) => {
            const val = measurement[key] as number | null
            if (val == null) return null
            const def = fieldDefForKey(key)
            return (
              <li key={key} className="flex justify-between text-sm">
                <span className="text-[var(--color-muted)]">{def.label}</span>
                <span className="font-medium tabular-nums">
                  {val.toFixed(def.decimals)} {def.unit}
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

function HistoryRow({ row, onDelete }: { row: BodyMeasurement; onDelete: () => void }) {
  const entries = MEASUREMENT_FIELDS.map((f) => ({
    label: f.label,
    value: row[f.key] as number | null,
    unit: f.unit,
    decimals: f.decimals,
  })).filter((e) => e.value != null)

  return (
    <div className="flex gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--color-fg)]">
          {format(parseISO(row.measured_at), 'EEEE, MMM d, yyyy')}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {entries.map((e) => `${e.label} ${e.value?.toFixed(e.decimals)}${e.unit}`).join(' · ')}
        </p>
        {row.notes ? <p className="mt-1 text-xs text-[var(--color-muted)]">{row.notes}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete entry"
        className="shrink-0 self-start rounded-lg p-2 text-[var(--color-muted)] hover:text-[var(--color-danger)]"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
