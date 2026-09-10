'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { hasGlobalNavigation } from '@/lib/ui-navigation'
import { PrimaryNavigation } from './primary-navigation'
import SmartImage from './smart-image'
import { ArchiveButton } from './archive-button'
export function Sidebar() {
  const path = usePathname()
  const { user, loading, logout } = useAuth()
  if (!hasGlobalNavigation(path)) return null
  const guest = user.role === 'guest'
  return <aside className="sidebar" aria-label="Workspace navigation" aria-busy={loading}>
    <Link href="/console" className="sidebar-logo" aria-label="Multiverse Collective · Dashboard"><SmartImage src="/assets/vi-icon.png" alt="" width={56} height={32} sizes="56px" /><SmartImage className="sidebar-wordmark" src="/assets/vi-wordmark.png" alt="Multiverse Collective" width={128} height={36} sizes="128px" /></Link>
    <PrimaryNavigation variant="sidebar" />
    <div className="sidebar-auth">
      {loading ? <p className="sidebar-auth-name">VERIFYING ACCESS</p> : <><div className="sidebar-identity">{!guest && <span className="sidebar-avatar">{user.avatarUrl ? <SmartImage src={user.avatarUrl} alt="" width={36} height={36} sizes="36px" /> : (user.name ?? 'Voyager').slice(0,2).toUpperCase()}</span>}<div><span className="sidebar-auth-name">{guest ? 'WELCOME, EXPLORER' : user.name ?? 'Voyager'}</span><span className="sidebar-auth-role">{user.role.toUpperCase()}</span></div></div>
      <div className="sidebar-account-actions"><Link className="sidebar-auth-btn" href={guest ? '/login' : '/voyagers'}>{guest ? 'LOG IN' : 'ACCOUNT'}</Link>{!guest && <ArchiveButton variant="ghost" onClick={() => logout()}>LOG OUT</ArchiveButton>}</div>
      {guest && <Link href="/new" className="sidebar-apply">REQUEST ACCESS</Link>}</>}
    </div>
  </aside>
}
