import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Dumbbell, PlayCircle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingState, ErrorState } from '@/components/ui/Feedback'
import { useClientSettings } from '@/api/settings'
import { useDayPrescriptions } from '@/api/program'
import { useActiveAssignment, useAssignedDayExercises, useTemplateStructure } from '@/api/programs'
import { useActiveSessions } from '@/api/sessions'
import { parseSchedule, resolvePhase, resolveWeek, totalTemplateWeeks } from '@/lib/assignment'
import { computeCurrentWeek, DAY_META, DAY_ORDER, TOTAL_WEEKS } from '@/lib/program'
import type { DayCode, WorkoutSession } from '@/lib/types'

export function StartWorkoutPage() {
  const settings = useClientSettings()
  const assignment = useActiveAssignment()
  const structure = useTemplateStructure(assignment.data?.template_id)
  const active = useActiveSessions()
  const [week, setWeek] = useState<number | null>(null)

  const assigned = assignment.data != null
  const schedule = useMemo(
    () => (assignment.data ? parseSchedule(assignment.data.schedule) : {}),
    [assignment.data],
  )
  const scheduledDays = useMemo(() => {
    const codes = [...new Set(Object.values(schedule))].sort()
    return codes.length > 0 ? codes : DAY_ORDER
  }, [schedule])

  const assignedCurrentWeek = useMemo(() => {
    if (!assigned || !assignment.data || !structure.data) return 1
    const placement = resolvePhase(
      structure.data.mesocycles,
      assignment.data.start_date,
      assignment.data.mesocycle_id,
    )
    const total = totalTemplateWeeks(structure.data.mesocycles)
    const absoluteWeek = placement ? placement.weeksElapsed + 1 : 1
    return total > 0 ? Math.min(absoluteWeek, total) : absoluteWeek
  }, [assigned, assignment.data, structure.data])

  if (settings.isLoading || assignment.isLoading || (assigned && structure.isLoading)) {
    return <LoadingState />
  }
  if (settings.isError || !settings.data || assignment.isError) return <ErrorState />
  if (assigned && (structure.isError || !structure.data)) return <ErrorState />

  const currentWeek = assigned
    ? assignedCurrentWeek
    : (settings.data.current_week ?? computeCurrentWeek(settings.data.program_start_date))

  const maxWeek = assigned
    ? totalTemplateWeeks(structure.data!.mesocycles)
    : TOTAL_WEEKS

  const selectedWeek = week ?? currentWeek

  return (
    <div>
      <PageHeader title="Start Workout" subtitle="Pick a session to begin" />

      {active.data && active.data.length > 0 ? (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            In progress
          </h2>
          <div className="flex flex-col gap-3">
            {active.data.map((session) => (
              <ResumeCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Templates
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous week"
            disabled={selectedWeek <= 1}
            onClick={() => setWeek(Math.max(1, selectedWeek - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-16 text-center text-sm font-medium text-[var(--color-fg)]">
            Week {selectedWeek}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next week"
            disabled={selectedWeek >= maxWeek}
            onClick={() => setWeek(Math.min(maxWeek, selectedWeek + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {assigned
          ? scheduledDays.map((day) => {
              const placement = resolveWeek(
                structure.data!.mesocycles,
                selectedWeek,
                assignment.data!.mesocycle_id,
              )
              return (
                <AssignedTemplateCard
                  key={day}
                  week={selectedWeek}
                  day={day as DayCode}
                  mesocycleId={placement?.mesocycle.id}
                  weekInMeso={placement?.weekInMeso}
                />
              )
            })
          : DAY_ORDER.map((day) => <BuiltinTemplateCard key={day} week={selectedWeek} day={day} />)}
      </div>
    </div>
  )
}

function ResumeCard({ session }: { session: WorkoutSession }) {
  const dayCode = (session.day_code as DayCode | null) ?? 'A'
  const to = `/session/${session.week_number ?? 1}/${dayCode}`
  return (
    <Link to={to}>
      <Card className="transition-colors hover:border-[var(--color-primary)]">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--color-fg)]">
              {session.title ?? `Week ${session.week_number ?? '—'} · ${DAY_META[dayCode]?.label ?? dayCode}`}
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">Tap to resume</p>
          </div>
          <Badge variant="accent">
            <PlayCircle className="h-3 w-3" /> Resume
          </Badge>
        </CardContent>
      </Card>
    </Link>
  )
}

function BuiltinTemplateCard({ week, day }: { week: number; day: DayCode }) {
  const navigate = useNavigate()
  const prescriptions = useDayPrescriptions(week, day)
  const to = `/start/${week}/${day}`

  const preview = (prescriptions.data ?? [])
    .slice(0, 4)
    .map((p) => p.exercise)
    .join(', ')
  const extra = (prescriptions.data?.length ?? 0) - 4

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-[var(--color-primary)]"
      onClick={() => navigate(to)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[var(--color-primary)]">
              <Dumbbell className="h-4 w-4" />
              <span className="text-sm font-semibold">
                Week {week} · {DAY_META[day].label}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{DAY_META[day].weekday}</p>
          </div>
          <Badge variant="outline">{prescriptions.data?.length ?? 0} ex</Badge>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">
          {prescriptions.isLoading
            ? 'Loading…'
            : preview
              ? `${preview}${extra > 0 ? `, +${extra} more` : ''}`
              : 'No exercises for this day'}
        </p>
      </CardContent>
    </Card>
  )
}

function AssignedTemplateCard({
  week,
  day,
  mesocycleId,
  weekInMeso,
}: {
  week: number
  day: DayCode
  mesocycleId: string | undefined
  weekInMeso: number | undefined
}) {
  const navigate = useNavigate()
  const exercises = useAssignedDayExercises(mesocycleId, weekInMeso, day)
  const to = `/start/${week}/${day}`

  const preview = (exercises.data ?? [])
    .slice(0, 4)
    .map((p) => p.exercise)
    .join(', ')
  const extra = (exercises.data?.length ?? 0) - 4

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-[var(--color-primary)]"
      onClick={() => navigate(to)}
      data-testid={`assigned-template-${week}-${day}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[var(--color-primary)]">
              <Dumbbell className="h-4 w-4" />
              <span className="text-sm font-semibold">Week {week} · Day {day}</span>
            </div>
          </div>
          <Badge variant="outline">{exercises.data?.length ?? 0} ex</Badge>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">
          {exercises.isLoading
            ? 'Loading…'
            : preview
              ? `${preview}${extra > 0 ? `, +${extra} more` : ''}`
              : 'No exercises for this day'}
        </p>
      </CardContent>
    </Card>
  )
}
