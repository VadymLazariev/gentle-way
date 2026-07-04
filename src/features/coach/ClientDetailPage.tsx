import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  Activity,
  ArrowLeft,
  Dumbbell,
  HeartPulse,
  Swords,
  Trophy,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { useClientProfile } from '@/api/coach'
import { useClientSettings } from '@/api/settings'
import { useSessionHistory } from '@/api/sessions'
import { useJudoSessions } from '@/api/judo'
import { useSessionCheckins, useActiveInjuries } from '@/api/health'
import { useBodyMeasurements } from '@/api/measurements'
import { useCoachWeeklyReports, useReviewWeeklyReport } from '@/api/reports'
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar'
import { GoalsSection } from '@/features/goals/GoalsSection'
import { ClientNutritionSection } from '@/features/coach/ClientNutritionSection'
import { CheatMealsSection } from '@/features/coach/CheatMealsSection'
import { SupplementsCoachSection } from '@/features/supplements/SupplementsPage'
import { useActiveAssignment, useProgramTemplates } from '@/api/programs'
import { useClientViewer } from '@/lib/client/ClientContext'
import { epley1RM } from '@/lib/stats'
import { computeCurrentWeek } from '@/lib/program'
import type { SessionHistoryEntry } from '@/api/sessions'
import type { BodyMeasurement, WeeklyReport } from '@/lib/types'

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const { setViewingClientId } = useClientViewer()

  useEffect(() => {
    setViewingClientId(clientId ?? null)
    return () => setViewingClientId(null)
  }, [clientId, setViewingClientId])

  const profile = useClientProfile(clientId)
  const settings = useClientSettings()
  const history = useSessionHistory(200)
  const judo = useJudoSessions(200)
  const checkins = useSessionCheckins(30)
  const injuries = useActiveInjuries()
  const measurements = useBodyMeasurements(20)
  const weeklyReports = useCoachWeeklyReports(8)

  const name = profile.data?.name ?? 'Client'

  if (profile.isLoading || settings.isLoading || history.isLoading) return <LoadingState />
  if (profile.isError) return <ErrorState />

  const week =
    settings.data?.current_week ??
    (settings.data ? computeCurrentWeek(settings.data.program_start_date) : null)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/coach/clients"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-4 w-4" /> All clients
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-lg font-bold text-[var(--color-fg)]">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-fg)]">{name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {week != null ? <Badge variant="primary">Week {week} of 52</Badge> : null}
              <Baseline profile={profile.data} />
              {clientId ? (
                <Link to={`/coach/analytics/${clientId}`}>
                  <Badge variant="outline">Analytics →</Badge>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <StatGrid
        workouts={history.data ?? []}
        judoCount={judo.data?.length ?? 0}
        activeInjuries={injuries.data?.length ?? 0}
      />

      <AssignedProgramCard />

      <GoalsSection coachMode />

      {clientId ? <ClientNutritionSection clientId={clientId} /> : null}

      {clientId ? <CheatMealsSection clientId={clientId} /> : null}

      <SupplementsCoachSection />

      <AttendanceCalendar
        workouts={history.data ?? []}
        judo={judo.data ?? []}
        title="Attendance"
      />

      <ReadinessCard checkins={checkins.data ?? []} />

      <WeeklyReportsCard reports={weeklyReports.data ?? []} />

      <MeasurementsCard measurements={measurements.data ?? []} />

      <TrainingTrend workouts={history.data ?? []} />

      <div className="grid gap-6 md:grid-cols-2">
        <PersonalBests workouts={history.data ?? []} />
        <RecentActivity workouts={history.data ?? []} judoCount={judo.data?.length ?? 0} />
      </div>
    </div>
  )
}

function AssignedProgramCard() {
  const assignment = useActiveAssignment()
  const templates = useProgramTemplates()

  const template = assignment.data
    ? (templates.data ?? []).find((t) => t.id === assignment.data?.template_id) ?? null
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[var(--color-primary)]" />
          Assigned program
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assignment.isLoading ? (
          <p className="text-sm text-[var(--color-muted)]">Loading…</p>
        ) : assignment.data ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[var(--color-fg)]">
                {template?.name ?? 'Assigned program'}
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                Started {assignment.data.start_date}
              </p>
            </div>
            <Link to="/coach/programs">
              <Button variant="outline" size="sm">
                Change program
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-muted)]">
              No program assigned yet. Assign one from Programs.
            </p>
            <Link to="/coach/programs">
              <Button variant="outline" size="sm">
                Browse programs
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

function Baseline({ profile }: { profile: { sex: string | null; date_of_birth: string | null; height_cm: number | null; starting_weight_kg: number | null } | null | undefined }) {
  if (!profile) return null
  const age = ageFromDob(profile.date_of_birth)
  const parts: string[] = []
  if (profile.sex) parts.push(profile.sex)
  if (age != null) parts.push(`${age}y`)
  if (profile.height_cm != null) parts.push(`${profile.height_cm} cm`)
  if (profile.starting_weight_kg != null) parts.push(`start ${profile.starting_weight_kg} kg`)
  if (parts.length === 0) return null
  return <Badge variant="outline">{parts.join(' · ')}</Badge>
}

