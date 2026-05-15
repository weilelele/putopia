'use client'

import { createClient } from '@/lib/supabase/client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { UserRole } from '@/types/database'

export type { UserRole }

export interface AuthUser {
  id?: string
  role: UserRole
  email?: string
  name?: string
}

interface AuthContextType {
  user: AuthUser
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
  isAtLeast: () => false,
  logout: async () => {},
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(GUEST)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string, email?: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('voyager_profiles')
      .select('role, display_name')
      .eq('id', userId)
      .single()

    setUser({
      id: userId,
      role: data?.role ?? 'applicant',
      email,
      name: data?.display_name ?? undefined,
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email).finally(() => setLoading(false))
      } else {
        setUser(GUEST)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email).finally(() => setLoading(false))
      } else {
        setUser(GUEST)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(GUEST)
  }, [])

  const isAtLeast = useCallback((role: UserRole) => {
    return ROLE_LEVELS[user.role] >= ROLE_LEVELS[role]
  }, [user.role])

  return (
    <AuthContext.Provider value={{ user, isAtLeast, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
