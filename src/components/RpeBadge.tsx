import { Badge } from '@/components/ui/Badge'
import { rpeTone } from '@/lib/program'

export function RpeBadge({ rpe, label }: { rpe: number | null; label?: string }) {
  if (rpe === null) return null
  const tone = rpeTone(rpe)
  const variant = tone === 'high' ? 'danger' : tone === 'mid' ? 'warning' : 'success'
  return (
    <Badge variant={variant}>
      {label ?? 'RPE'} {rpe}
    </Badge>
  )
}

export function RpeTextBadge({ value }: { value: string | null }) {
  if (!value) return null
  const first = Number.parseFloat(value)
  const tone = Number.isFinite(first) ? rpeTone(first) : 'low'
  const variant = tone === 'high' ? 'danger' : tone === 'mid' ? 'warning' : 'success'
  return <Badge variant={variant}>RPE {value}</Badge>
}
