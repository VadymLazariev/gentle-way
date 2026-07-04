import { useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMeasurementTrend } from '@/api/measurements'
import { LoadingState } from '@/components/ui/Feedback'

export function WeightMiniChart({ days = 90 }: { days?: number }) {
  const trend = useMeasurementTrend('weight_kg')

  const chartData = useMemo(() => {
    const cutoff = subDays(new Date(), days)
    return (trend.data ?? [])
      .filter((p) => parseISO(p.measuredAt) >= cutoff)
      .map((point) => ({
        date: format(parseISO(point.measuredAt), 'MMM d'),
        value: point.value,
      }))
  }, [trend.data, days])

  if (trend.isLoading) return <LoadingState />

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Log body weight to see your trend here.
      </p>
    )
  }

  return (
    <div className="h-36 w-full" data-testid="weight-mini-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ReLineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={10} tickMargin={4} />
          <YAxis stroke="var(--color-muted)" fontSize={10} domain={['auto', 'auto']} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const value = payload[0]?.value
              return (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs shadow-lg">
                  <p className="font-medium text-[var(--color-fg)]">{label}</p>
                  <p className="text-[var(--color-primary)]">
                    {value != null ? Number(value).toFixed(1) : '—'} kg
                  </p>
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}
