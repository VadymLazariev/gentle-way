import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Play, Timer } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { useDayPrescriptions, prescriptionsToPlanned } from '@/api/program'
import { useAssignedDayExercises } from '@/api/programs'
import { useSessionByWeekDay, useSessionSets } from '@/api/sessions'
import { formatDuration, parsePrescription } from '@/lib/prescription'
import type { DayCode, PlannedExercise } from '@/lib/types'

function exerciseKey(exercise: PlannedExercise): string {
  switch (exercise.source.kind) {
    case 'builtin':
      return `b-${exercise.source.prescriptionId}`
    case 'template':
      return `t-${exercise.source.templateSessionId}`
    default: {
      const _exhaustive: never = exercise.source
      return _exhaustive
    }
  }
}

export function SessionLauncher({
  weekNumber,
  dayCode,
  className,
  sectionTitle,
  templateId,
  mesocycleId,
  weekInMeso,
}: {
  weekNumber: number
  dayCode: DayCode
  className?: string
  sectionTitle?: string
  templateId?: string
  mesocycleId?: string
  weekInMeso?: number
}) {
  const navigate = useNavigate()
  const assigned = templateId != null && mesocycleId != null && weekInMeso != null
  const builtinPrescriptions = useDayPrescriptions(assigned ? undefined : weekNumber, assigned ? undefined : dayCode)
  const assignedExercises = useAssignedDayExercises(
    assigned ? mesocycleId : undefined,
    assigned ? weekInMeso : undefined,
    assigned ? dayCode : undefined,
  )
  const session = useSessionByWeekDay(weekNumber, dayCode, templateId ?? null)
  const finishedId = session.data?.finished_at ? session.data.id : undefined
  const finishedSets = useSessionSets(finishedId)

  const exercises = useMemo((): PlannedExercise[] | undefined => {
    if (assigned) return assignedExercises.data
    if (!builtinPrescriptions.data) return undefined
    return prescriptionsToPlanned(builtinPrescriptions.data)
  }, [assigned, assignedExercises.data, builtinPrescriptions.data])
  const isLoading = assigned ? assignedExercises.isLoading : builtinPrescriptions.isLoading
  const isError = assigned ? assignedExercises.isError : builtinPrescriptions.isError

  const summary = useMemo(() => {
    const sets = finishedSets.data ?? []
    const completed = sets.filter((s) => s.completed)
    const volume = completed.reduce((t, s) => t + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
    return { completed: completed.length, volume: Math.round(volume * 100) / 100 }
  }, [finishedSets.data])

  if (isLoading) return <LoadingState label="Loading session…" />
  if (isError) return <ErrorState />
  if (!exercises || exercises.length === 0) {
    return <EmptyState title="No prescriptions for this day" />
  }

  const to = `/start/${weekNumber}/${dayCode}`
  const state = session.data == null ? 'new' : session.data.finished_at ? 'finished' : 'active'

  return (
    <Card className={className} data-testid="session-launcher">
      <CardContent className="p-4">
        {sectionTitle ? (
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            {sectionTitle}
          </h2>
        ) : null}
        {state === 'finished' ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
            {session.data?.duration_seconds != null ? (
              <Badge variant="outline">
                <Timer className="h-3 w-3" /> {formatDuration(session.data.duration_seconds)}
              </Badge>
            ) : null}
            <Badge variant="default">{summary.completed} sets</Badge>
            {summary.volume > 0 ? (
              <Badge variant="primary">{summary.volume} kg volume</Badge>
            ) : null}
          </div>
        ) : state === 'active' ? (
          <div className="mb-3">
            <Badge variant="accent">In progress</Badge>
          </div>
        ) : null}

        <ul className="mb-4 flex flex-col divide-y divide-[var(--color-border)]">
          {exercises.map((p) => {
            const parsed = parsePrescription(p.prescription)
            return (
              <li key={exerciseKey(p)} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-sm text-[var(--color-fg)]">{p.exercise}</span>
                <span className="shrink-0 text-xs font-medium text-[var(--color-muted)]">
                  {parsed.sets} × {parsed.reps ?? '—'}
                </span>
              </li>
            )
          })}
        </ul>

        <Button className="w-full" size="lg" onClick={() => navigate(to)} data-testid="session-launcher-btn">
          {state === 'new' ? (
            <>
              <Play className="h-5 w-5" /> Start Session
            </>
          ) : state === 'active' ? (
            <>
              <Play className="h-5 w-5" /> Resume Session
            </>
          ) : (
            <>
              View Session <ChevronRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
