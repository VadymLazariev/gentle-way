import { cn } from '@/lib/utils'

type RingProps = {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  label?: string
  sublabel?: string
  className?: string
}

export function ProgressRing({
  value,
  max,
  size = 120,
  stroke = 10,
  color = 'var(--color-primary)',
  trackColor = 'var(--color-surface-2)',
  label,
  sublabel,
  className,
}: RingProps) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circumference * (1 - progress)

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label ? <p className="text-xl font-bold text-[var(--color-fg)]">{label}</p> : null}
        {sublabel ? <p className="text-xs text-[var(--color-muted)]">{sublabel}</p> : null}
      </div>
    </div>
  )
}

type MacroBarProps = {
  label: string
  consumed: number
  target: number
  unit?: string
  color: string
}

export function MacroBar({ label, consumed, target, unit = 'g', color }: MacroBarProps) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--color-fg)]">{label}</span>
        <span className="text-[var(--color-muted)]">
          {Math.round(consumed)}
          {unit} / {Math.round(target)}
          {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
