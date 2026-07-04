import { BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

export type SessionMetrics = {
  totalVolume: number
  totalReps: number
  weightPerRep: number | null
  volumeIncreasePct: number | null
}

function formatKg(value: number): string {
  return `${Math.round(value * 100) / 100} kg`
}

export function FocusMetricCard({ metrics }: { metrics: SessionMetrics }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-fg)]">
          <BarChart3 className="h-4 w-4 text-[var(--color-primary)]" />
          Session summary
        </div>
        <dl className="flex flex-col divide-y divide-[var(--color-border)]">
          <Row label="Total Volume" value={formatKg(metrics.totalVolume)} />
          {metrics.volumeIncreasePct != null ? (
            <Row
              label="Volume Increase"
              value={`${metrics.volumeIncreasePct > 0 ? '+' : ''}${metrics.volumeIncreasePct}%`}
              tone={metrics.volumeIncreasePct >= 0 ? 'up' : 'down'}
            />
          ) : null}
          <Row label="Total Reps" value={`${metrics.totalReps} reps`} />
          <Row
            label="Weight/Rep"
            value={metrics.weightPerRep != null ? formatKg(metrics.weightPerRep) : '—'}
          />
        </dl>
      </CardContent>
    </Card>
  )
}

function Row({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'up' | 'down' | 'neutral'
}) {
  const color =
    tone === 'up'
      ? 'text-[var(--color-success)]'
      : tone === 'down'
        ? 'text-[var(--color-danger)]'
        : 'text-[var(--color-fg)]'
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-sm text-[var(--color-muted)]">{label}</dt>
      <dd className={`text-sm font-semibold ${color}`}>{value}</dd>
    </div>
  )
}
