'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import type { AuthUser } from '@/lib/auth-context'
import { RoleBadge } from './role-badge'
import SmartImage from './smart-image'

const RadarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1"/>
    <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    <line x1="9" y1="1" x2="9" y2="17" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.5"/>
    <line x1="1" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.5"/>
    <line x1="9" y1="9" x2="15" y2="3" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7"/>
  </svg>
)

const ArchiveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" rx="1" stroke="currentColor" strokeWidth="1"/>
    <rect x="5" y="5" width="8" height="8" rx="0.5" stroke="currentColor" strokeWidth="1"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
  </svg>
)

const LogsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="3" y="1" width="12" height="16" rx="1" stroke="currentColor" strokeWidth="1"/>
    <line x1="6" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1"/>
    <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1"/>
    <line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1"/>
  </svg>
)

const VoyagersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1"/>
    <path d="M2 16c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
)

const VoteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1"/>
    <polyline points="5,9 8,12 13,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const WorldsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1"/>
    <ellipse cx="9" cy="9" rx="4" ry="8" stroke="currentColor" strokeWidth="1"/>
    <line x1="1" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="1"/>
    <line x1="2.5" y1="5" x2="15.5" y2="5" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.6"/>
    <line x1="2.5" y1="13" x2="15.5" y2="13" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.6"/>
  </svg>
)

const LogInIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M8 4l2.5 2L8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="10.5" y1="6" x2="5" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

const LogOutIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M7 2h3a1 1 0 011 1v6a1 1 0 01-1 1H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M4 4L1.5 6 4 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="1.5" y1="6" x2="7" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

const ROLE_AVATAR_COLOR: Record<string, string> = {
  guest:     '#3D3010',
  applicant: '#E8A020',
  voyager:   '#C4A96A',
  architect: '#D4601A',
}

function Avatar({ user }: { user: AuthUser }) {
  const color = ROLE_AVATAR_COLOR[user.role] ?? 'rgba(245,245,245,0.35)'
  const initial = user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'
  return (
    <div
      className="flex items-center justify-center shrink-0 text-xs font-mono font-bold"
      style={{
        width: 28, height: 28,
        borderRadius: '50%',
        border: `1px solid ${color}`,
        color,
        background: `${color}18`,
        letterSpacing: 0,
      }}
    >
      {user.role === 'guest' ? '?' : initial}
    </div>
  )
}

const navLinks = [
  { href: '/intel',    label: 'INTEL',         icon: <RadarIcon /> },
  { href: '/devices',  label: 'DEVICE ARCHIVE', icon: <ArchiveIcon /> },
  { href: '/logs',     label: 'VOYAGER LOGS',   icon: <LogsIcon /> },
  { href: '/voyagers', label: 'VOYAGERS',       icon: <VoyagersIcon /> },
  { href: '/vote',     label: 'VOTING HUB',     icon: <VoteIcon /> },
  { href: '/worlds/live', label: 'WORLDS',       icon: <WorldsIcon /> },
]

export function Nav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <nav
      className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0"
      style={{ background: '#0F1430', borderRight: '1px solid rgba(227,82,5,0.16)' }}
    >
      {/* Logo */}
      <div className="p-4 border-b" style={{ borderColor: 'rgba(227,82,5,0.16)' }}>
        <Link href="/console" className="flex items-center">
          <SmartImage
            src="/assets/vi-wordmark.png"
            alt="Multiverse Collective"
            sizes="176px"
            width={176}
            height={49}
            preload
            style={{ width: '100%', maxWidth: '176px', height: 'auto', display: 'block' }}
          />
        </Link>
        <div className="mt-3 h-px w-full" style={{ background: 'linear-gradient(to right, rgba(200,68,6,0.5), transparent)' }} />
      </div>

      {/* Nav label */}
      <div className="px-4 pt-4 pb-1">
        <div className="text-xs tracking-[0.2em] font-mono" style={{ color: 'rgba(245,245,245,0.35)' }}>
          — NAVIGATION —
        </div>
      </div>

      {/* Nav Items */}
      <div className="py-1 overflow-y-auto">
        {navLinks.map(({ href, label, icon }) => {
          const isActive = href === '/worlds/live'
            ? pathname.startsWith('/worlds')
            : pathname === href || pathname.startsWith(href + '/')
          const isGuest = user.role === 'guest'
          const linkHref = isGuest ? `/login?redirect=${href}` : href
          return (
            <Link
              key={href}
              href={linkHref}
              className="flex items-center gap-3 mx-2 px-3 py-2.5 text-sm transition-all duration-150"
              style={
                isActive
                  ? { background: 'rgba(200,68,6,0.15)', borderLeft: '3px solid #C84406', paddingLeft: '9px', color: '#C84406' }
                  : { color: isGuest ? 'rgba(245,245,245,0.2)' : 'rgba(245,245,245,0.35)', borderLeft: '3px solid transparent', paddingLeft: '9px' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(200,68,6,0.4)'
                  ;(e.currentTarget as HTMLElement).style.color = isGuest ? 'rgba(245,245,245,0.4)' : 'rgba(245,245,245,0.55)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(200,68,6,0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = isGuest ? 'rgba(245,245,245,0.2)' : 'rgba(245,245,245,0.35)'
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }
              }}
            >
              <span style={{ flexShrink: 0 }}>{icon}</span>
              <span className="text-xs tracking-widest font-mono">{label}</span>
            </Link>
          )
        })}
      </div>

      {/* ── Current Identity ── */}
      <div className="mx-2 mt-3 mb-1 border p-3" style={{ borderColor: 'rgba(227,82,5,0.16)', background: '#151B3A' }}>
        {/* Row 1: avatar + name */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <Avatar user={user} />
          <span className="text-xs font-mono truncate leading-tight" style={{ color: '#F5F5F5' }}>
            {user.name ?? (user.role === 'guest' ? 'UNKNOWN OPERATIVE' : user.email ?? '—')}
          </span>
        </div>
        {/* Row 2: role badge + action */}
        <div className="flex items-center justify-between gap-2">
          <RoleBadge />
          {user.role === 'guest' ? (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono border transition-colors shrink-0"
              style={{ borderColor: 'rgba(227,82,5,0.16)', color: 'rgba(245,245,245,0.35)' }}
            >
              <LogInIcon />
              LOGIN
            </Link>
          ) : (
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono border transition-colors shrink-0"
              style={{ borderColor: 'rgba(227,82,5,0.16)', color: 'rgba(245,245,245,0.35)' }}
            >
              <LogOutIcon />
              LOGOUT
            </button>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Guest Apply CTA */}
      {user.role === 'guest' && (
        <div style={{ margin: '0 10px 12px' }}>
          <Link
            href="/new"
            style={{
              display: 'block', textAlign: 'center',
              fontSize: 'var(--fs-caption)', letterSpacing: '0.15em',
              color: '#F5F5F5',
              background: 'linear-gradient(135deg, #C84406, #C04000)',
              padding: '8px 0', fontWeight: 700,
              textDecoration: 'none', fontFamily: 'inherit',
              border: '1px solid rgba(200,68,6,0.5)',
            }}
          >
            BECOME A VOYAGER
          </Link>
        </div>
      )}
    </nav>
  )
}
