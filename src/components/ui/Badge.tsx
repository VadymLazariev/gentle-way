import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-surface-2)] text-[var(--color-muted)]',
        primary: 'bg-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] text-[var(--color-primary)]',
        accent: 'bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] text-[var(--color-accent)]',
        success: 'bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]',
        warning: 'bg-[color-mix(in_srgb,var(--color-warning)_18%,transparent)] text-[var(--color-warning)]',
        danger: 'bg-[color-mix(in_srgb,var(--color-danger)_20%,transparent)] text-[var(--color-danger)]',
        outline: 'border border-[var(--color-border)] text-[var(--color-muted)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
