import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { CheckCircle2, Dumbbell, Info, Play, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { RpeTextBadge } from '@/components/RpeBadge'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { useDayPrescriptions, useWeek } from '@/api/program'
import { useSessionByWeekDay, useStartSession } from '@/api/sessions'
import { useActiveInjuries, useCommitCheckin } from '@/api/health'
import { toastError } from '@/components/ui/Toast'
import { CheckinStep } from '@/features/checkin/CheckinStep'
import type { CheckinResult } from '@/features/checkin/CheckinStep'
import { AdjustmentList } from '@/features/checkin/AdjustmentList'
import { ExerciseInfoModal } from '@/features/session/ExerciseInfoModal'
import { DAY_META, TOTAL_WEEKS, blockIdForWeek } from '@/lib/program'
import { parsePrescription } from '@/lib/prescription'
import { buildAdjustmentPlan, hasEffect } from '@/lib/adjustments'
import type { AdjustmentPlan } from '@/lib/adjustments'
import type { DayCode, Prescription } from '@/lib/types'

type Phase = 'preview' | 'checkin' | 'review'

function parseDay(value: string | undefined): DayCode | null {
  return value === 'A' || value === 'B' || value === 'C' ? value : null
}

function mainWorkFor(
  dayCode: DayCode,
  week: { day_a_main: string | null; day_b_main: string | null; day_c_focus: string | null } | null,
): string | null {
  if (!week) return null
  switch (dayCode) {
    case 'A':
      return week.day_a_main
    case 'B':
      return week.day_b_main
    case 'C':
      return week.day_c_focus
    default: {
      const _exhaustive: never = dayCode
      return _exhaustive
    }
  }
}

export function TemplatePreviewPage() {
  const params = useParams()
  const navigate = useNavigate()
  const week = Number(params.week)
  const day = parseDay(params.day)

  const validWeek = Number.isFinite(week) && week >= 1 && week <= TOTAL_WEEKS
  const prescriptions = useDayPrescriptions(validWeek ? week : undefined, day ?? undefined)
  const weekData = useWeek(validWeek ? week : undefined)
  const session = useSessionByWeekDay(validWeek ? week : undefined, day ?? undefined)
  const activeInjuries = useActiveInjuries()
  const start = useStartSession()
  const commitCheckin = useCommitCheckin()

  const [phase, setPhase] = useState<Phase>('preview')
  const [checkin, setCheckin] = useState<CheckinResult | null>(null)
  const [infoExercise, setInfoExercise] = useState<string | null>(null)

  const plan = useMemo<AdjustmentPlan | null>(() => {
    if (!checkin || !prescriptions.data) return null
    return buildAdjustmentPlan(
      prescriptions.data.map((p) => {
        const rpe = p.target_rpe != null ? Number.parseFloat(p.target_rpe) : null
        return {
          prescriptionId: p.id,
          exercise: p.exercise,
          targetRpe: rpe != null && Number.isFinite(rpe) ? rpe : null,
        }
      }),
      checkin.reportedInjuries,
      checkin.readiness,
    )
  }, [checkin, prescriptions.data])

  if (!validWeek || !day) {
    return <ErrorState message="That session does not exist." />
  }

  const title = `Week ${week} · ${DAY_META[day].label}`
  const mainWork = mainWorkFor(day, weekData.data ?? null)
  const existing = session.data
  const state = existing == null ? 'new' : existing.finished_at ? 'finished' : 'active'

  const enterTracker = () => navigate(`/session/${week}/${day}`)

  const startSession = async (data: Prescription[], result: CheckinResult | null, adjusted: boolean) => {
    try {
      let checkinId: string | null = null
      if (result) {
        const checkin = await commitCheckin.mutateAsync(result.draft)
        checkinId = checkin.id
      }
      await start.mutateAsync({
        weekNumber: week,
        dayCode: day,
        blockId: blockIdForWeek(week),
        title,
        prescriptions: data,
        checkinId,
        adjustments: adjusted && plan ? plan.adjustments : undefined,
      })
      enterTracker()
    } catch (e) {
      toastError(e, 'Could not start workout')
    }
  }

  const onPrimary = () => {
    if (state !== 'new') {
      enterTracker()
      return
    }
    setPhase('checkin')
  }

  if (phase === 'checkin') {
    return (
      <div className="pb-4">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPhase('preview')}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-fg)] hover:bg-[var(--color-border)]"
          >
            <X className="h-5 w-5" />
          </button>
          <Badge variant="primary">{title}</Badge>
        </div>
        <CheckinStep
          activeInjuries={activeInjuries.data ?? []}
          onSkip={() => {
            if (prescriptions.data) startSession(prescriptions.data, null, false)
          }}
          onContinue={(result) => {
            setCheckin(result)
            setPhase('review')
          }}
        />
      </div>
    )
  }

  if (phase === 'review' && plan) {
    const anyChange = plan.adjustments.some(hasEffect)
    return (
      <div className="pb-4">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPhase('checkin')}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-fg)] hover:bg-[var(--color-border)]"
          >
            <X className="h-5 w-5" />
          </button>
          <Badge variant="primary">{title}</Badge>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-[var(--color-fg)]">Today's plan</h1>
        <p className="mb-5 text-sm text-[var(--color-muted)]">
          Based on your check-in. You can start with these adjustments or override.
        </p>

        <AdjustmentList plan={plan} />

        <div className="sticky bottom-16 z-10 mt-6 flex flex-col gap-2 md:bottom-4">
          {anyChange ? (
            <Button
              size="lg"
              className="w-full"
              onClick={() => prescriptions.data && startSession(prescriptions.data, checkin, true)}
              disabled={start.isPending || commitCheckin.isPending}
            >
              <ShieldCheck className="h-5 w-5" />
              {start.isPending || commitCheckin.isPending ? 'Starting…' : 'Start with adjustments'}
            </Button>
          ) : null}
          <Button
            size="lg"
            variant={anyChange ? 'outline' : 'primary'}
            className="w-full"
            onClick={() => prescriptions.data && startSession(prescriptions.data, checkin, false)}
            disabled={start.isPending || commitCheckin.isPending}
          >
            <Play className="h-5 w-5" />
            {plan.restRecommended ? 'Start anyway (as planned)' : 'Start as planned'}
          </Button>
        </div>
      </div>
    )
  }

  const primaryLabel =
    state === 'new' ? 'Start Workout' : state === 'active' ? 'Resume Workout' : 'View Workout'

  return (
    <div className="pb-4">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-fg)] hover:bg-[var(--color-border)]"
        >
          <X className="h-5 w-5" />
        </button>
        <Badge variant="primary">
          <Dumbbell className="h-3 w-3" /> {DAY_META[day].weekday}
        </Badge>
      </div>

      <h1 className="text-2xl font-bold text-[var(--color-fg)]">{title}</h1>
      {mainWork ? <p className="mt-1 text-sm text-[var(--color-fg)]">{mainWork}</p> : null}
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {prescriptions.data?.length ?? 0} exercises · set-by-set tracking
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {state === 'active' ? <Badge variant="accent">In progress</Badge> : null}
        {state === 'finished' ? (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" /> Completed
            {existing?.finished_at ? ` · ${format(new Date(existing.finished_at), 'd MMM')}` : ''}
          </Badge>
        ) : null}
      </div>

      <div className="mt-5">
        {prescriptions.isLoading ? (
          <LoadingState label="Loading exercises…" />
        ) : prescriptions.isError ? (
          <ErrorState />
        ) : !prescriptions.data || prescriptions.data.length === 0 ? (
          <EmptyState title="No prescriptions for this day" />
        ) : (
          <Card>
            <CardContent className="divide-y divide-[var(--color-border)] p-0">
              {prescriptions.data.map((p) => {
                const parsed = parsePrescription(p.prescription)
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-medium text-[var(--color-fg)]">{p.exercise}</p>
                        <button
                          type="button"
                          onClick={() => setInfoExercise(p.exercise)}
                          aria-label={`How to do ${p.exercise}`}
                          className="shrink-0 text-[var(--color-muted)] transition-colors hover:text-[var(--color-primary)]"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {p.prescription ? (
                          <span className="text-xs text-[var(--color-muted)]">{p.prescription}</span>
                        ) : null}
                        <RpeTextBadge value={p.target_rpe} />
                      </div>
                    </div>
                    <Badge variant="outline">{parsed.sets} sets</Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="sticky bottom-16 z-10 mt-6 flex flex-col gap-2 md:bottom-4">
        <Button
          size="lg"
          className="w-full"
          onClick={onPrimary}
          disabled={
            start.isPending ||
            session.isLoading ||
            !prescriptions.data ||
            prescriptions.data.length === 0
          }
        >
          <Play className="h-5 w-5" />
          {start.isPending ? 'Starting…' : primaryLabel}
        </Button>
        {state === 'finished' ? (
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => setPhase('checkin')}
            disabled={
              start.isPending || !prescriptions.data || prescriptions.data.length === 0
            }
          >
            <RotateCcw className="h-5 w-5" />
            Start again
          </Button>
        ) : null}
      </div>

      <ExerciseInfoModal
        open={infoExercise != null}
        onClose={() => setInfoExercise(null)}
        exerciseName={infoExercise ?? ''}
      />
    </div>
  )
}
