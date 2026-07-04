import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowRight, Dumbbell, HeartPulse, Plus, Swords, UserCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RpeBadge, RpeTextBadge } from '@/components/RpeBadge'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { SessionLauncher } from '@/features/session/SessionLauncher'
import { JudoLogModal } from '@/features/judo/JudoLogModal'
import { DueNowBanner } from '@/features/supplements/DueNowBanner'
import { useClientSettings } from '@/api/settings'
import { useActiveAssignment, useTemplateStructure } from '@/api/programs'
import { useBlock, useWeek, useWeeklyCalendar } from '@/api/program'
import { useJudoSessions } from '@/api/judo'
import { computeCurrentWeek, blockIdForWeek, planForWeekday, isDeloadWeek, DAY_META } from '@/lib/program'
import { dayCodeForWeekday, parseSchedule, resolvePhase, totalTemplateWeeks } from '@/lib/assignment'
import { localDateString } from '@/lib/dates'
import type { ClientAssignment, DayCode } from '@/lib/types'

const LINK_CARD =
  'transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))]'

function TodaySections({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>
}

export function TodayPage() {
  const assignment = useActiveAssignment()
  const settings = useClientSettings()

  if (assignment.isLoading || settings.isLoading) return <LoadingState />
  if (assignment.isError) return <ErrorState />

  const today = new Date()

  // A coach-assigned program takes over Today; otherwise fall back to the
  // built-in 52-week program driven by the client's settings.
  if (assignment.data) {
    return <AssignedToday assignment={assignment.data} today={today} />
  }

  if (settings.isError || !settings.data) return <ErrorState />

  const week = settings.data.current_week ?? computeCurrentWeek(settings.data.program_start_date)
  const plan = planForWeekday(today.getDay())

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle={format(today, 'EEEE, MMMM d')}
        action={
          <Link to={`/program/week/${week}`}>
            <Badge variant="primary">Week {week} of 52</Badge>
          </Link>
        }
      />

      <TodaySections>
        <DueNowBanner />

        {plan.type === 'sc' ? (
          <ScDay week={week} dayCode={plan.day} />
        ) : plan.type === 'judo' ? (
          <JudoDay week={week} weekday={plan.weekday} />
        ) : (
          <RestDay
            week={week}
            weekday={plan.weekday}
            icon={<HeartPulse className="h-6 w-6" />}
            title="Recovery day"
          />
        )}
      </TodaySections>
    </div>
  )
}

function AssignedToday({ assignment, today }: { assignment: ClientAssignment; today: Date }) {
  const structure = useTemplateStructure(assignment.template_id)
  const schedule = useMemo(() => parseSchedule(assignment.schedule), [assignment.schedule])

  const placement = useMemo(() => {
    if (!structure.data) return null
    return resolvePhase(
      structure.data.mesocycles,
      assignment.start_date,
      assignment.mesocycle_id,
      today,
    )
  }, [structure.data, assignment.start_date, assignment.mesocycle_id, today])

  const dayCode = dayCodeForWeekday(schedule, today.getDay())

  const rows = useMemo(() => {
    if (!structure.data || !placement || !dayCode) return []
    return structure.data.sessions
      .filter((s) => s.mesocycle_id === placement.mesocycle.id && s.day_code === dayCode)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [structure.data, placement, dayCode])

  if (structure.isLoading) return <LoadingState />
  if (structure.isError || !structure.data) return <ErrorState />

  const template = structure.data.template
  const totalWeeks = totalTemplateWeeks(structure.data.mesocycles)
  const programWeek = placement ? placement.weeksElapsed + 1 : 1

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle={format(today, 'EEEE, MMMM d')}
        action={
          <Badge variant="primary">
            {totalWeeks > 0 ? `Week ${Math.min(programWeek, totalWeeks)} of ${totalWeeks}` : 'Assigned'}
          </Badge>
        }
      />

      <TodaySections>
        <Card>
          <CardContent className="flex items-center gap-2 bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] p-4">
            <UserCheck className="h-4 w-4 text-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-fg)]">
              <span className="font-medium">{template.name}</span>
              {placement ? (
                <span className="text-[var(--color-muted)]"> · {placement.mesocycle.name}</span>
              ) : null}
            </p>
          </CardContent>
        </Card>

        <DueNowBanner />

        {!dayCode ? (
          <Card>
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-accent)]">
                <HeartPulse className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--color-fg)]">Rest day</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  No session scheduled today in your assigned program.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                title={`Day ${dayCode} has no exercises`}
                description="Your coach hasn't added exercises to this session yet."
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] px-5 py-4">
              <div className="flex items-center gap-2 text-[var(--color-primary)]">
                <Dumbbell className="h-5 w-5" />
                <span className="text-sm font-semibold">
                  Day {dayCode}
                  {rows[0]?.day_label ? ` · ${rows[0].day_label}` : ''}
                </span>
              </div>
            </div>
            <CardContent className="divide-y divide-[var(--color-border)] p-0">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--color-fg)]">{row.exercise}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {row.prescription ? (
                        <span className="text-xs text-[var(--color-muted)]">{row.prescription}</span>
                      ) : null}
                      <RpeTextBadge value={row.target_rpe} />
                      {row.rest ? <Badge variant="outline">{row.rest}</Badge> : null}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TodaySections>
    </div>
  )
}

