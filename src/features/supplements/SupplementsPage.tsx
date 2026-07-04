import { useMemo, useState } from 'react'
import { Pencil, Pill, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback'
import { toastError } from '@/components/ui/Toast'
import {
  useCreateSupplement,
  useLogSupplement,
  useSupplementsWithLogs,
  useUpdateSupplement,
} from '@/api/supplements'
import { DueNowBanner } from '@/features/supplements/DueNowBanner'
import { ReminderSettings } from '@/features/supplements/ReminderSettings'
import { SupplementFormModal } from '@/features/supplements/SupplementFormModal'
import { localDateString } from '@/lib/dates'
import {
  buildExpectedPerDayMap,
  countTakenDosesOnDate,
  countTakenDosesForLog,
  dosesPerDay,
  formatDosage,
  formatScheduleDays,
  formatScheduleTimes,
  isScheduledOnDate,
  isSlotTaken,
  legacyFrequencyLabel,
  normalizeScheduleTimes,
  takenSlotsForLog,
} from '@/lib/supplements'
import type { Supplement, SupplementLog } from '@/lib/types'

export function SupplementsPage() {
  const { supplements, logs, isLoading, isError } = useSupplementsWithLogs(30)
  const createSupplement = useCreateSupplement()
  const updateSupplement = useUpdateSupplement()
  const logSupplement = useLogSupplement()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplement | null>(null)
  const today = localDateString()
  const now = new Date()

  const active = useMemo(() => supplements.filter((s) => s.is_active), [supplements])
  const inactive = useMemo(() => supplements.filter((s) => !s.is_active), [supplements])

  const todayLogMap = useMemo(() => {
    const map = new Map<string, SupplementLog>()
    for (const log of logs) {
      if (log.logged_on === today) map.set(log.supplement_id, log)
    }
    return map
  }, [logs, today])

  const onMarkAllToday = async (supplement: Supplement) => {
    const doseCount = dosesPerDay(supplement)
    const allSlots = normalizeScheduleTimes(supplement.schedule_times).map((_, i) => i)
    try {
      await logSupplement.mutateAsync({
        supplementId: supplement.id,
        loggedOn: today,
        takenSlots: allSlots,
        doseCount,
      })
    } catch (error) {
      toastError(error, 'Could not log supplement')
    }
  }

  const onMarkSlot = async (supplement: Supplement, slotIndex: number) => {
    const log = todayLogMap.get(supplement.id)
    const existing = takenSlotsForLog(log)
    if (isSlotTaken(log, slotIndex)) return
    try {
      await logSupplement.mutateAsync({
        supplementId: supplement.id,
        loggedOn: today,
        takenSlots: [...existing, slotIndex],
        doseCount: dosesPerDay(supplement),
      })
    } catch (error) {
      toastError(error, 'Could not log supplement')
    }
  }

  const onDeactivate = async (supplement: Supplement) => {
    try {
      await updateSupplement.mutateAsync({ id: supplement.id, patch: { is_active: false } })
    } catch (error) {
      toastError(error, 'Could not deactivate supplement')
    }
  }

  if (isLoading) return <LoadingState />
  if (isError) return <ErrorState />

  const scheduledToday = active.filter((s) => isScheduledOnDate(s, now))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Supplements"
        subtitle="Track intake and reminders"
        action={
          <Button type="button" size="sm" data-testid="add-supplement-btn" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add supplement
          </Button>
        }
      />

      <DueNowBanner compact />
      <ReminderSettings />

      {active.length === 0 && inactive.length === 0 ? (
        <EmptyState
          title="No supplements yet"
          description="Add your own supplements or ask your coach to assign them."
          icon={<Pill className="h-7 w-7" />}
        />
      ) : (
        <div className="flex flex-col gap-3" data-testid="supplements-list">
          {scheduledToday.length === 0 && active.length > 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Nothing scheduled for today.</p>
          ) : null}
          {scheduledToday.map((s) => (
            <SupplementCard
              key={s.id}
              supplement={s}
              log={todayLogMap.get(s.id)}
              onMarkSlot={(slot) => onMarkSlot(s, slot)}
              onMarkAll={() => onMarkAllToday(s)}
              onEdit={() => setEditing(s)}
              onDeactivate={() => onDeactivate(s)}
              pending={logSupplement.isPending}
            />
          ))}
          {active
            .filter((s) => !isScheduledOnDate(s, now))
            .map((s) => (
              <SupplementCard
                key={s.id}
                supplement={s}
                log={todayLogMap.get(s.id)}
                onMarkSlot={(slot) => onMarkSlot(s, slot)}
                onMarkAll={() => onMarkAllToday(s)}
                onEdit={() => setEditing(s)}
                onDeactivate={() => onDeactivate(s)}
                pending={logSupplement.isPending}
                offDay
              />
            ))}
        </div>
      )}

      {inactive.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Inactive
          </p>
          <div className="flex flex-col gap-2">
            {inactive.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between p-4 text-sm">
                  <span className="text-[var(--color-muted)]">{s.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateSupplement.mutate({ id: s.id, patch: { is_active: true } })
                    }
                  >
                    Reactivate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <SupplementFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createSupplement.mutateAsync}
        pending={createSupplement.isPending}
      />
      <SupplementFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (!editing) throw new Error('No supplement selected')
          return updateSupplement.mutateAsync({ id: editing.id, patch: input })
        }}
        pending={updateSupplement.isPending}
        initial={editing}
      />
    </div>
  )
}

