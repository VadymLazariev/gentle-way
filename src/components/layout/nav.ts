import { CalendarCheck, CalendarDays, ClipboardList, Dumbbell, LineChart, NotebookPen, Pill, Play, Ruler, Settings, Target, Users, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@/lib/types'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const clientNavItems: NavItem[] = [
  { to: '/', label: 'Today', icon: CalendarCheck, end: true },
  { to: '/nutrition', label: 'Nutrition', icon: UtensilsCrossed },
  { to: '/program', label: 'Program', icon: Dumbbell },
  { to: '/start', label: 'Start', icon: Play },
  { to: '/logbook', label: 'Logbook', icon: NotebookPen },
  { to: '/progress', label: 'Progress', icon: LineChart },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/supplements', label: 'Supplements', icon: Pill },
  { to: '/attendance', label: 'Attendance', icon: CalendarDays },
  { to: '/measurements', label: 'Body', icon: Ruler },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const coachNavItems: NavItem[] = [
  { to: '/coach/clients', label: 'Clients', icon: Users },
  { to: '/coach/programs', label: 'Programs', icon: Dumbbell },
  { to: '/coach/nutrition', label: 'Nutrition', icon: UtensilsCrossed },
  { to: '/coach/reports', label: 'Reports', icon: ClipboardList },
  { to: '/coach/analytics', label: 'Analytics', icon: LineChart },
]

export function navItemsForRole(role: Role): NavItem[] {
  switch (role) {
    case 'coach':
      return coachNavItems
    case 'client':
      return clientNavItems
    default: {
      const _exhaustive: never = role
      return _exhaustive
    }
  }
}
