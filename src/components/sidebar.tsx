'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const navItems = [
  { href: '/console',   label: 'Dashboard',      icon: <IconStar /> },
  { href: '/intel',     label: 'Intel Feed',     icon: <IconMail /> },
  { href: '/devices',   label: 'Device Archive', icon: <IconDevice /> },
  { href: '/voyagers',  label: 'Voyagers',       icon: <IconUsers /> },
  { href: '/worlds',    label: 'World Records',  icon: <IconGlobe /> },
]

const LockIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
    <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4 5V3.5a2 2 0 1 1 4 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const isGuest = user.role === 'guest'

  const isActive = (href: string) =>
    href === '/console' ? pathname === '/console' : pathname === href || pathname.startsWith(href + '/')

  if (pathname.startsWith('/admin') || pathname.startsWith('/newsletter')) return null

  return (
    <aside className="sidebar" aria-label="Workspace navigation">
      <Link href="/console" className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
        <Image
          src="/assets/vi-icon.png"
          alt=""
          width={881}
          height={492}
          style={{ height: 36, width: 'auto', display: 'block', flexShrink: 0 }}
        />
        <Image
          src="/assets/vi-wordmark.png"
          alt="Multiverse Collective"
          width={3699}
          height={1020}
          preload
          style={{ height: 30, width: 'auto', display: 'block' }}
        />
      </Link>

      <nav className="sidebar-nav" aria-label="Primary">
        {navItems.map(({ href, label, icon }) => {
            const isDashboard = href === '/console'
            const locked = isGuest && !isDashboard

            if (locked) {
              return (
                <div
                  key={href}
                  className="nav-item"
                  title="Request access to unlock"
                  style={{ opacity: 0.28, cursor: 'default', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{icon}{label}</span>
                  <LockIcon />
                </div>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive(href) ? 'active' : ''}`}
                aria-current={isActive(href) ? 'page' : undefined}
              >
                {icon}
                {label}
              </Link>
            )
        })}
      </nav>

      {/* Auth block */}
      <div className="sidebar-auth">
        {user.role === 'guest' ? (
          <div className="sidebar-auth-name">UNKNOWN OPERATIVE</div>
        ) : (
          <Link href="/profile" className="sidebar-auth-name" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            {user.name ?? user.email ?? '—'}
          </Link>
        )}
        <div className="sidebar-auth-role">{user.role.toUpperCase()}</div>
        {user.role === 'guest' ? (
          <Link href="/login" className="sidebar-auth-btn">↗ LOGIN</Link>
        ) : (
          <button onClick={() => logout()} className="sidebar-auth-btn">↗ LOGOUT</button>
        )}
      </div>

      {user.role === 'guest' && (
        <Link href="/" className="sidebar-apply">REQUEST ACCESS</Link>
      )}

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
