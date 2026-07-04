import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, MoreHorizontal } from 'lucide-react'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { MobileMoreSheet } from '@/components/layout/MobileMoreSheet'
import { clientNavItems, moreNavItems, navItemMatchesPath, primaryNavItems } from '@/components/layout/nav'
import { InstallPrompt } from '@/components/InstallPrompt'
import { Toaster, toastError } from '@/components/ui/Toast'
import { useAuth } from '@/lib/auth/AuthProvider'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { signOut } = useAuth()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = moreNavItems.some((item) => navItemMatchesPath(item, location.pathname))

  const onSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      toastError(error)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 md:flex">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {clientNavItems.map((item) => (
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
              {item.label}
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
        <p className="mt-3 px-3 text-xs text-[var(--color-muted)]">Gentle Way · 52-week program</p>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
          <Brand />
        </header>

        <main className="flex-1 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More navigation"
          aria-expanded={moreOpen}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
            moreActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]',
          )}
        >
          <MoreHorizontal className="h-5 w-5 shrink-0" />
          <span className="truncate">More</span>
        </button>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onSignOut={onSignOut} />

      <Toaster />
      <InstallPrompt />
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandLogo className="h-9 w-9" />
      <div className="leading-tight">
        <p className="text-sm font-bold text-[var(--color-fg)]">Gentle Way</p>
        <p className="text-[11px] text-[var(--color-muted)]">52-week program</p>
      </div>
    </div>
  )
}
