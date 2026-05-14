'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth, UserRole } from '@/lib/auth-context'
import { RoleBadge } from './role-badge'
import clsx from 'clsx'
import {
  Radio,
  Cpu,
  BookOpen,
  Users,
  Vote,
  Globe,
  LogIn,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/intel', label: 'INTEL', icon: Radio },
  { href: '/devices', label: 'DEVICES', icon: Cpu },
  { href: '/logs', label: 'LOGS', icon: BookOpen },
  { href: '/voyagers', label: 'VOYAGERS', icon: Users },
  { href: '/vote', label: 'VOTE', icon: Vote },
  { href: '/worlds', label: 'WORLDS', icon: Globe },
]

const ROLES: UserRole[] = ['guest', 'applicant', 'voyager', 'architect']
const ROLE_LABELS: Record<UserRole, string> = {
  guest: 'GUEST',
  applicant: 'APPLICANT',
  voyager: 'VOYAGER',
  architect: 'ARCHITECT',
}

export function Nav() {
  const pathname = usePathname()
  const { user, setRole, logout } = useAuth()
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)

  return (
    <nav
      className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0"
      style={{
        background: '#120D00',
        borderRight: '1px solid #3D3010',
      }}
    >
      {/* Logo */}
      <div className="p-4 border-b" style={{ borderColor: '#3D3010' }}>
        <Link href="/" className="block">
          <div className="text-sm tracking-[0.2em] font-mono font-bold text-glow" style={{ color: '#7A6A40' }}>
            PUTOPIA
          </div>
          <div className="text-base tracking-[0.15em] font-mono font-bold text-glow" style={{ color: '#E8A020' }}>
            // COLLECTIVE
          </div>
        </Link>
        <div className="mt-2 h-px w-full" style={{ background: 'linear-gradient(to right, #E8A02044, transparent)' }} />
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-4 overflow-y-auto">
        <div className="px-4 mb-2 text-xs tracking-widest" style={{ color: '#5C4A1E' }}>
          — NAVIGATION —
        </div>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 mx-2 px-3 py-2 text-sm transition-all duration-150 group',
              )}
              style={
                isActive
                  ? { background: 'rgba(232,160,32,0.08)', borderLeft: '3px solid #E8A020', paddingLeft: '9px', color: '#E8A020' }
                  : { color: '#7A6A40', borderLeft: '3px solid transparent', paddingLeft: '9px' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(232,160,32,0.4)'
                  ;(e.currentTarget as HTMLElement).style.color = '#C4A96A'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = '#7A6A40'
                }
              }}
            >
              <Icon size={14} />
              <div className="text-xs tracking-widest font-mono">{label}</div>
            </Link>
          )
        })}
      </div>

      {/* Guest Apply CTA */}
      {user.role === 'guest' && (
        <div style={{ margin: '0 12px 12px', padding: '12px', border: '1px solid rgba(232,160,32,0.3)', background: 'rgba(232,160,32,0.04)' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: '#E8A020', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase' }}>◈ RECRUITMENT OPEN</div>
          <div style={{ fontSize: '0.72rem', color: '#F5E6C8', marginBottom: '10px', lineHeight: 1.4, fontFamily: 'inherit' }}>Voyager positions available. Apply for console access.</div>
          <Link href="/#apply" style={{ display: 'block', textAlign: 'center', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#0F0A00', background: '#E8A020', padding: '6px 0', fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit' }}>
            APPLY NOW
          </Link>
        </div>
      )}

      {/* Bottom section */}
      <div className="border-t p-3" style={{ borderColor: '#3D3010' }}>
        {/* Role info */}
        <div className="mb-3">
          <div className="text-[10px] tracking-widest mb-1" style={{ color: '#7A6A40' }}>CURRENT IDENTITY</div>
          <div className="flex items-center gap-2">
            <RoleBadge />
            {user.name && (
              <span className="text-xs truncate" style={{ color: '#7A6A40' }}>{user.name}</span>
            )}
          </div>
        </div>

        {/* Role switcher (prototype) */}
        <div className="mb-3">
          <div className="text-[10px] tracking-widest mb-1" style={{ color: '#E8A020' }}>
            ⚠ PROTO: SWITCH ROLE
          </div>
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded border font-mono"
              style={{ background: '#221800', borderColor: '#5C4A1E', color: '#F5E6C8' }}
            >
              {ROLE_LABELS[user.role]}
              <ChevronDown size={10} />
            </button>
            {showRoleSwitcher && (
              <div
                className="absolute bottom-full left-0 right-0 mb-1 rounded border overflow-hidden"
                style={{ background: '#2E2200', borderColor: '#5C4A1E' }}
              >
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r)
                      setShowRoleSwitcher(false)
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs font-mono transition-colors"
                    style={{
                      color: r === user.role ? '#E8A020' : '#7A6A40',
                      background: r === user.role ? 'rgba(232,160,32,0.1)' : 'transparent',
                    }}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auth actions */}
        {user.role === 'guest' ? (
          <Link
            href="/login"
            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded border font-mono transition-colors"
            style={{ borderColor: '#5C4A1E', color: '#7A6A40' }}
          >
            <LogIn size={12} />
            LOGIN
          </Link>
        ) : (
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded border font-mono transition-colors"
            style={{ borderColor: '#5C4A1E', color: '#7A6A40' }}
          >
            <LogOut size={12} />
            LOGOUT
          </button>
        )}
      </div>
    </nav>
  )
}
