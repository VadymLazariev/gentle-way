import { Bell, Check, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useLogSupplement, useSupplementsWithLogs } from '@/api/supplements'
import { toastError } from '@/components/ui/Toast'
import { localDateString } from '@/lib/dates'
import { cn } from '@/lib/utils'
import {
  dosesPerDay,
  getDueDoses,
  isSlotTaken,
  takenSlotsForLog,
} from '@/lib/supplements'

export function DueNowBanner({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const { supplements, logs, isLoading } = useSupplementsWithLogs(1)
  const logSupplement = useLogSupplement()
  const today = localDateString()

  if (isLoading) return null

  const active = supplements.filter((s) => s.is_active)
  const dueDoses = getDueDoses(active, logs).filter((d) => d.status !== 'taken')
  if (dueDoses.length === 0) return null

  const onMarkSlot = async (supplementId: string, slotIndex: number) => {
    const supplement = active.find((s) => s.id === supplementId)
    if (!supplement) return
    const log = logs.find((l) => l.supplement_id === supplementId && l.logged_on === today)
    const existing = takenSlotsForLog(log)
    if (isSlotTaken(log, slotIndex)) return
    const nextSlots = [...existing, slotIndex]
    try {
      await logSupplement.mutateAsync({
        supplementId,
        loggedOn: today,
        takenSlots: nextSlots,
        doseCount: dosesPerDay(supplement),
      })
    } catch (error) {
      toastError(error, 'Could not log supplement')
    }
  }

  const dueNow = dueDoses.filter((d) => d.status === 'due')
  const upcoming = dueDoses.filter((d) => d.status === 'upcoming')

  return (
    <Card
      className={cn(
        'border-[color-mix(in_srgb,var(--color-accent)_40%,var(--color-border))]',
        className,
      )}
      data-testid="supplements-due-banner"
    >
      <CardContent className={compact ? 'p-4' : 'p-5'}>
        <div className="mb-3 flex items-center gap-2 text-[var(--color-accent)]">
          <Bell className="h-4 w-4" />
          <p className="text-sm font-semibold">Supplements due today</p>
        </div>

        {dueNow.length > 0 ? (
          <div className="mb-3 flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Due now</p>
            {dueNow.map((dose) => (
              <DoseRow
                key={`${dose.supplementId}-${dose.slotIndex}`}
                dose={dose}
                pending={logSupplement.isPending}
                onMark={() => onMarkSlot(dose.supplementId, dose.slotIndex)}
              />
            ))}
          </div>
        ) : null}

        {upcoming.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Upcoming</p>
            {upcoming.map((dose) => (
              <DoseRow
                key={`${dose.supplementId}-${dose.slotIndex}`}
                dose={dose}
                pending={logSupplement.isPending}
                onMark={() => onMarkSlot(dose.supplementId, dose.slotIndex)}
                upcoming
              />
            ))}
          </div>
        ) : null}

        {!compact ? (
          <Link to="/supplements" className="mt-3 inline-block text-xs text-[var(--color-primary)] hover:underline">
            View all supplements →
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DoseRow({
  dose,
  pending,
  onMark,
  upcoming = false,
}: {
  dose: {
    supplementName: string
    timeLabel: string
    dosageLabel: string
    minutesUntil: number
  }
  pending: boolean
  onMark: () => void
  upcoming?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--color-surface-2)] px-3 py-2">
      <div>
        <p className="text-sm font-medium text-[var(--color-fg)]">{dose.supplementName}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {dose.timeLabel}
          </span>
          <span>· {dose.dosageLabel}</span>
          {upcoming ? (
            <Badge variant="outline">in {dose.minutesUntil}m</Badge>
          ) : (
            <Badge variant="accent">Due now</Badge>
          )}
        </div>
      </div>
      <Button type="button" size="sm" variant="primary" disabled={pending} onClick={onMark}>
        <Check className="h-3.5 w-3.5" />
        Mark taken
      </Button>
    </div>
  )
}
