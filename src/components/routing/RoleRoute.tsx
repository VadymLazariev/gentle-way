import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthProvider'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import type { Role } from '@/lib/types'

export function homePathForRole(role: Role): string {
  switch (role) {
    case 'coach':
      return '/coach'
    case 'client':
      return '/'
    default: {
      const _exhaustive: never = role
      return _exhaustive
    }
  }
}

export function RoleRoute({ allow }: { allow: Role }) {
  const { role, loading } = useAuth()

  if (loading) return <LoadingState />
  if (!role) {
    return (
      <ErrorState message="We couldn't load your account profile. Try signing out and back in." />
    )
  }
  if (role !== allow) return <Navigate to={homePathForRole(role)} replace />

  return <Outlet />
}
