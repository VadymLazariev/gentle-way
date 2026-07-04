import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'error' | 'success' | 'info'

type ToastItem = { id: number; message: string; variant: ToastVariant }

let counter = 0
let items: ToastItem[] = []
const listeners = new Set<(next: ToastItem[]) => void>()

function emit() {
  for (const listener of listeners) listener(items)
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export function toast(message: string, variant: ToastVariant = 'error') {
  const id = (counter += 1)
  items = [...items, { id, message, variant }]
  emit()
  window.setTimeout(() => dismiss(id), 5000)
}

function errorMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message || null
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string' && message.length > 0) return message
  }
  return null
}

export function toastError(error: unknown, fallback = 'Something went wrong') {
  toast(errorMessage(error) ?? fallback, 'error')
}

function variantMeta(variant: ToastVariant): { icon: LucideIcon; className: string } {
  switch (variant) {
    case 'error':
      return { icon: AlertCircle, className: 'text-[var(--color-danger)]' }
    case 'success':
      return { icon: CheckCircle2, className: 'text-[var(--color-success)]' }
    case 'info':
      return { icon: Info, className: 'text-[var(--color-primary)]' }
    default: {
      const _exhaustive: never = variant
      return _exhaustive
    }
  }
}

export function Toaster() {
  const [current, setCurrent] = useState<ToastItem[]>(items)

  useEffect(() => {
    listeners.add(setCurrent)
    return () => {
      listeners.delete(setCurrent)
    }
  }, [])

  if (current.length === 0) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
      {current.map((item) => {
        const { icon: Icon, className } = variantMeta(item.variant)
        return (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-xl"
          >
            <Icon className={cn('mt-0.5 h-4.5 w-4.5 shrink-0', className)} />
            <p className="flex-1 text-sm text-[var(--color-fg)]">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-0.5 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
