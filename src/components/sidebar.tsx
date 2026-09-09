'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { hasGlobalNavigation } from '@/lib/ui-navigation'
import { PrimaryNavigation } from './primary-navigation'
export function Sidebar() {
  const path = usePathname()
  const { user, loading } = useAuth()
  if (!hasGlobalNavigation(path)) return null
  return <aside className="sidebar" aria-label="Workspace navigation">
    <PrimaryNavigation variant="sidebar" />
    <div className="sidebar-auth">{!loading && <Link className="sidebar-auth-btn" href={user.role === 'guest' ? '/login' : '/voyagers'}>{user.role === 'guest' ? 'Log in' : 'Account in Voyagers'}</Link>}</div>
  </aside>
}
