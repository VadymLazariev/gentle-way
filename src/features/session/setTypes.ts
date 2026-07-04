import type { SetType } from '@/lib/types'

export type SetTypeMeta = {
  value: SetType
  label: string
  letter: string
  badgeClass: string
  textClass: string
}

export const SET_TYPES: SetTypeMeta[] = [
  {
    value: 'normal',
    label: 'Normal',
    letter: '',
    badgeClass: 'bg-[var(--color-surface-2)] text-[var(--color-fg)]',
    textClass: 'text-[var(--color-fg)]',
  },
  {
    value: 'warmup',
    label: 'Warm up',
    letter: 'W',
    badgeClass: 'bg-[color-mix(in_srgb,var(--color-accent)_22%,transparent)] text-[var(--color-accent)]',
    textClass: 'text-[var(--color-accent)]',
  },
  {
    value: 'drop',
    label: 'Drop set',
    letter: 'D',
    badgeClass: 'bg-violet-500/20 text-violet-400',
    textClass: 'text-violet-400',
  },
  {
    value: 'failure',
    label: 'Failure',
    letter: 'F',
    badgeClass: 'bg-[color-mix(in_srgb,var(--color-danger)_22%,transparent)] text-[var(--color-danger)]',
    textClass: 'text-[var(--color-danger)]',
  },
]

export function setTypeMeta(type: SetType): SetTypeMeta {
  const found = SET_TYPES.find((t) => t.value === type)
  return found ?? SET_TYPES[0]
}
