import { AlertTriangle, ArrowRight, CheckCircle2, MinusCircle, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { hasEffect } from '@/lib/adjustments'
import type { AdjustmentPlan, ExerciseAdjustment } from '@/lib/adjustments'

function actionBadge(adjustment: ExerciseAdjustment) {
  switch (adjustment.action) {
    case 'cap_rpe':
      return <Badge variant="accent">RPE capped{adjustment.rpeCap != null ? ` · ${adjustment.rpeCap}` : ''}</Badge>
    case 'swap':
      return <Badge variant="primary">Swapped</Badge>
    case 'skip':
      return <Badge variant="danger">Skipped</Badge>
    case 'keep':
      return null
    default: {
      const _exhaustive: never = adjustment.action
      return _exhaustive
    }
  }
}

function ActionIcon({ adjustment }: { adjustment: ExerciseAdjustment }) {
  switch (adjustment.action) {
    case 'swap':
      return <ArrowRight className="h-4 w-4 text-[var(--color-primary)]" />
    case 'skip':
      return <MinusCircle className="h-4 w-4 text-[var(--color-danger)]" />
    case 'cap_rpe':
      return <ShieldAlert className="h-4 w-4 text-[var(--color-accent)]" />
    case 'keep':
      return <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
    default: {
      const _exhaustive: never = adjustment.action
      return _exhaustive
    }
  }
}

export function AdjustmentList({ plan }: { plan: AdjustmentPlan }) {
  const changed = plan.adjustments.filter(hasEffect)

  return (
    <div className="flex flex-col gap-4">
      {plan.restRecommended ? (
        <Card className="border-[var(--color-danger)]">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]" />
            <div>
              <p className="font-semibold text-[var(--color-fg)]">Rest recommended</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{plan.restReason}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {changed.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-4 text-sm text-[var(--color-muted)]">
            <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
            No changes needed — you're cleared to train as planned.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-[var(--color-border)] p-0">
            {changed.map((adjustment) => (
              <div key={adjustment.prescriptionId} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5">
                  <ActionIcon adjustment={adjustment} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        adjustment.action === 'skip'
                          ? 'font-medium text-[var(--color-muted)] line-through'
                          : 'font-medium text-[var(--color-fg)]'
                      }
                    >
                      {adjustment.exercise}
                    </span>
                    {actionBadge(adjustment)}
                  </div>
                  {adjustment.action === 'swap' && adjustment.substitute ? (
                    <p className="mt-0.5 text-sm text-[var(--color-fg)]">→ {adjustment.substitute}</p>
                  ) : null}
                  {adjustment.reason ? (
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">{adjustment.reason}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
