import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, ArrowLeft, LineChart as LineChartIcon } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingState, ErrorState } from '@/components/ui/Feedback'
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar'
import { GoalsSection } from '@/features/goals/GoalsSection'
import { SupplementsCoachSection } from '@/features/supplements/SupplementsPage'
import { useClients } from '@/api/coach'
import { useSessionHistory } from '@/api/sessions'
import { useJudoSessions } from '@/api/judo'
import { useSessionCheckins } from '@/api/health'
import { useSupplementLogs, useSupplements } from '@/api/supplements'
import { useClientViewer } from '@/lib/client/ClientContext'
import {
  computeDailyAdherence,
  correlateAdherenceRecovery,
  correlationFromPoints,
} from '@/lib/analytics'
import { buildExpectedPerDayMap } from '@/lib/supplements'
import { buildAttendanceDays, summarizeAttendance } from '@/lib/attendance'
import { useEffect } from 'react'

export function AnalyticsPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const { setViewingClientId } = useClientViewer()
  const clients = useClients()

  useEffect(() => {
    setViewingClientId(clientId ?? null)
    return () => setViewingClientId(null)
  }, [clientId, setViewingClientId])

  const client = clients.data?.find((c) => c.clientId === clientId)
  const history = useSessionHistory(365)
  const judo = useJudoSessions(365)
  const checkins = useSessionCheckins(60)
  const supplements = useSupplements(false)
  const logs = useSupplementLogs(30)

  const analytics = useMemo(() => {
    const active = (supplements.data ?? []).filter((s) => s.is_active)
    const expectedPerDay = buildExpectedPerDayMap(active, 14)
    const adherence = computeDailyAdherence(
      active,
      logs.data ?? [],
      expectedPerDay,
      14,
    )
    const correlation = correlateAdherenceRecovery(adherence, checkins.data ?? [])
    const r = correlationFromPoints(correlation)
    const attendance = summarizeAttendance(
      buildAttendanceDays(history.data ?? [], judo.data ?? []),
    )
    return { adherence, correlation, r, attendance }
  }, [supplements.data, logs.data, checkins.data, history.data, judo.data])

  if (clients.isLoading || history.isLoading) return <LoadingState />
  if (clients.isError) return <ErrorState />

  const name = client?.profile?.name ?? 'Client'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={clientId ? `/coach/clients/${clientId}` : '/coach/clients'}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to client
        </Link>
        <PageHeader title={`Analytics · ${name}`} subtitle="Trends, compliance, and correlations" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Active days" value={String(analytics.attendance.totalDays)} />
        <MetricCard label="Lift days" value={String(analytics.attendance.liftDays)} />
        <MetricCard
          label="Adherence ↔ recovery"
          value={analytics.r != null ? `r = ${analytics.r}` : '—'}
        />
      </div>

      <AttendanceCalendar
        workouts={history.data ?? []}
        judo={judo.data ?? []}
        title="Attendance calendar"
      />

      <GoalsSection coachMode />

      <SupplementsCoachSection />

      <Card data-testid="adherence-recovery-chart">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-[var(--color-primary)]" />
            Supplement adherence vs recovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.correlation.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Not enough data yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.correlation} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-muted)" fontSize={11} />
                  <YAxis yAxisId="left" stroke="var(--color-muted)" fontSize={11} domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--color-muted)" fontSize={11} domain={[1, 5]} />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="adherencePct" fill="var(--color-primary)" opacity={0.7} name="Adherence %" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="recovery"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name="Recovery"
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-accent)]" />
            Daily supplement adherence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.adherence} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-muted)"
                  fontSize={10}
                  tickFormatter={(v) => format(new Date(v), 'M/d')}
                />
                <YAxis stroke="var(--color-muted)" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="pct" fill="var(--color-primary)" name="Adherence %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[var(--color-fg)]">{value}</p>
      </CardContent>
    </Card>
  )
}

export function CoachAnalyticsOverviewPage() {
  const clients = useClients()

  if (clients.isLoading) return <LoadingState />
  if (clients.isError) return <ErrorState />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" subtitle="Roster performance overview" />

      <Card>
        <CardHeader>
          <CardTitle>Per-client analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {(clients.data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No clients yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {(clients.data ?? []).map((row) => (
                <Link
                  key={row.clientId}
                  to={`/coach/analytics/${row.clientId}`}
                  className="flex items-center justify-between py-3 text-sm hover:text-[var(--color-primary)]"
                >
                  <span className="font-medium text-[var(--color-fg)]">
                    {row.profile?.name ?? 'Client'}
                  </span>
                  <span className="text-[var(--color-muted)]">View trends →</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