function SupplementCard({
  supplement,
  log,
  onMarkSlot,
  onMarkAll,
  onEdit,
  onDeactivate,
  pending,
  offDay = false,
}: {
  supplement: Supplement
  log: SupplementLog | undefined
  onMarkSlot: (slotIndex: number) => void
  onMarkAll: () => void
  onEdit: () => void
  onDeactivate: () => void
  pending: boolean
  offDay?: boolean
}) {
  const times = normalizeScheduleTimes(supplement.schedule_times)
  const doseCount = times.length
  const takenCount = log
    ? countTakenDosesForLog(log, supplement)
    : 0
  const allTaken = takenCount >= doseCount

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-[var(--color-fg)]">{supplement.name}</p>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              {formatDosage(supplement) || '—'} · {formatScheduleDays(supplement.schedule_days)} ·{' '}
              {formatScheduleTimes(supplement.schedule_times)}
            </p>
            {offDay ? (
              <Badge variant="outline" className="mt-2">
                Not scheduled today
              </Badge>
            ) : null}
          </div>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="ghost" aria-label="Edit" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDeactivate}>
              Deactivate
            </Button>
          </div>
        </div>

        {!offDay ? (
          <div className="mt-3 flex flex-col gap-2">
            {times.map((time, slotIndex) => {
              const taken = isSlotTaken(log, slotIndex)
              const label = time.slice(0, 5)
              return (
                <div
                  key={`${supplement.id}-${slotIndex}`}
                  className="flex items-center justify-between rounded-xl bg-[var(--color-surface-2)] px-3 py-2"
                >
                  <span className="text-sm text-[var(--color-fg)]">{label}</span>
                  <Button
                    type="button"
                    variant={taken ? 'primary' : 'outline'}
                    size="sm"
                    data-testid={`supplement-log-${supplement.id}-${slotIndex}`}
                    disabled={pending || taken}
                    onClick={() => onMarkSlot(slotIndex)}
                  >
                    {taken ? 'Taken' : 'Mark taken'}
                  </Button>
                </div>
              )
            })}
            {doseCount > 1 && !allTaken ? (
              <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onMarkAll}>
                Mark all taken today
              </Button>
            ) : null}
          </div>
        ) : (
          <Button
            type="button"
            className="mt-3"
            variant={allTaken ? 'primary' : 'outline'}
            size="sm"
            data-testid={`supplement-log-${supplement.id}`}
            disabled={pending || allTaken}
            onClick={onMarkAll}
          >
            {allTaken ? 'Taken today' : 'Mark taken'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function SupplementsCoachSection() {
  const { supplements, logs, isLoading } = useSupplementsWithLogs(14)
  const createSupplement = useCreateSupplement()
  const [modalOpen, setModalOpen] = useState(false)

  const adherence = useMemo(() => {
    const active = supplements.filter((s) => s.is_active)
    if (active.length === 0) return null
    const expectedMap = buildExpectedPerDayMap(active, 14)
    let expected = 0
    let taken = 0
    for (const count of expectedMap.values()) expected += count
    for (const [date, count] of expectedMap) {
      taken += Math.min(countTakenDosesOnDate(active, logs, date), count)
    }
    return expected > 0 ? Math.round((taken / expected) * 1000) / 10 : null
  }, [supplements, logs])

  if (isLoading) return null

  return (
    <Card data-testid="supplements-coach-section">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-[var(--color-accent)]" />
            Supplements
          </CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {adherence != null ? (
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            14-day adherence:{' '}
            <span className="font-semibold text-[var(--color-fg)]">{adherence}%</span>
          </p>
        ) : null}
        {supplements.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No supplements assigned.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {supplements.map((s) => (
              <SupplementRow key={s.id} supplement={s} logs={logs} />
            ))}
          </div>
        )}
      </CardContent>
      <SupplementFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={createSupplement.mutateAsync}
        pending={createSupplement.isPending}
      />
    </Card>
  )
}

function SupplementRow({
  supplement,
  logs,
}: {
  supplement: Supplement
  logs: SupplementLog[]
}) {
  const expectedMap = buildExpectedPerDayMap([supplement], 14)
  let expected = 0
  for (const count of expectedMap.values()) expected += count
  const takenCount = logs
    .filter((l) => l.supplement_id === supplement.id)
    .reduce((sum, log) => sum + countTakenDosesForLog(log, supplement), 0)

  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-sm">
      <div>
        <p className="font-medium text-[var(--color-fg)]">{supplement.name}</p>
        <p className="text-xs text-[var(--color-muted)]">
          {formatDosage(supplement) || '—'} · {legacyFrequencyLabel(supplement)}
        </p>
      </div>
      <Badge variant={supplement.is_active ? 'primary' : 'outline'}>
        {takenCount}/{expected} doses
      </Badge>
    </div>
  )
}
