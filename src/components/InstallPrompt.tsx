import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed'

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(DISMISS_KEY) === '1'
  })
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (isStandalone() || dismissed) return

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    if (isIos()) setShowIosHint(true)

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [dismissed])

  const onDismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, '1')
    setDeferredPrompt(null)
    setShowIosHint(false)
  }

  const onInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    onDismiss()
  }

  if (dismissed || isStandalone()) return null
  if (!deferredPrompt && !showIosHint) return null

  return (
    <div className="fixed inset-x-4 bottom-20 z-30 md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
          {showIosHint && !deferredPrompt ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-fg)]">Add to Home Screen</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {showIosHint && !deferredPrompt
              ? 'Tap Share, then "Add to Home Screen" to install this app.'
              : 'Install the app for quick access and offline support.'}
          </p>
          {deferredPrompt ? (
            <Button type="button" size="sm" className="mt-3" onClick={onInstall} data-testid="pwa-install-btn">
              Install
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
