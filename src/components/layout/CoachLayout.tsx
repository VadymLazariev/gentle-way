import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { coachNavItems } from '@/components/layout/nav'
import { Toaster, toastError } from '@/components/ui/Toast'
import { useCoachInboxCount } from '@/api/cheatMeals'
import { useAuth } from '@/lib/auth/AuthProvider'
import { cn } from '@/lib/utils'

export function CoachLayout() {
  const { profile, signOut } = useAuth()
  const inboxCount = useCoachInboxCount()

  const onSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      toastError(error)
    }
  }

  const pendingCount = inboxCount.data ?? 0

  return (
    <div className="min-h-screen bg-[var(--color-bg)] md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 md:flex">
        <Brand name={profile?.name ?? 'Coaching workspace'} />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {coachNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[var(--color-primary)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]',
                )
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              <span className="flex-1">{item.label}</span>
              {item.to === '/coach/reports' && pendingCount > 0 ? (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-bold text-white"
                  data-testid="coach-inbox-badge"
                >
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
        >
          <LogOut className="h-4.5 w-4.5" />
          Sign out
        </button>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden">
          <Brand name={profile?.name ?? 'Coaching workspace'} />
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            className="rounded-lg p-2 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  )
}

function Brand({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandLogo className="h-9 w-9" />
      <div className="leading-tight">
        <p className="text-sm font-bold text-[var(--color-fg)]">Coach</p>
        <p className="max-w-[150px] truncate text-[11px] text-[var(--color-muted)]">{name}</p>
      </div>
    </div>
  )
}
