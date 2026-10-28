'use client'

import { draftStorage, syncFeedDraftAccount } from '@/lib/feed-recovery'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { accessRole as parseAccessRole } from '@/lib/digital-access'
import type { UserRole } from '@/types/database'
import { allowsUnregisteredViewer, routeWithSearch } from '@/lib/access-policy'
import { clearClientDataCaches } from '@/lib/client-data-cache'

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
  const permissionScope = useRef('guest')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadProfile = useCallback(async (userId: string, email?: string) => {
    syncFeedDraftAccount(draftStorage(), userId)
    const version = ++requestVersion.current
    const supabase = createClient()
    const [{ data, error }, result] = await Promise.all([
      supabase.from('voyager_profiles').select('role, display_name, avatar_url, registered_at').eq('id', userId).single(),
      // No role fallback on missing migration, RPC failure or account switch.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc('effective_access_role'),
    ])
    if (version !== requestVersion.current) return
    const effectiveRole = result.error ? 'applicant' : parseAccessRole(result.data, true)
    const scope = `${userId}:${data?.role ?? 'applicant'}:${effectiveRole}`
    if (permissionScope.current !== scope) { clearClientDataCaches(); permissionScope.current = scope }
    setAccessRole(effectiveRole)
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
    let activeId: string | null | undefined
    let completedAt = 0
    let pending: Promise<void> | null = null
    let disposed = false
    const timers = new Set<ReturnType<typeof setTimeout>>()

    // INITIAL_SESSION supplies the initial read. A second getSession() raced
    // this event and fetched the same profile twice. Keep the callback sync:
    // start Supabase reads outside the SDK's auth notification lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user.id ?? null
      const changed = id !== activeId
      if (changed || !session) {
        requestVersion.current++
        clearClientDataCaches()
        permissionScope.current = 'guest'
        syncFeedDraftAccount(draftStorage(), id)
        activeId = id
        pending = null
        completedAt = 0
        setAccessRole('guest')
        setUser(GUEST)
        setLoading(Boolean(session))
      }
      if (!session) return
      // SIGNED_IN can fire again on window focus. Recheck periodically, but
      // do not turn an unchanged account into a full-page loading transition.
      if (pending && (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        requestVersion.current++
        pending = null
      }
      if (pending || (!changed && event === 'SIGNED_IN' && Date.now() - completedAt < 60_000)) return
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') clearClientDataCaches()
      const version = requestVersion.current
      const timer = setTimeout(() => {
        timers.delete(timer)
        if (disposed || version !== requestVersion.current) return
        const request = loadProfile(session.user.id, session.user.email)
        pending = request
        const profileVersion = requestVersion.current
        void request.catch(() => {
          if (disposed || profileVersion !== requestVersion.current) return
          clearClientDataCaches()
          setAccessRole('guest')
          setUser(GUEST)
        }).finally(() => {
          if (disposed || profileVersion !== requestVersion.current) return
          if (pending === request) pending = null
          completedAt = Date.now()
          setLoading(false)
        })
      }, 0)
      timers.add(timer)
    })
    return () => {
      disposed = true
      // eslint-disable-next-line react-hooks/exhaustive-deps -- This is a request generation counter, not a DOM ref; invalidate on cleanup.
      requestVersion.current++
      timers.forEach(clearTimeout)
      subscription.unsubscribe()
    }
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
    clearClientDataCaches()
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
