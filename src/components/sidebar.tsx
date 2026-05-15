'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const navItems = [
  {
    group: 'Console',
    items: [
      { href: '/',         label: 'Dashboard',      icon: <IconStar /> },
      { href: '/intel',    label: 'Intel Feed',      icon: <IconMail /> },
      { href: '/devices',  label: 'Device Archive',  icon: <IconDevice /> },
    ],
  },
  {
    group: 'Network',
    items: [
      { href: '/voyagers', label: 'Voyagers',        icon: <IconUsers /> },
      { href: '/worlds',   label: 'World Records',   icon: <IconGlobe /> },
      { href: '/vote',     label: 'Voting Hub',      icon: <IconVote /> },
      { href: '/logs',     label: 'Voyager Logs',    icon: <IconDoc /> },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/putopia-logo.png" alt="Putopia Collective" />
      </div>

      {navItems.map(({ group, items }) => (
        <div key={group}>
          <div className="nav-label">// {group}</div>
          {items.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive(href) ? 'active' : ''}`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>
      ))}

      {/* Auth block */}
      <div className="sidebar-auth">
        <div className="sidebar-auth-name">
          {user.name ?? (user.role === 'guest' ? 'UNKNOWN OPERATIVE' : user.email ?? '—')}
        </div>
        <div className="sidebar-auth-role">{user.role.toUpperCase()}</div>
        {user.role === 'guest' ? (
          <Link href="/login" className="sidebar-auth-btn">↗ LOGIN</Link>
        ) : (
          <button onClick={() => logout()} className="sidebar-auth-btn">↗ LOGOUT</button>
        )}
      </div>

      {user.role === 'guest' && (
        <Link href="/#apply" className="sidebar-apply">BECOME A VOYAGER</Link>
      )}

      <div className="sidebar-status">
        <div>
          <div className="lbl-1">SYSTEM STATUS</div>
          <div className="lbl-2">ALL NOMINAL</div>
        </div>
        <div className="led" />
      </div>
    </aside>
  )
}

/* ── Icons ── */
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 } as const

function IconStar()   { return <svg className="nav-icon" viewBox="0 0 24 24" {...stroke}><path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.5" /></svg> }
function IconMail()   { return <svg className="nav-icon" viewBox="0 0 24 24" {...stroke}><path d="M3 6 L12 13 L21 6" /><rect x="3" y="5" width="18" height="14" rx="1" /></svg> }
function IconDevice() { return <svg className="nav-icon" viewBox="0 0 24 24" {...stroke}><rect x="3" y="5" width="18" height="14" rx="1" /><line x1="3" y1="9" x2="21" y2="9" /><circle cx="7" cy="7" r="0.7" fill="currentColor" /></svg> }
function IconUsers()  { return <svg className="nav-icon" viewBox="0 0 24 24" {...stroke}><circle cx="9" cy="8" r="3.5" /><path d="M2 21 a7 7 0 0 1 14 0" /><circle cx="17" cy="10" r="2.5" /><path d="M22 21 a5 5 0 0 0 -6 -4.5" /></svg> }
function IconGlobe()  { return <svg className="nav-icon" viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M3 12 H21" /><path d="M12 3 C 15 6, 15 18, 12 21" /><path d="M12 3 C 9 6, 9 18, 12 21" /></svg> }
function IconVote()   { return <svg className="nav-icon" viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M8 12.5 L11 15.5 L16.5 9.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function IconDoc()    { return <svg className="nav-icon" viewBox="0 0 24 24" {...stroke}><path d="M5 3 H19 V21 H7 a2 2 0 0 1 -2 -2 V3 Z" /><line x1="9" y1="8" x2="16" y2="8" /><line x1="9" y1="12" x2="16" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg> }
