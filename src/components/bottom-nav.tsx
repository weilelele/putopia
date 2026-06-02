'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
    <path d="M2 8L9 2L16 8V16H11V12H7V16H2V8Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
  </svg>
)

const RadarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1"/>
    <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    <line x1="9" y1="1" x2="9" y2="17" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.5"/>
    <line x1="1" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.5"/>
    <line x1="9" y1="9" x2="15" y2="3" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7"/>
  </svg>
)

const ArchiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" rx="1" stroke="currentColor" strokeWidth="1"/>
    <rect x="5" y="5" width="8" height="8" rx="0.5" stroke="currentColor" strokeWidth="1"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
  </svg>
)

const LogsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
    <rect x="3" y="1" width="12" height="16" rx="1" stroke="currentColor" strokeWidth="1"/>
    <line x1="6" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1"/>
    <line x1="6" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1"/>
    <line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1"/>
  </svg>
)

const VoyagersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1"/>
    <path d="M2 16c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
)

const VoteIcon = () => (
  <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1"/>
    <polyline points="5,9 8,12 13,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const WorldsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1"/>
    <ellipse cx="9" cy="9" rx="4" ry="8" stroke="currentColor" strokeWidth="1"/>
    <line x1="1" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="1"/>
    <line x1="2.5" y1="5" x2="15.5" y2="5" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.6"/>
    <line x1="2.5" y1="13" x2="15.5" y2="13" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.6"/>
  </svg>
)

const DotsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="4" r="1.5" fill="currentColor"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    <circle cx="9" cy="14" r="1.5" fill="currentColor"/>
  </svg>
)

const PRIMARY_NAV = [
  { href: '/console', label: 'HOME',     icon: <HomeIcon /> },
  { href: '/intel',   label: 'INTEL',    icon: <RadarIcon /> },
  { href: '/devices', label: 'DEVICES',  icon: <ArchiveIcon /> },
  { href: '/logs',    label: 'LOGS',     icon: <LogsIcon /> },
  { href: '/voyagers',label: 'VOYAGERS', icon: <VoyagersIcon /> },
]

const MORE_NAV = [
  { href: '/vote',   label: 'VOTING HUB',     icon: <VoteIcon /> },
  { href: '/worlds', label: 'WORLD RECORDS',  icon: <WorldsIcon /> },
]

export function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const { user } = useAuth()
  const isGuest = user.role === 'guest'

  const isMoreActive = MORE_NAV.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      {/* More drawer — slides up from bottom */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="fixed bottom-[57px] left-0 right-0 z-50 md:hidden border-t"
            style={{ background: '#0D1020', borderColor: 'rgba(255,107,53,0.16)' }}
          >
            {MORE_NAV.map(({ href, label, icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              if (isGuest) {
                return (
                  <div
                    key={href}
                    className="flex items-center gap-4 px-6 py-4"
                    style={{ color: '#2A3248', borderBottom: '1px solid rgba(255,107,53,0.16)', cursor: 'default' }}
                  >
                    {icon}
                    <span className="font-mono text-xs tracking-widest">{label}</span>
                  </div>
                )
              }
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-4 px-6 py-4 transition-all"
                  style={{
                    color: isActive ? '#E85A00' : '#4A5570',
                    background: isActive ? 'rgba(232,90,0,0.06)' : 'transparent',
                    borderBottom: '1px solid rgba(255,107,53,0.16)',
                  }}
                >
                  {icon}
                  <span className="font-mono text-xs tracking-widest">{label}</span>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {/* Primary nav bar */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 border-t z-50"
        style={{ background: '#0D1020', borderColor: 'rgba(255,107,53,0.16)' }}
      >
        {PRIMARY_NAV.map(({ href, label, icon }) => {
          const isHome = href === '/console'
          const isActive = isHome ? pathname === '/console' : pathname === href || pathname.startsWith(href + '/')
          const locked = isGuest && !isHome

          if (locked) {
            return (
              <div
                key={href}
                className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5"
                style={{ color: '#1E2838', cursor: 'default' }}
              >
                {icon}
                <span className="font-mono" style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.06em' }}>{label}</span>
              </div>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-all duration-150"
              style={{
                color: isActive ? '#E85A00' : '#4A5570',
                background: isActive ? 'rgba(232,90,0,0.08)' : 'transparent',
              }}
            >
              {icon}
              <span className="font-mono" style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.06em' }}>{label}</span>
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-all duration-150"
          style={{
            color: isMoreActive || moreOpen ? '#E85A00' : '#4A5570',
            background: isMoreActive || moreOpen ? 'rgba(232,90,0,0.08)' : 'transparent',
          }}
        >
          <DotsIcon />
          <span className="font-mono" style={{ fontSize: 'var(--fs-caption)', letterSpacing: '0.06em' }}>MORE</span>
        </button>
      </nav>
    </>
  )
}
