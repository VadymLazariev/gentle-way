import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const RPE_MAX = 20
const QUICK_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

export function formatRpe(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function clampRpe(value: number): number {
  const stepped = Math.round(value * 2) / 2
  return Math.min(RPE_MAX, Math.max(0, stepped))
}

export function RpePicker({
  open,
  onClose,
  value,
  cap,
  onChange,
}: {
  open: boolean
  onClose: () => void
  value: number | null
  cap: number | null
  onChange: (rpe: number | null) => void
}) {
  const [draft, setDraft] = useState(value != null ? formatRpe(value) : '')

  useEffect(() => {
    if (open) setDraft(value != null ? formatRpe(value) : '')
  }, [open, value])

  const select = (next: number) => {
    onChange(next)
    onClose()
  }

  const step = (delta: number) => {
    const base = draft.trim() === '' ? 0 : Number(draft)
    const next = clampRpe((Number.isFinite(base) ? base : 0) + delta)
    setDraft(formatRpe(next))
    onChange(next)
  }

  const commitDraft = () => {
    const trimmed = draft.trim()
    if (trimmed === '') {
      onChange(null)
      onClose()
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) return
    const next = clampRpe(parsed)
    onChange(next)
    onClose()
  }

  const clear = () => {
    onChange(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="RPE"
      description="RPE measures how hard the set was — tap a value."
    >
      <div className="flex flex-wrap gap-2">
        {QUICK_VALUES.map((v) => {
          const active = value != null && value === v
          const overCap = cap != null && v > cap
          return (
            <button
              key={v}
              type="button"
              onClick={() => select(v)}
              className={cn(
                'flex-1 basis-16 rounded-xl py-3 text-sm font-semibold transition-colors',
                active
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                  : overCap
                    ? 'bg-[color-mix(in_srgb,var(--color-danger)_16%,transparent)] text-[var(--color-danger)] hover:brightness-110'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-fg)] hover:bg-[var(--color-border)]',
              )}
            >
              {formatRpe(v)}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Custom
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => step(-0.5)} aria-label="Decrease RPE">
            <Minus className="h-5 w-5" />
          </Button>
          <input
            inputMode="decimal"
            value={draft}
            placeholder="—"
            aria-label="Custom RPE value"
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ''))}
            className="h-10 min-w-0 flex-1 rounded-xl bg-[var(--color-surface-2)] text-center text-base font-semibold text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          <Button variant="secondary" size="icon" onClick={() => step(0.5)} aria-label="Increase RPE">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        {cap != null ? (
          <p className="mt-2 text-xs text-[var(--color-muted)]">Recommended cap RPE {formatRpe(cap)}.</p>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={clear}>
          Clear
        </Button>
        <Button variant="primary" className="flex-1" onClick={commitDraft}>
          Save
        </Button>
      </div>
    </Modal>
  )
}
