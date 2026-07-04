import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { LineChart, TrendingUp } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { useExerciseSetHistory, useProgressExercises } from '@/api/sessions'
import type { ExerciseSetPoint } from '@/api/sessions'

export function ProgressPage() {
  const exercises = useProgressExercises()
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    if (!selected && exercises.data && exercises.data.length > 0) {
      setSelected(exercises.data[0])
    }
  }, [exercises.data, selected])

  if (exercises.isLoading) return <LoadingState />
  if (exercises.isError) return <ErrorState />

  if (!exercises.data || exercises.data.length === 0) {
    return (
      <div>
        <PageHeader title="Progress" subtitle="Track load and volume over time" />
        <EmptyState
          title="No data yet"
          description="Complete some sets in a session and your progress charts will appear here."
          icon={<TrendingUp className="h-7 w-7" />}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Progress" subtitle="Track load and volume over time" />

      <div className="mb-6 max-w-sm">
        <Label>Exercise</Label>
        <Select
          className="mt-1.5"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {exercises.data.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      {selected ? <ExerciseProgress exercise={selected} /> : null}
    </div>
  )
}

function ExerciseProgress({ exercise }: { exercise: string }) {
  const progress = useExerciseSetHistory(exercise)

  const chartData = useMemo(() => {
    return (progress.data ?? []).map((point, index) => ({
      index,
      date: format(parseISO(point.startedAt), 'MMM d'),
      topWeight: point.topWeight,
      volume: point.volume,
    }))
  }, [progress.data])

  const stats = useMemo(() => computeStats(progress.data ?? []), [progress.data])

  if (progress.isLoading) return <LoadingState />
  if (progress.isError) return <ErrorState />
  if (chartData.length === 0) {
    return <EmptyState title="No completed sets for this exercise" />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sessions" value={String(stats.count)} />
        <StatCard label="Best set" value={stats.best != null ? `${stats.best} kg` : '—'} />
        <StatCard label="Latest top" value={stats.latest != null ? `${stats.latest} kg` : '—'} />
        <StatCard
          label="Load change"
          value={stats.delta != null ? `${stats.delta > 0 ? '+' : ''}${stats.delta} kg` : '—'}
          tone={stats.delta != null ? (stats.delta >= 0 ? 'up' : 'down') : 'neutral'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-[var(--color-primary)]" />
            Top set (kg)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={12} tickMargin={8} />
                <YAxis stroke="var(--color-muted)" fontSize={12} />
                <Tooltip content={<ChartTooltip suffix=" kg" />} />
                <Line
                  type="monotone"
                  dataKey="topWeight"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--color-accent)]" />
            Volume (kg)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={12} tickMargin={8} />
                <YAxis stroke="var(--color-muted)" fontSize={12} />
                <Tooltip content={<ChartTooltip suffix=" kg" />} />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function computeStats(points: ExerciseSetPoint[]) {
  const weights = points.map((p) => p.topWeight).filter((v): v is number => v != null)
  const best = weights.length ? Math.max(...weights) : null
  const latest = weights.length ? weights[weights.length - 1] : null
  const first = weights.length ? weights[0] : null
  const delta = latest != null && first != null ? Math.round((latest - first) * 10) / 10 : null
  return { count: points.length, best, latest, delta }
}

function StatCard({
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
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
        <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

type TooltipEntry = { name?: string; value?: number | string; color?: string }

function ChartTooltip({
  active,
  payload,
  label,
  suffix = '',
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  suffix?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[var(--color-fg)]">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.value ?? '—'}
          {suffix}
        </p>
      ))}
    </div>
  )
}
