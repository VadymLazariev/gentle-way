import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Toaster, toastError } from '@/components/ui/Toast'
import { useAuth } from '@/lib/auth/AuthProvider'
import { AuthShell } from '@/features/auth/AuthShell'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate('/', { replace: true })
    } catch (error) {
      toastError(error, 'Could not sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      icon={<BrandLogo className="h-12 w-12" />}
      title="Welcome back"
      subtitle="Sign in to Gentle Way"
    >
      <Card>
        <CardContent className="pt-5">
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="mt-1 w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
            Coaching a team?{' '}
            <Link to="/signup" className="font-medium text-[var(--color-primary)] hover:underline">
              Create a coach account
            </Link>
          </p>
        </CardContent>
      </Card>
      <Toaster />
    </AuthShell>
  )
}
