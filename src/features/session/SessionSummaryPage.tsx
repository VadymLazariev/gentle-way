import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { CalendarDays, ChevronDown, Clock, Dumbbell, Pencil, Star, Trash2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import {
  useDeleteSession,
  useExerciseBests,
  useSession,
  useSessionSets,
  useWorkoutCount,
} from '@/api/sessions'
import { EditSessionModal } from '@/features/session/EditSessionModal'
import { bestSet, detectPRs, epley1RM, formatSetDisplay, sessionTotals } from '@/lib/stats'
import { setTypeMeta } from '@/features/session/setTypes'
import { formatDuration } from '@/lib/prescription'
import { DAY_META } from '@/lib/program'
import { cn } from '@/lib/utils'
import type { DayCode, SessionSet, SetType, WorkoutSession } from '@/lib/types'

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

const PARTICLES: { x: number; y: number; delay: number }[] = [
  { x: -120, y: -40, delay: 0 },
  { x: 120, y: -50, delay: 0.05 },
  { x: -80, y: 60, delay: 0.1 },
  { x: 90, y: 70, delay: 0.15 },
  { x: 0, y: -90, delay: 0.08 },
  { x: -150, y: 30, delay: 0.12 },
  { x: 150, y: 20, delay: 0.03 },
  { x: 40, y: 90, delay: 0.18 },
]

function CelebrationHeader({ workoutCount }: { workoutCount: number | null }) {
  return (
    <div className="relative mb-6 flex flex-col items-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-surface))] px-6 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {PARTICLES.map((p, i) => (
          <Star
            key={i}
            className="gw-burst absolute h-4 w-4 fill-[var(--color-accent)] text-[var(--color-accent)]"
            style={
              {
                '--gw-x': `${p.x}px`,
                '--gw-y': `${p.y}px`,
                animationDelay: `${p.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="gw-pop-in relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
        <Trophy className="h-8 w-8" />
      </div>
      <h1 className="gw-pop-in relative mt-4 text-2xl font-bold text-[var(--color-fg)]">
        Great Job!
      </h1>
      {workoutCount != null && workoutCount > 0 ? (
        <p className="relative mt-1 text-sm text-[var(--color-muted)]">
          That's your {ordinal(workoutCount)} workout!
        </p>
      ) : null}
    </div>
  )
}

function formatRpe(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function bestSetText(exercise: SessionSet[]): string {
  const best = bestSet(exercise)
  if (!best) return '—'
  return formatSetDisplay(best.set)
}

function SummaryContent({
  session,
  sets,
  workoutCount,
  celebrate,
  historicalBests,
}: {
  session: WorkoutSession
  sets: SessionSet[]
  workoutCount: number | null
  celebrate: boolean
  historicalBests: Map<string, number>
}) {
  const navigate = useNavigate()
  const [showDetail, setShowDetail] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteSession = useDeleteSession()

  const onDelete = async () => {
    await deleteSession.mutateAsync(session.id)
    setConfirmDelete(false)
    navigate('/logbook')
  }

  const totals = useMemo(() => sessionTotals(sets), [sets])
  const prs = useMemo(() => detectPRs(sets, historicalBests), [sets, historicalBests])

  const dayCode = (session.day_code as DayCode | null) ?? 'A'
  const title = session.title ?? `Week ${session.week_number ?? '—'} · ${DAY_META[dayCode]?.label ?? dayCode}`
  const date = session.finished_at ?? session.started_at

  return (
    <div className="pb-4">
      {celebrate ? <CelebrationHeader workoutCount={workoutCount} /> : null}

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[var(--color-fg)]">{title}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {format(new Date(date), 'd MMM yyyy')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatDuration(session.duration_seconds ?? 0)}
                </span>
              </div>
            </div>
            {prs.prCount > 0 ? (
              <Badge variant="accent">
                <Trophy className="h-3.5 w-3.5" /> {prs.prCount} PR{prs.prCount === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Total volume" value={`${totals.totalVolumeKg} kg`} />
            <Stat label="Completed sets" value={String(totals.totalSets)} />
          </div>

          <div className="mt-4 flex flex-col divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {totals.exercises.map((group) => {
              const completedCount = group.sets.filter((s) => s.completed).length
              return (
                <div key={group.exercise} className="flex items-center justify-between gap-3 py-2.5">
                  <p className="min-w-0 truncate text-sm text-[var(--color-fg)]">
                    <span className="font-semibold">{completedCount} ×</span> {group.exercise}
                  </p>
                  <span className="whitespace-nowrap text-sm font-medium text-[var(--color-muted)]">
                    {bestSetText(group.sets)}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-xl bg-[var(--color-surface-2)] px-4 py-3 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-border)]"
      >
        {showDetail ? 'Hide set details' : 'Show set details'}
        <ChevronDown className={cn('h-4 w-4 transition-transform', showDetail ? 'rotate-180' : '')} />
      </button>

      {showDetail ? (
        <div className="mt-3 flex flex-col gap-3">
          {totals.exercises.map((group) => (
            <ExerciseDetail key={group.exercise} exercise={group.exercise} sets={group.sets} prSetIds={prs.prSetIds} />
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2.5">
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={() =>
            navigate(`/session/${session.week_number ?? 1}/${dayCode}`)
          }
        >
          <Dumbbell className="h-5 w-5" /> View set-by-set session
        </Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" className="w-full" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit details
          </Button>
          <Button
            variant="ghost"
            className="w-full text-[var(--color-danger)]"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <EditSessionModal open={editOpen} onClose={() => setEditOpen(false)} session={session} />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete workout?"
        description="This permanently removes the workout and all its sets."
      >
        <div className="flex flex-col gap-2.5">
          <Button
            size="lg"
            variant="danger"
            className="w-full"
            onClick={() => void onDelete()}
            disabled={deleteSession.isPending}
          >
            Delete workout
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={() => setConfirmDelete(false)}
            disabled={deleteSession.isPending}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-[var(--color-fg)]">{value}</p>
    </div>
  )
}

function ExerciseDetail({
  exercise,
  sets,
  prSetIds,
}: {
  exercise: string
  sets: SessionSet[]
  prSetIds: Set<string>
}) {
  let normal = 0
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-2 font-semibold text-[var(--color-primary)]">{exercise}</p>
        <div className="flex flex-col gap-1">
          {sets.map((set) => {
            const meta = setTypeMeta(set.set_type as SetType)
            if (set.set_type === 'normal') normal += 1
            const label = meta.letter || String(normal)
            const isPr = prSetIds.has(set.id)
            const weighted =
              !set.is_bodyweight && (set.weight_kg ?? 0) > 0 && set.reps != null && set.reps > 0
            const e1RM = weighted ? epley1RM(set.weight_kg ?? 0, set.reps ?? 0) : null
            return (
              <div
                key={set.id}
                className={cn(
                  'grid grid-cols-[1.75rem_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                  isPr
                    ? 'bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)]'
                    : set.completed
                      ? ''
                      : 'opacity-50',
                )}
              >
                <span className={cn('text-center text-xs font-bold', meta.textClass)}>{label}</span>
                <span className="text-[var(--color-fg)]">
                  {formatSetDisplay(set)}
                  {set.rpe != null ? (
                    <span className="ml-1.5 text-xs text-[var(--color-muted)]">RPE {formatRpe(set.rpe)}</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1.5 justify-self-end text-[var(--color-muted)]">
                  {isPr ? <Trophy className="h-3.5 w-3.5 text-[var(--color-accent)]" /> : null}
                  {e1RM != null ? (
                    <span className={cn('font-medium', isPr ? 'text-[var(--color-accent)]' : '')}>
                      {e1RM} kg 1RM
                    </span>
                  ) : null}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function SessionSummaryPage() {
  const params = useParams()
  const location = useLocation()
  const sessionId = params.sessionId
  const celebrate = (location.state as { celebrate?: boolean } | null)?.celebrate === true

  const session = useSession(sessionId)
  const sets = useSessionSets(sessionId)
  const workoutCount = useWorkoutCount()

  const exerciseNames = useMemo(
    () => [...new Set((sets.data ?? []).map((s) => s.exercise))],
    [sets.data],
  )
  const bests = useExerciseBests(sessionId, exerciseNames)

  if (session.isLoading || sets.isLoading) return <LoadingState label="Loading summary…" />
  if (session.isError || sets.isError) return <ErrorState />
  if (!session.data) {
    return (
      <EmptyState
        title="Workout not found"
        description="This session may have been deleted."
        action={
          <Link to="/logbook" className="text-sm font-medium text-[var(--color-primary)]">
            Back to Logbook
          </Link>
        }
      />
    )
  }

  return (
    <SummaryContent
      session={session.data}
      sets={sets.data ?? []}
      workoutCount={workoutCount.data ?? null}
      celebrate={celebrate}
      historicalBests={bests.data ?? new Map()}
    />
  )
}