function ScDay({ week, dayCode }: { week: number; dayCode: DayCode }) {
  const weekData = useWeek(week)
  const block = useBlock(blockIdForWeek(week))

  const mainWork =
    dayCode === 'A'
      ? weekData.data?.day_a_main
      : dayCode === 'B'
        ? weekData.data?.day_b_main
        : weekData.data?.day_c_focus

  const deload = isDeloadWeek(weekData.data?.focus ?? null)

  return (
    <>
      <Card className="overflow-hidden">
        <div className="bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] px-5 py-4">
          <div className="flex items-center gap-2 text-[var(--color-primary)]">
            <Dumbbell className="h-5 w-5" />
            <span className="text-sm font-semibold">
              {DAY_META[dayCode].label} · {DAY_META[dayCode].weekday}
            </span>
          </div>
        </div>
        <CardContent className="p-5">
          <p className="text-lg font-bold text-[var(--color-fg)]">{mainWork ?? 'Training session'}</p>
          {block.data ? (
            <p className="mt-1 text-sm text-[var(--color-muted)]">{block.data.title}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {weekData.data?.focus ? (
              <Badge variant={deload ? 'accent' : 'default'}>{weekData.data.focus}</Badge>
            ) : null}
            {weekData.data?.hard_sets != null ? (
              <Badge variant="outline">{weekData.data.hard_sets} hard sets</Badge>
            ) : null}
            <RpeBadge rpe={weekData.data?.main_rpe ?? null} label="Main RPE" />
          </div>
        </CardContent>
      </Card>

      <SessionLauncher weekNumber={week} dayCode={dayCode} sectionTitle="Session" />

      <Link to={`/program/week/${week}`} className="block">
        <Card className={LINK_CARD}>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium text-[var(--color-fg)]">Review this week's plan</p>
              <p className="text-sm text-[var(--color-muted)]">Week {week} sessions and prescriptions</p>
            </div>
            <ArrowRight className="h-5 w-5 text-[var(--color-muted)]" />
          </CardContent>
        </Card>
      </Link>
    </>
  )
}

function JudoDay({ week, weekday }: { week: number; weekday: string }) {
  const calendar = useWeeklyCalendar()
  const judo = useJudoSessions(50)
  const [modalOpen, setModalOpen] = useState(false)
  const entry = calendar.data?.find((d) => d.day === weekday)
  const todayStr = localDateString()
  const todaysSessions = (judo.data ?? []).filter((s) => s.session_date === todayStr)

  return (
    <>
      <Card className="overflow-hidden">
        <div className="bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] px-5 py-4">
          <div className="flex items-center gap-2 text-[var(--color-accent)]">
            <Swords className="h-5 w-5" />
            <span className="text-sm font-semibold">Judo day · {weekday}</span>
          </div>
        </div>
        <CardContent className="p-5">
          <p className="text-lg font-bold text-[var(--color-fg)]">{entry?.session ?? 'Randori session'}</p>
          {entry?.intensity_rule ? (
            <p className="mt-1 text-sm text-[var(--color-fg)]">{entry.intensity_rule}</p>
          ) : null}
          {entry?.notes ? (
            <p className="mt-1 text-xs italic text-[var(--color-muted)]">{entry.notes}</p>
          ) : null}

          {todaysSessions.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              {todaysSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-sm"
                >
                  <Badge variant="accent">{s.duration_minutes} min</Badge>
                  <span className="text-[var(--color-muted)]">
                    {s.standing_randori_rounds} standing · {s.ground_randori_rounds} ground
                  </span>
                  {s.intensity_rpe != null ? (
                    <Badge variant="outline">RPE {s.intensity_rpe}</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <Button className="mt-4 w-full" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Log judo session
          </Button>
        </CardContent>
      </Card>

      <Link to={`/program/week/${week}`} className="block">
        <Card className={LINK_CARD}>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium text-[var(--color-fg)]">Review this week's plan</p>
              <p className="text-sm text-[var(--color-muted)]">Week {week} sessions and prescriptions</p>
            </div>
            <ArrowRight className="h-5 w-5 text-[var(--color-muted)]" />
          </CardContent>
        </Card>
      </Link>

      <JudoLogModal open={modalOpen} onClose={() => setModalOpen(false)} weekNumber={week} />
    </>
  )
}

function RestDay({
  week,
  weekday,
  icon,
  title,
}: {
  week: number
  weekday: string
  icon: ReactNode
  title: string
}) {
  const calendar = useWeeklyCalendar()
  const entry = calendar.data?.find((d) => d.day === weekday)

  return (
    <>
      <Card>
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-accent)]">
            {icon}
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--color-fg)]">{title}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {entry?.session ?? 'No S&C session scheduled today.'}
            </p>
            {entry?.intensity_rule ? (
              <p className="mt-2 text-sm text-[var(--color-fg)]">{entry.intensity_rule}</p>
            ) : null}
            {entry?.notes ? (
              <p className="mt-1 text-xs italic text-[var(--color-muted)]">{entry.notes}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Link to={`/program/week/${week}`} className="block">
        <Card className={LINK_CARD}>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium text-[var(--color-fg)]">Review this week's plan</p>
              <p className="text-sm text-[var(--color-muted)]">Week {week} sessions and prescriptions</p>
            </div>
            <ArrowRight className="h-5 w-5 text-[var(--color-muted)]" />
          </CardContent>
        </Card>
      </Link>
    </>
  )
}