function StatGrid({
  workouts,
  judoCount,
  activeInjuries,
}: {
  workouts: SessionHistoryEntry[]
  judoCount: number
  activeInjuries: number
}) {
  const finished = workouts.filter((w) => w.finished_at != null).length
  const prCount = useMemo(() => personalBests(workouts).length, [workouts])
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={<Dumbbell className="h-4 w-4" />} label="Lifts" value={String(finished)} />
      <StatCard icon={<Swords className="h-4 w-4" />} label="Judo" value={String(judoCount)} />
      <StatCard icon={<Trophy className="h-4 w-4" />} label="PRs" value={String(prCount)} />
      <StatCard
        icon={<HeartPulse className="h-4 w-4" />}
        label="Injuries"
        value={String(activeInjuries)}
        tone={activeInjuries > 0 ? 'warn' : 'neutral'}
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'neutral' | 'warn'
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-[var(--color-muted)]">
          {icon}
          <span className="text-xs uppercase tracking-wide">{label}</span>
        </div>
        <p
          className={
            tone === 'warn'
              ? 'mt-1 text-2xl font-bold text-[var(--color-warning)]'
              : 'mt-1 text-2xl font-bold text-[var(--color-fg)]'
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

type CheckinRow = {
  sleep_quality: number | null
  soreness: number | null
  fatigue: number | null
  mood: number | null
  stress: number | null
  recovery: number | null
  overall_feeling: number | null
}

function ReadinessCard({ checkins }: { checkins: CheckinRow[] }) {
  const avg = (pick: (c: CheckinRow) => number | null): number | null => {
    const vals = checkins.map(pick).filter((v): v is number => v != null)
    if (vals.length === 0) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }
  const metrics: { label: string; value: number | null; good: 'high' | 'low' }[] = [
    { label: 'Sleep', value: avg((c) => c.sleep_quality), good: 'high' },
    { label: 'Soreness', value: avg((c) => c.soreness), good: 'low' },
    { label: 'Fatigue', value: avg((c) => c.fatigue), good: 'low' },
    { label: 'Mood', value: avg((c) => c.mood), good: 'high' },
    { label: 'Stress', value: avg((c) => c.stress), good: 'low' },
    { label: 'Recovery', value: avg((c) => c.recovery), good: 'high' },
    { label: 'Feeling', value: avg((c) => c.overall_feeling), good: 'high' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-[var(--color-accent)]" />
          Readiness
        </CardTitle>
      </CardHeader>
      <CardContent>
        {checkins.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No check-ins recorded yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {metrics.map((m) => (
              <ReadinessMeter key={m.label} label={m.label} value={m.value} good={m.good} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReadinessMeter({
  label,
  value,
  good,
}: {
  label: string
  value: number | null
  good: 'high' | 'low'
}) {
  const pct = value != null ? (value / 5) * 100 : 0
  const favorable = value == null ? false : good === 'high' ? value >= 3.5 : value <= 2.5
  const barColor = value == null
    ? 'var(--color-surface-2)'
    : favorable
      ? 'var(--color-success)'
      : 'var(--color-warning)'
  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-[var(--color-fg)]">
        {value != null ? value.toFixed(1) : '—'}
        <span className="text-xs font-normal text-[var(--color-muted)]"> / 5</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
    </div>
  )
}

function WeeklyReportsCard({ reports }: { reports: WeeklyReport[] }) {
  const review = useReviewWeeklyReport()
  const latest = reports[0]

  const onReview = async (reportId: string) => {
    try {
      await review.mutateAsync({ reportId, coachNotes: null })
    } catch {
      // toast handled by mutation consumer if needed
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[var(--color-primary)]" />
          Weekly reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No submitted reports yet.</p>
        ) : (
          <div className="flex flex-col gap-3" data-testid="client-weekly-reports">
            {reports.slice(0, 3).map((report) => (
              <div key={report.id} className="rounded-xl bg-[var(--color-surface-2)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--color-fg)]">
                    {format(parseISO(report.week_start), 'MMM d')} –{' '}
                    {format(parseISO(report.week_end), 'MMM d')}
                  </p>
                  <Badge variant={report.status === 'reviewed' ? 'primary' : 'accent'}>
                    {report.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--color-muted)] sm:grid-cols-4">
                  {report.weight_kg != null ? <span>Weight {report.weight_kg} kg</span> : null}
                  {report.mood != null ? <span>Mood {report.mood}/5</span> : null}
                  {report.recovery != null ? <span>Recovery {report.recovery}/5</span> : null}
                  {report.stress != null ? <span>Stress {report.stress}/5</span> : null}
                </div>
                {report.client_notes ? (
                  <p className="mt-2 text-xs text-[var(--color-fg)]">{report.client_notes}</p>
                ) : null}
                {report.status === 'submitted' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    disabled={review.isPending}
                    onClick={() => onReview(report.id)}
                  >
                    Mark reviewed
                  </Button>
                ) : null}
              </div>
            ))}
            {latest ? (
              <Link to="/coach/reports" className="text-xs text-[var(--color-primary)] hover:underline">
                View all reports
              </Link>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MeasurementsCard({ measurements }: { measurements: BodyMeasurement[] }) {
  const weightTrend = useMemo(() => {
    return [...measurements]
      .filter((m) => m.weight_kg != null)
      .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
      .slice(-8)
      .map((m) => ({
        date: format(parseISO(m.measured_at), 'MMM d'),
        weight: m.weight_kg as number,
      }))
  }, [measurements])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--color-accent)]" />
          Body measurements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {measurements.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No measurements logged yet.</p>
        ) : (
          <>
            {weightTrend.length > 1 ? (
              <div className="mb-4 h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={weightTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={11} tickMargin={6} />
                    <YAxis stroke="var(--color-muted)" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip suffix=" kg" />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="var(--color-accent)"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  </ReLineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {measurements.slice(0, 4).map((m) => (
                <div key={m.id} className="flex justify-between py-2 text-sm">
                  <span className="text-[var(--color-muted)]">
                    {format(parseISO(m.measured_at), 'MMM d, yyyy')}
                  </span>
                  <span className="font-medium text-[var(--color-fg)]">
                    {m.weight_kg != null ? `${m.weight_kg} kg` : '—'}
                    {m.waist_cm != null ? ` · waist ${m.waist_cm} cm` : ''}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TrainingTrend({ workouts }: { workouts: SessionHistoryEntry[] }) {
  const data = useMemo(() => {
    return [...workouts]
      .filter((w) => w.finished_at != null)
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .map((w) => {
        const completed = w.sets.filter((s) => s.completed)
        const volume = completed.reduce((t, s) => t + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
        const rpes = completed.map((s) => s.rpe).filter((v): v is number => v != null)
        const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null
        return {
          date: format(parseISO(w.started_at), 'MMM d'),
          volume: Math.round(volume),
          rpe: avgRpe != null ? Math.round(avgRpe * 10) / 10 : null,
        }
      })
  }, [workouts])

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-primary)]" />
            Training volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState title="No finished lifts yet" />
          ) : (
            <TrendChart data={data} dataKey="volume" color="var(--color-primary)" suffix=" kg" />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-accent)]" />
            Average RPE
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <EmptyState title="No RPE logged yet" />
          ) : (
            <TrendChart data={data} dataKey="rpe" color="var(--color-accent)" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type TrendPoint = { date: string; volume: number; rpe: number | null }

function TrendChart({
  data,
  dataKey,
  color,
  suffix = '',
}: {
  data: TrendPoint[]
  dataKey: 'volume' | 'rpe'
  color: string
  suffix?: string
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ReLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={12} tickMargin={8} />
          <YAxis stroke="var(--color-muted)" fontSize={12} />
          <Tooltip content={<ChartTooltip suffix={suffix} />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            connectNulls
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}

type TooltipEntry = { value?: number | string; color?: string }

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

type Best = { exercise: string; e1RM: number }

function personalBests(workouts: SessionHistoryEntry[]): Best[] {
  const finishedIds = new Set(workouts.filter((w) => w.finished_at != null).map((w) => w.id))
  const bestByExercise = new Map<string, number>()
  for (const w of workouts) {
    if (!finishedIds.has(w.id)) continue
    for (const s of w.sets) {
      if (!s.completed || s.is_bodyweight) continue
      if ((s.weight_kg ?? 0) <= 0 || s.reps == null || s.reps <= 0) continue
      const e = epley1RM(s.weight_kg ?? 0, s.reps)
      if (e > (bestByExercise.get(s.exercise) ?? 0)) bestByExercise.set(s.exercise, e)
    }
  }
  return [...bestByExercise.entries()]
    .map(([exercise, e1RM]) => ({ exercise, e1RM }))
    .sort((a, b) => b.e1RM - a.e1RM)
}

function PersonalBests({ workouts }: { workouts: SessionHistoryEntry[] }) {
  const bests = useMemo(() => personalBests(workouts).slice(0, 6), [workouts])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[var(--color-warning)]" />
          Personal bests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bests.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No weighted lifts logged yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {bests.map((b) => (
              <div key={b.exercise} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-sm text-[var(--color-fg)]">{b.exercise}</span>
                <span className="shrink-0 text-sm font-semibold text-[var(--color-fg)]">
                  {b.e1RM} kg
                  <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">e1RM</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentActivity({
  workouts,
  judoCount,
}: {
  workouts: SessionHistoryEntry[]
  judoCount: number
}) {
  const recent = useMemo(
    () =>
      [...workouts]
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
        .slice(0, 6),
    [workouts],
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--color-primary)]" />
          Recent lifts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No lifts logged yet{judoCount > 0 ? ` (${judoCount} judo sessions on record)` : ''}.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {recent.map((w) => {
              const setCount = w.sets.filter((s) => s.completed).length
              return (
                <div key={w.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--color-fg)]">
                      {w.title ?? `Week ${w.week_number ?? '—'}`}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {format(parseISO(w.started_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {w.finished_at == null ? <Badge variant="accent">In progress</Badge> : null}
                    <span className="shrink-0 text-xs text-[var(--color-muted)]">{setCount} sets</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
