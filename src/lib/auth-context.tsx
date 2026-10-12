'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { accessRole as parseAccessRole } from '@/lib/digital-access'
import type { UserRole } from '@/types/database'
import { allowsUnregisteredViewer, routeWithSearch } from '@/lib/access-policy'

export type { UserRole }

export interface AuthUser {
  id?: string
  role: UserRole
  email?: string
  name?: string
  avatarUrl?: string | null
}

interface AuthContextType {
  user: AuthUser
  accessRole: UserRole
  isAtLeast: (role: UserRole) => boolean
  logout: () => Promise<void>
  loading: boolean
}

const ROLE_LEVELS: Record<UserRole, number> = {
  guest: 0,
  applicant: 1,
  voyager: 2,
  architect: 3,
}

const GUEST: AuthUser = { role: 'guest' }

const AuthContext = createContext<AuthContextType>({
  user: GUEST,
  accessRole: 'guest',
  isAtLeast: () => false,
  logout: async () => {},
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(GUEST)
  const [accessRole, setAccessRole] = useState<UserRole>('guest')
  const requestVersion = useRef(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadProfile = useCallback(async (userId: string, email?: string) => {
    const version = ++requestVersion.current
    setAccessRole('guest')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('voyager_profiles')
      .select('role, display_name, avatar_url, registered_at')
      .eq('id', userId)
      .single()

    // No role fallback on missing migration, RPC failure or account switch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase as any).rpc('effective_access_role')
    if (version !== requestVersion.current) return
    setAccessRole(result.error ? 'applicant' : parseAccessRole(result.data, true))
    setUser({
      id: userId,
      role: data?.role ?? 'applicant',
      email,
      name: data?.display_name ?? undefined,
      avatarUrl: data?.avatar_url ?? null,
    })

    // Client-side mirror of the proxy's registration gate. The proxy only sees
    // navigations, so a session that materialises purely client-side — GoTrue
    // redirecting a magic link to the site root with implicit-flow tokens in
    // the URL hash — parks an unregistered user on whatever page picked the
    // session up (the guest console) without ever hitting the gate.
    if (!error && !data?.registered_at) {
      const path = window.location.pathname
      const exempt = allowsUnregisteredViewer(path)
        || ['/register', '/auth'].some((p) => path === p || path.startsWith(p + '/'))
      if (!exempt) {
        const target = routeWithSearch(path, window.location.search)
        router.replace(`/register?redirect=${encodeURIComponent(target)}`)
      }
    }
  }, [router])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email).catch(() => setAccessRole('guest')).finally(() => setLoading(false))
      } else {
        requestVersion.current++
        setAccessRole('guest')
        setUser(GUEST)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setLoading(true)
        setAccessRole('guest')
        loadProfile(session.user.id, session.user.email).catch(() => setAccessRole('guest')).finally(() => setLoading(false))
      } else {
        requestVersion.current++
        setAccessRole('guest')
        setUser(GUEST)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const logout = useCallback(async () => {
    const supabase = createClient()
    try {
      const token = window.localStorage.getItem('mc_ios_push_token')
      if (token) {
        await fetch('/api/push/device', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
      }
    } catch {
      // Push cleanup must never prevent the user from signing out.
    }
    await supabase.auth.signOut()
    window.location.href = '/'
  }, [])

  const isAtLeast = useCallback((role: UserRole) => {
    if (loading && ROLE_LEVELS[role] >= 2) return false
    return ROLE_LEVELS[accessRole] >= ROLE_LEVELS[role]
  }, [accessRole, loading])

  return (
    <AuthContext.Provider value={{ user, accessRole, isAtLeast, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
