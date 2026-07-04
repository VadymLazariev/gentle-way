import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fieldDefForKey, type MeasurementFieldKey } from '@/lib/measurements'
import { useMeasurementTrend } from '@/api/measurements'
import { LoadingState } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

const TREND_FIELDS: MeasurementFieldKey[] = ['weight_kg', 'waist_cm', 'chest_cm', 'hip_cm']

export function MeasurementTrendChart() {
  const [field, setField] = useState<MeasurementFieldKey>('weight_kg')
  const trend = useMeasurementTrend(field)
  const def = fieldDefForKey(field)

  const chartData = useMemo(
    () =>
      (trend.data ?? []).map((point) => ({
        date: format(parseISO(point.measuredAt), 'MMM d'),
        value: point.value,
      })),
    [trend.data],
  )

  if (trend.isLoading) return <LoadingState />

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs">
        <Label>Trend</Label>
        <Select className="mt-1.5" value={field} onChange={(e) => setField(e.target.value as MeasurementFieldKey)}>
          {TREND_FIELDS.map((key) => (
            <option key={key} value={key}>
              {fieldDefForKey(key).label}
            </option>
          ))}
        </Select>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No data for this metric yet.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={12} tickMargin={8} />
              <YAxis stroke="var(--color-muted)" fontSize={12} domain={['auto', 'auto']} />
              <Tooltip content={<TrendTooltip unit={def.unit} decimals={def.decimals} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function TrendTooltip({
  active,
  payload,
  label,
  unit,
  decimals,
}: {
  active?: boolean
  payload?: { value?: number }[]
  label?: string | number
  unit: string
  decimals: number
}) {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0]?.value
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[var(--color-fg)]">{label}</p>
      <p className="text-[var(--color-primary)]">
        {value != null ? value.toFixed(decimals) : '—'} {unit}
      </p>
    </div>
  )
}
