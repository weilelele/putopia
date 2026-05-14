'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'guest' | 'applicant' | 'voyager' | 'architect'

export interface AuthUser {
  role: UserRole
  email?: string
  name?: string
  voyagerId?: string
}

interface AuthContextType {
  user: AuthUser
  setRole: (role: UserRole) => void
  login: (email: string, name?: string) => void
  logout: () => void
  isAtLeast: (role: UserRole) => boolean
}

const ROLE_LEVELS: Record<UserRole, number> = {
  guest: 0,
  applicant: 1,
  voyager: 2,
  architect: 3,
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>({ role: 'guest' })

  useEffect(() => {
    const stored = localStorage.getItem('putopia_auth')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        // ignore
      }
    }
  }, [])

  const persist = (u: AuthUser) => {
    setUser(u)
    localStorage.setItem('putopia_auth', JSON.stringify(u))
  }

  const setRole = (role: UserRole) => {
    persist({ ...user, role })
  }

  const login = (email: string, name?: string) => {
    // Mock: determine role from email
    let role: UserRole = 'voyager'
    if (email.includes('architect')) role = 'architect'
    persist({ role, email, name: name ?? email.split('@')[0] })
  }

  const logout = () => {
    localStorage.removeItem('putopia_auth')
    setUser({ role: 'guest' })
  }

  const isAtLeast = (role: UserRole) => {
    return ROLE_LEVELS[user.role] >= ROLE_LEVELS[role]
  }

  return (
    <AuthContext.Provider value={{ user, setRole, login, logout, isAtLeast }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
