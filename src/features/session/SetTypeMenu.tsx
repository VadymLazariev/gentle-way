import { useEffect, useRef, useState } from 'react'
import { PersonStanding } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SET_TYPES, setTypeMeta } from '@/features/session/setTypes'
import type { SetType } from '@/lib/types'

export function SetTypeMenu({
  value,
  displayLabel,
  isBodyweight,
  onSelect,
  onToggleBodyweight,
  onRemove,
}: {
  value: SetType
  displayLabel: string
  isBodyweight?: boolean
  onSelect: (type: SetType) => void
  onToggleBodyweight?: () => void
  onRemove?: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const meta = setTypeMeta(value)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change set type"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
          meta.badgeClass,
        )}
      >
        {meta.letter || displayLabel}
      </button>

      {open ? (
        <div className="absolute left-0 top-9 z-30 w-40 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-xl">
          {SET_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                onSelect(t.value)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-2)]',
                t.value === value ? 'bg-[var(--color-surface-2)]' : '',
              )}
            >
              <span className={cn('w-4 text-center font-bold', t.textClass)}>
                {t.letter || '•'}
              </span>
              <span className="text-[var(--color-fg)]">{t.label}</span>
            </button>
          ))}
          {onToggleBodyweight ? (
            <button
              type="button"
              onClick={() => {
                onToggleBodyweight()
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 border-t border-[var(--color-border)] px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-2)]',
                isBodyweight ? 'bg-[var(--color-surface-2)]' : '',
              )}
            >
              <span className="w-4 text-center">
                <PersonStanding className="mx-auto h-4 w-4 text-[var(--color-accent)]" />
              </span>
              <span className="text-[var(--color-fg)]">
                {isBodyweight ? 'Bodyweight ✓' : 'Bodyweight'}
              </span>
            </button>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              onClick={() => {
                onRemove()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 border-t border-[var(--color-border)] px-3 py-2 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-surface-2)]"
            >
              <span className="w-4 text-center">×</span>
              Remove set
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
