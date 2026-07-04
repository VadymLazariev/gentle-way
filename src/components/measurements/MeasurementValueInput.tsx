import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MeasurementValueInputHandle = {
  getValue: () => number
}

type MeasurementValueInputProps = {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  decimals: number
  unit: string
  label: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function snap(value: number, min: number, step: number): number {
  const steps = Math.round((value - min) / step)
  return min + steps * step
}

function formatValue(value: number, decimals: number): string {
  return value.toFixed(decimals)
}

function parseDraft(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '' || normalized === '.') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export const MeasurementValueInput = forwardRef<MeasurementValueInputHandle, MeasurementValueInputProps>(
  function MeasurementValueInput({ value, onChange, min, max, step, decimals, unit, label }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [focused, setFocused] = useState(false)
    const [draft, setDraft] = useState(formatValue(value, decimals))

    const commitValue = useCallback(
      (raw: string): number => {
        const parsed = parseDraft(raw)
        const next = parsed != null
          ? snap(clamp(parsed, min, max), min, step)
          : snap(clamp(value, min, max), min, step)
        const formatted = formatValue(next, decimals)
        setDraft(formatted)
        if (next !== value) onChange(next)
        return next
      },
      [decimals, max, min, onChange, step, value],
    )

    useImperativeHandle(
      ref,
      () => ({
        getValue: () => {
          if (focused) {
            const parsed = parseDraft(draft)
            if (parsed != null) return snap(clamp(parsed, min, max), min, step)
          }
          return snap(clamp(value, min, max), min, step)
        },
      }),
      [draft, focused, max, min, step, value],
    )

    useEffect(() => {
      if (!focused) setDraft(formatValue(value, decimals))
    }, [decimals, focused, value])

    const focusInput = () => {
      setFocused(true)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }

    const adjust = (delta: number) => {
      const base = focused ? (parseDraft(draft) ?? value) : value
      const next = snap(clamp(base + delta, min, max), min, step)
      const formatted = formatValue(next, decimals)
      setDraft(formatted)
      onChange(next)
      if (focused) {
        requestAnimationFrame(() => inputRef.current?.select())
      }
    }

    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
          {label}
        </p>

        <div
          ref={containerRef}
          role="group"
          aria-label={`${label} in ${unit}`}
          className={cn(
            'w-full max-w-sm rounded-2xl border px-6 py-8 text-center transition-colors',
            focused
              ? 'border-[color-mix(in_srgb,var(--color-primary)_55%,var(--color-border))] bg-[var(--color-surface-2)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]',
          )}
          data-testid="measurement-value-display"
          onClick={(e) => {
            if (focused) return
            if ((e.target as HTMLElement).closest('[data-stepper]')) return
            focusInput()
          }}
        >
          <div className="relative flex min-h-[4.5rem] items-center justify-center sm:min-h-[5rem]">
            {focused ? (
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(',', '.'))}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  commitValue(draft)
                  setFocused(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitValue(draft)
                    inputRef.current?.blur()
                  }
                  if (e.key === 'Escape') {
                    setDraft(formatValue(value, decimals))
                    inputRef.current?.blur()
                  }
                }}
                className="w-full bg-transparent text-center text-5xl font-bold tabular-nums leading-none text-[var(--color-fg)] outline-none sm:text-6xl"
                aria-label={`${label} in ${unit}`}
                data-testid="measurement-value-input"
              />
            ) : (
              <p className="text-5xl font-bold tabular-nums leading-none text-[var(--color-fg)] sm:text-6xl">
                {formatValue(value, decimals)}
                <span className="ml-2 text-2xl font-medium text-[var(--color-muted)]">{unit}</span>
              </p>
            )}
          </div>

          {!focused ? (
            <p className="mt-3 text-xs text-[var(--color-muted)]">Tap to edit</p>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-3" data-stepper>
              <button
                type="button"
                aria-label={`Decrease ${label}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => adjust(-step)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))]"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[2.5rem] text-sm font-medium text-[var(--color-muted)]">{unit}</span>
              <button
                type="button"
                aria-label={`Increase ${label}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => adjust(step)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  },
)
