import type { ReactNode } from 'react'

export function AuthShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl">
            {icon}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-fg)]">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
