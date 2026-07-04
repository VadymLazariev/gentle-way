import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/Feedback'
import {
  useCreateInjury,
  useDeleteInjury,
  useInjuries,
  useUpdateInjury,
} from '@/api/health'
import { BODY_AREA_LABEL, BODY_AREAS } from '@/lib/adjustments'
import type { BodyArea, Injury, InjurySeverity, InjuryStatus } from '@/lib/types'

const SEVERITIES: InjurySeverity[] = ['mild', 'moderate', 'severe']
const STATUSES: InjuryStatus[] = ['active', 'improving', 'resolved']
const SEVERITY_LABEL: Record<InjurySeverity, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
}
const STATUS_LABEL: Record<InjuryStatus, string> = {
  active: 'Active',
  improving: 'Improving',
  resolved: 'Resolved',
}

function statusVariant(status: InjuryStatus) {
  switch (status) {
    case 'active':
      return 'danger' as const
    case 'improving':
      return 'warning' as const
    case 'resolved':
      return 'success' as const
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function InjuriesSection() {
  const injuries = useInjuries()
  const create = useCreateInjury()
  const update = useUpdateInjury()
  const remove = useDeleteInjury()

  const [adding, setAdding] = useState(false)
  const [area, setArea] = useState<BodyArea>('knee')
  const [severity, setSeverity] = useState<InjurySeverity>('mild')

  const active = (injuries.data ?? []).filter((i) => i.status !== 'resolved')
  const resolved = (injuries.data ?? []).filter((i) => i.status === 'resolved')

  const onAdd = async () => {
    await create.mutateAsync({ body_area: area, severity, status: 'active' })
    setAdding(false)
    setArea('knee')
    setSeverity('mild')
  }

  return (
    <Card>
      <div className="flex items-center justify-between p-5 pb-0">
        <h3 className="text-base font-semibold leading-tight text-[var(--color-fg)]">Injuries</h3>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <CardContent className="flex flex-col gap-4 pt-4">
        {adding ? (
          <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-2)] p-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={area} onChange={(e) => setArea(e.target.value as BodyArea)}>
                {BODY_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {BODY_AREA_LABEL[a]}
                  </option>
                ))}
              </Select>
              <Select value={severity} onChange={(e) => setSeverity(e.target.value as InjurySeverity)}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={onAdd} disabled={create.isPending}>
                Add injury
              </Button>
            </div>
          </div>
        ) : null}

        {active.length === 0 && resolved.length === 0 ? (
          <EmptyState title="No injuries tracked" description="Add one here or during a check-in." />
        ) : null}

        {active.length > 0 ? (
          <div className="flex flex-col gap-2">
            {active.map((injury) => (
              <InjuryRow
                key={injury.id}
                injury={injury}
                onSeverity={(s) => update.mutate({ id: injury.id, severity: s })}
                onStatus={(s) => update.mutate({ id: injury.id, status: s })}
                onDelete={() => remove.mutate(injury.id)}
              />
            ))}
          </div>
        ) : null}

        {resolved.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Resolved
            </p>
            {resolved.map((injury) => (
              <InjuryRow
                key={injury.id}
                injury={injury}
                onSeverity={(s) => update.mutate({ id: injury.id, severity: s })}
                onStatus={(s) => update.mutate({ id: injury.id, status: s })}
                onDelete={() => remove.mutate(injury.id)}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function InjuryRow({
  injury,
  onSeverity,
  onStatus,
  onDelete,
}: {
  injury: Injury
  onSeverity: (s: InjurySeverity) => void
  onStatus: (s: InjuryStatus) => void
  onDelete: () => void
}) {
  const status = injury.status as InjuryStatus
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--color-surface-2)] p-3">
      <span className="font-medium text-[var(--color-fg)]">
        {BODY_AREA_LABEL[injury.body_area as BodyArea]}
      </span>
      <Badge variant={statusVariant(status)}>{STATUS_LABEL[status]}</Badge>
      <div className="ml-auto flex items-center gap-2">
        <Select
          value={injury.severity}
          onChange={(e) => onSeverity(e.target.value as InjurySeverity)}
          className="h-8 w-28 text-xs"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => onStatus(e.target.value as InjuryStatus)}
          className="h-8 w-28 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete injury"
          className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
