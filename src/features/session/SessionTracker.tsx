import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { CalendarDays, Clock, MinusCircle, Pause, Pencil, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { toastError } from '@/components/ui/Toast'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { formatDuration } from '@/lib/prescription'
import { useDayPrescriptions } from '@/api/program'
import { useAssignedDayExercises } from '@/api/programs'
import {
  useDeleteSession,
  useDeleteSet,
  useFinishSession,
  usePauseSession,
  usePreviousSessionVolume,
  usePreviousSets,
  useResumeSession,
  useSessionAdjustments,
  useSessionSets,
  useUpdateSet,
} from '@/api/sessions'
import { EditSessionModal } from '@/features/session/EditSessionModal'
import { ExerciseCard } from '@/features/session/ExerciseCard'
import type { AdjustmentAction, SessionAdjustment } from '@/lib/types'
import { FocusMetricCard } from '@/features/session/FocusMetricCard'
import type { SessionMetrics } from '@/features/session/FocusMetricCard'
import { RestTimer } from '@/features/session/RestTimer'
import { DAY_META } from '@/lib/program'
import type { DayCode, PlannedExercise, SessionSet, WorkoutSession } from '@/lib/types'

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

// Live elapsed excludes accumulated paused time and any currently-open pause
// span: now - started_at - paused_seconds - (paused_at ? now - paused_at : 0).
function liveElapsedSeconds(session: WorkoutSession, nowMs: number): number {
  const started = new Date(session.started_at).getTime()
  const openPauseMs = session.paused_at ? nowMs - new Date(session.paused_at).getTime() : 0
  const elapsedMs = nowMs - started - session.paused_seconds * 1000 - Math.max(0, openPauseMs)
  return Math.max(0, Math.floor(elapsedMs / 1000))
}

function computeMetrics(sets: SessionSet[], previousVolume: number | null): SessionMetrics {
  const completed = sets.filter((s) => s.completed)
  const totalVolume = completed.reduce((t, s) => t + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
  const totalReps = completed.reduce((t, s) => t + (s.reps ?? 0), 0)
  const weightPerRep = totalReps > 0 ? Math.round((totalVolume / totalReps) * 100) / 100 : null
  const volumeIncreasePct =
    previousVolume != null && previousVolume > 0
      ? Math.round(((totalVolume - previousVolume) / previousVolume) * 100)
      : null
  return {
    totalVolume: Math.round(totalVolume * 100) / 100,
    totalReps,
    weightPerRep,
    volumeIncreasePct,
  }
}

export function SessionTracker({ session }: { session: WorkoutSession }) {
  const navigate = useNavigate()
  const dayCode = (session.day_code as DayCode | null) ?? 'A'
  const isAssigned = session.template_id != null
  const prescriptions = useDayPrescriptions(
    isAssigned ? undefined : (session.week_number ?? undefined),
    isAssigned ? undefined : dayCode,
  )
  const assignedExercises = useAssignedDayExercises(
    isAssigned ? (session.mesocycle_id ?? undefined) : undefined,
    isAssigned ? (session.template_week ?? undefined) : undefined,
    isAssigned ? dayCode : undefined,
  )
  const sets = useSessionSets(session.id)
  const adjustments = useSessionAdjustments(session.id)
  const finish = useFinishSession()
  const updateSet = useUpdateSet()
  const deleteSet = useDeleteSet()
  const deleteSession = useDeleteSession()
  const pauseSession = usePauseSession()
  const resumeSession = useResumeSession()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editMetaOpen, setEditMetaOpen] = useState(false)
  const [editingSets, setEditingSets] = useState(false)

  const adjustmentByPrescription = useMemo(() => {
    const map = new Map<number, SessionAdjustment>()
    for (const a of adjustments.data ?? []) {
      if (a.prescription_id != null) map.set(a.prescription_id, a)
    }
    return map
  }, [adjustments.data])

  const exerciseNames = useMemo(
    () => [...new Set((sets.data ?? []).map((s) => s.exercise))],
    [sets.data],
  )
  const previous = usePreviousSets(session.id, exerciseNames)
  const previousVolume = usePreviousSessionVolume(session.id, dayCode)

  const finished = session.finished_at != null
  const paused = session.paused_at != null
  const now = useNow(!finished && !paused)
  const [rest, setRest] = useState<{ seconds: number; startedAt: number } | null>(null)

  const elapsedSeconds = finished
    ? (session.duration_seconds ?? 0)
    : liveElapsedSeconds(session, now)

  const setsByPrescription = useMemo(() => {
    const map = new Map<number, SessionSet[]>()
    for (const set of sets.data ?? []) {
      if (set.prescription_id == null) continue
      const list = map.get(set.prescription_id) ?? []
      list.push(set)
      map.set(set.prescription_id, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.set_index - b.set_index)
    return map
  }, [sets.data])

  const setsByTemplateSession = useMemo(() => {
    const map = new Map<string, SessionSet[]>()
    for (const set of sets.data ?? []) {
      if (set.template_session_id == null) continue
      const list = map.get(set.template_session_id) ?? []
      list.push(set)
      map.set(set.template_session_id, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.set_index - b.set_index)
    return map
  }, [sets.data])

  const assignedMetaById = useMemo(() => {
    const map = new Map<string, PlannedExercise>()
    for (const row of assignedExercises.data ?? []) {
      if (row.source.kind === 'template') map.set(row.source.templateSessionId, row)
    }
    return map
  }, [assignedExercises.data])

  const metrics = useMemo(
    () => computeMetrics(sets.data ?? [], previousVolume.data ?? null),
    [sets.data, previousVolume.data],
  )

  const title =
    session.title ?? `Week ${session.week_number ?? '—'} · ${DAY_META[dayCode]?.label ?? dayCode}`

  const incompleteSets = (sets.data ?? []).filter((s) => !s.completed)
  const finishing = finish.isPending || updateSet.isPending || deleteSet.isPending

  const goToSummary = async () => {
    try {
      await finish.mutateAsync({
        id: session.id,
        startedAt: session.started_at,
        pausedSeconds: session.paused_seconds,
        pausedAt: session.paused_at,
      })
      navigate(`/summary/${session.id}`, { state: { celebrate: true } })
    } catch (e) {
      toastError(e, 'Could not finish workout')
    }
  }

  const togglePause = () => {
    if (paused) {
      resumeSession.mutate(
        {
          id: session.id,
          pausedAt: session.paused_at!,
          pausedSeconds: session.paused_seconds,
        },
        { onError: (e) => toastError(e, 'Could not resume session') },
      )
    } else {
      pauseSession.mutate(session.id, {
        onError: (e) => toastError(e, 'Could not pause session'),
      })
    }
  }

  const dismissRest = useCallback(() => setRest(null), [])

  const onFinish = () => {
    if (incompleteSets.length === 0) {
      void goToSummary()
      return
    }
    setConfirmOpen(true)
  }

  const completeUnfinishedAndFinish = async () => {
    try {
      for (const set of incompleteSets) {
        // Reps are pre-seeded from the prescription, so an entered load is the
        // only reliable signal that the user actually logged this set.
        const wasLogged = set.weight_kg != null || set.is_bodyweight
        if (wasLogged) {
          await updateSet.mutateAsync({ id: set.id, completed: true })
        } else {
          await deleteSet.mutateAsync(set.id)
        }
      }
      setConfirmOpen(false)
      await goToSummary()
    } catch (e) {
      toastError(e, 'Could not finish workout')
    }
  }

  const cancelWorkout = async () => {
    try {
      await deleteSession.mutateAsync(session.id)
      setConfirmOpen(false)
      navigate('/start')
    } catch (e) {
      toastError(e, 'Could not cancel workout')
    }
  }

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Close session"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-fg)] hover:bg-[var(--color-border)]"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-semibold text-[var(--color-fg)]">
            {formatDuration(elapsedSeconds)}
          </span>
          {paused ? <Badge variant="accent">Paused</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditMetaOpen(true)}
            aria-label="Edit workout details"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {finished ? (
            <Button
              variant={editingSets ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setEditingSets((v) => !v)}
            >
              {editingSets ? 'Done' : 'Edit'}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={togglePause}
                disabled={pauseSession.isPending || resumeSession.isPending}
              >
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {paused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onFinish}
                disabled={finishing}
                className="bg-[var(--color-success)] hover:brightness-110"
              >
                Finish
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[var(--color-fg)]">{title}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {format(new Date(session.started_at), 'd MMM yyyy')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatDuration(elapsedSeconds)}
          </span>
        </div>
      </div>

      {sets.isLoading ? (
        <LoadingState label="Loading session…" />
      ) : sets.isError ? (
        <ErrorState />
      ) : isAssigned ? (
        (sets.data ?? []).length === 0 ? (
          <EmptyState title="No exercises in this session" />
        ) : (
          <div className="flex flex-col gap-4">
            {[...setsByTemplateSession.entries()].map(([templateSessionId, exerciseSets]) => {
              const meta = assignedMetaById.get(templateSessionId)
              const exerciseName = exerciseSets[0]?.exercise ?? meta?.exercise ?? 'Exercise'
              return (
                <ExerciseCard
                  key={templateSessionId}
                  sessionId={session.id}
                  prescription={null}
                  templateSessionId={templateSessionId}
                  meta={
                    meta
                      ? {
                          exercise: meta.exercise,
                          prescription: meta.prescription,
                          target_rpe: meta.target_rpe,
                          rest: meta.rest,
                        }
                      : {
                          exercise: exerciseName,
                          prescription: null,
                          target_rpe: null,
                          rest: null,
                        }
                  }
                  exerciseName={exerciseName}
                  sets={exerciseSets}
                  previous={previous.data?.get(exerciseName)}
                  disabled={finished && !editingSets}
                  onStartRest={(seconds) => setRest({ seconds, startedAt: Date.now() })}
                />
              )
            })}
            <FocusMetricCard metrics={metrics} />
          </div>
        )
      ) : !prescriptions.data || prescriptions.data.length === 0 ? (
        <EmptyState title="No prescriptions for this day" />
      ) : (
        <div className="flex flex-col gap-4">
          {prescriptions.data.map((p) => {
            const adjustment = adjustmentByPrescription.get(p.id)
            const action = (adjustment?.action as AdjustmentAction | undefined) ?? null
            if (action === 'skip') {
              return <SkippedCard key={p.id} exercise={p.exercise} reason={adjustment?.reason ?? null} />
            }
            const effectiveExercise =
              action === 'swap' && adjustment?.substitute_exercise
                ? adjustment.substitute_exercise
                : p.exercise
            return (
              <ExerciseCard
                key={p.id}
                sessionId={session.id}
                prescription={p}
                exerciseName={effectiveExercise}
                adjustment={
                  adjustment
                    ? {
                        action: adjustment.action as AdjustmentAction,
                        rpeCap: adjustment.rpe_cap,
                        substitute: adjustment.substitute_exercise,
                        reason: adjustment.reason,
                      }
                    : null
                }
                sets={setsByPrescription.get(p.id) ?? []}
                previous={previous.data?.get(effectiveExercise)}
                disabled={finished && !editingSets}
                onStartRest={(seconds) => setRest({ seconds, startedAt: Date.now() })}
              />
            )
          })}

          <FocusMetricCard metrics={metrics} />
        </div>
      )}

      {rest ? (
        <RestTimer
          seconds={rest.seconds}
          startedAt={rest.startedAt}
          onDismiss={dismissRest}
        />
      ) : null}

      <EditSessionModal
        open={editMetaOpen}
        onClose={() => setEditMetaOpen(false)}
        session={session}
      />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Finish workout?"
        description={`You have ${incompleteSets.length} unfinished ${
          incompleteSets.length === 1 ? 'set' : 'sets'
        }.`}
      >
        <div className="flex flex-col gap-2.5">
          <Button
            size="lg"
            className="w-full bg-[var(--color-success)] hover:brightness-110"
            onClick={() => void completeUnfinishedAndFinish()}
            disabled={finishing}
          >
            Complete Unfinished Sets
          </Button>
          <Button
            size="lg"
            variant="danger"
            className="w-full"
            onClick={() => void cancelWorkout()}
            disabled={deleteSession.isPending}
          >
            Cancel Workout
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="w-full"
            onClick={() => setConfirmOpen(false)}
            disabled={finishing || deleteSession.isPending}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function SkippedCard({ exercise, reason }: { exercise: string; reason: string | null }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2">
        <MinusCircle className="h-4 w-4 text-[var(--color-danger)]" />
        <p className="font-medium text-[var(--color-muted)] line-through">{exercise}</p>
        <Badge variant="danger">Skipped</Badge>
      </div>
      {reason ? <p className="mt-1 pl-6 text-xs text-[var(--color-muted)]">{reason}</p> : null}
    </div>
  )
}
