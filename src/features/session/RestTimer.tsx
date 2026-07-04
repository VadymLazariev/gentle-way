import { useEffect, useState } from 'react'
import { Timer, X } from 'lucide-react'
import { formatDuration } from '@/lib/prescription'

export function RestTimer({
  seconds,
  startedAt,
  onDismiss,
}: {
  seconds: number
  startedAt: number
  onDismiss: () => void
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [startedAt])

  const elapsed = Math.floor((now - startedAt) / 1000)
  const remaining = seconds - elapsed
  const done = remaining <= 0

  useEffect(() => {
    if (!done) return
    const id = window.setTimeout(onDismiss, 1500)
    return () => window.clearTimeout(id)
  }, [done, onDismiss])

  const pct = Math.max(0, Math.min(100, (remaining / seconds) * 100))

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-16 z-30 mx-auto w-full max-w-md px-4 md:bottom-4">
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-fg)]">
            <Timer className="h-4 w-4 text-[var(--color-primary)]" />
            {done ? 'Rest complete' : `Rest ${formatDuration(Math.max(0, remaining))}`}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Skip rest"
            className="rounded-md p-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 w-full bg-[var(--color-surface-2)]">
          <div
            className="h-full bg-[var(--color-primary)] transition-[width] duration-200 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
