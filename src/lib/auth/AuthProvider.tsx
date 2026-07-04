import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { PostgrestError, Session, User } from '@supabase/supabase-js'
import { authCallbackUrl } from '@/lib/auth/redirect'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'
import type { Profile, Role } from '@/lib/types'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: Role | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUpCoach: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

function roleFromUser(user: User): Role {
  return user.user_metadata?.role === 'coach' ? 'coach' : 'client'
}

function nameFromUser(user: User): string | null {
  const meta = user.user_metadata
  if (typeof meta?.name === 'string') return meta.name
  if (typeof meta?.full_name === 'string') return meta.full_name
  return null
}

async function ensureProfile(user: User): Promise<Profile | null> {
  const existing = await fetchProfile(user.id)
  if (existing) return existing

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      role: roleFromUser(user),
      name: nameFromUser(user),
    })
    .select('*')
    .single()

  if (error) {
    const pgError = error as PostgrestError
    if (pgError.code === '23505') return fetchProfile(user.id)
    const retry = await fetchProfile(user.id)
    if (retry) return retry
    return null
  }
  return data
}

function roleOf(profile: Profile | null): Role | null {
  if (!profile) return null
  return profile.role === 'coach' ? 'coach' : 'client'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setProfile(null)
      return
    }
    try {
      setProfile(await ensureProfile(nextSession.user))
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (!active) return
        if (userError || !userData.user) {
          setSession(null)
          setProfile(null)
          const { data: stale } = await supabase.auth.getSession()
          if (stale.session) {
            await supabase.auth.signOut()
          }
          return
        }
        const { data } = await supabase.auth.getSession()
        if (!active) return
        setSession(data.session)
        await loadProfile(data.session)
      } finally {
        if (active) setLoading(false)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      queryClient.clear()
      void loadProfile(nextSession)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUpCoach = useCallback(async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authCallbackUrl('/login'),
        data: { role: 'coach', name },
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    queryClient.clear()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: roleOf(profile),
      loading,
      signIn,
      signUpCoach,
      signOut,
    }),
    [session, profile, loading, signIn, signUpCoach, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
