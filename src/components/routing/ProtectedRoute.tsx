import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthProvider'
import { LoadingState } from '@/components/ui/Feedback'

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) return <LoadingState />
  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
