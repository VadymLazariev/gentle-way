import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'

type ClientContextValue = {
  // The client whose data the app should read/write. A client always resolves to
  // their own auth.uid(); a coach resolves to whichever client they are viewing
  // (set via setViewingClientId), or undefined until one is chosen.
  clientId: string | undefined
  viewingClientId: string | null
  setViewingClientId: (clientId: string | null) => void
}

const ClientContext = createContext<ClientContextValue | null>(null)

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth()
  const [viewingClientId, setViewingClientId] = useState<string | null>(null)

  const clientId = useMemo(() => {
    if (viewingClientId) return viewingClientId
    if (role === 'client') return user?.id
    return undefined
  }, [viewingClientId, role, user?.id])

  const value = useMemo<ClientContextValue>(
    () => ({ clientId, viewingClientId, setViewingClientId }),
    [clientId, viewingClientId],
  )

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
}

function useClient(): ClientContextValue {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useClient must be used within a ClientProvider')
  return ctx
}

export function useClientId(): string | undefined {
  return useClient().clientId
}

export function useClientViewer(): {
  viewingClientId: string | null
  setViewingClientId: (clientId: string | null) => void
} {
  const { viewingClientId, setViewingClientId } = useClient()
  return { viewingClientId, setViewingClientId }
}
