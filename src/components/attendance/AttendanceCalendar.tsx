import { useMemo, useState } from 'react'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Dumbbell, Swords } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  attendanceForDate,
  buildAttendanceDays,
  calendarGrid,
  isInMonth,
  summarizeAttendance,
  type AttendanceKind,
} from '@/lib/attendance'
import { localDateString } from '@/lib/dates'
import type { JudoSession, WorkoutSession } from '@/lib/types'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function AttendanceCalendar({
  workouts,
  judo,
  title = 'Attendance',
}: {
  workouts: WorkoutSession[]
  judo: JudoSession[]
  title?: string
}) {
  const [month, setMonth] = useState(() => new Date())
  const days = useMemo(() => buildAttendanceDays(workouts, judo), [workouts, judo])
  const summary = useMemo(() => summarizeAttendance(days), [days])
  const grid = useMemo(() => calendarGrid(month), [month])

  return (
    <Card data-testid="attendance-calendar">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-[var(--color-primary)]" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Previous month"
              onClick={() => setMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[8rem] text-center text-sm font-medium text-[var(--color-fg)]">
              {format(month, 'MMMM yyyy')}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Next month"
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-3">
          <StatPill label="Active days" value={String(summary.totalDays)} />
          <StatPill label="Lift days" value={String(summary.liftDays)} />
          <StatPill label="Judo days" value={String(summary.judoDays)} />
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const dateStr = localDateString(day)
            const kinds = attendanceForDate(days, dateStr)
            const inMonth = isInMonth(day, month)
            const isToday = dateStr === localDateString()
            return (
              <div
                key={dateStr}
                className={
                  inMonth
                    ? 'flex aspect-square flex-col items-center justify-center rounded-lg bg-[var(--color-surface-2)] p-0.5'
                    : 'flex aspect-square flex-col items-center justify-center rounded-lg p-0.5 opacity-30'
                }
                title={kinds.length > 0 ? kinds.join(', ') : undefined}
              >
                <span
                  className={
                    isToday
                      ? 'text-[10px] font-bold text-[var(--color-primary)]'
                      : 'text-[10px] text-[var(--color-muted)]'
                  }
                >
                  {format(day, 'd')}
                </span>
                <div className="mt-0.5 flex gap-0.5">
                  {kinds.map((k) => (
                    <KindDot key={k} kind={k} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
          <LegendItem color="var(--color-primary)" label="Lift" />
          <LegendItem color="var(--color-accent)" label="Judo" />
          <LegendItem color="var(--color-success)" label="Both" />
        </div>
      </CardContent>
    </Card>
  )
}

function KindDot({ kind }: { kind: AttendanceKind }) {
  const color =
    kind === 'lift'
      ? 'var(--color-primary)'
      : kind === 'judo'
        ? 'var(--color-accent)'
        : 'var(--color-success)'
  const Icon = kind === 'judo' ? Swords : Dumbbell
  return (
    <span
      className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
      style={{ backgroundColor: color }}
    >
      <Icon className="h-2 w-2 text-[var(--color-bg)]" />
    </span>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="text-lg font-bold text-[var(--color-fg)]">{value}</p>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

export function AttendanceMiniList({
  workouts,
  judo,
  limit = 5,
}: {
  workouts: WorkoutSession[]
  judo: JudoSession[]
  limit?: number
}) {
  const days = useMemo(() => buildAttendanceDays(workouts, judo), [workouts, judo])
  const recent = useMemo(
    () => [...days].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit),
    [days, limit],
  )

  if (recent.length === 0) {
    return <p className="text-sm text-[var(--color-muted)]">No sessions logged yet.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-[var(--color-border)]">
      {recent.map((day) => (
        <div key={day.date} className="flex items-center justify-between py-2 text-sm">
          <span className="text-[var(--color-muted)]">
            {format(parseISO(day.date), 'MMM d, yyyy')}
          </span>
          <span className="font-medium capitalize text-[var(--color-fg)]">
            {day.kinds.join(' · ')}
          </span>
        </div>
      ))}
    </div>
  )
}
