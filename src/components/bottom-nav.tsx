'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1"/>
    <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1"/>
    <path d="M9 1V4M9 14V17M1 9H4M14 9H17" stroke="currentColor" strokeWidth="1"/>
    <circle cx="9" cy="9" r="1" fill="currentColor"/>
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

const WorldsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1"/>
    <ellipse cx="9" cy="9" rx="4" ry="8" stroke="currentColor" strokeWidth="1"/>
    <line x1="1" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="1"/>
    <line x1="2.5" y1="5" x2="15.5" y2="5" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.6"/>
    <line x1="2.5" y1="13" x2="15.5" y2="13" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.6"/>
  </svg>
)

const VoyagersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1"/>
    <path d="M2 16c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
)

// Order: Voyagers and Worlds are swapped vs. the old layout — Worlds sits before
// Voyagers. The old "More" drawer is gone: Voting Hub now lives on the Intel page,
// World Records is a direct tab, and My Profile moved to the Voyagers page header.
const PRIMARY_NAV = [
  { href: '/console',  label: 'DASHBOARD', icon: <HomeIcon /> },
  { href: '/intel',    label: 'INTEL',     icon: <RadarIcon /> },
  { href: '/devices',  label: 'DEVICES',   icon: <ArchiveIcon /> },
  { href: '/worlds',   label: 'WORLDS',    icon: <WorldsIcon /> },
  { href: '/voyagers', label: 'VOYAGERS',  icon: <VoyagersIcon /> },
]

export function BottomNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { user } = useAuth()

  // /voyager-pack is a standalone long-scroll page — no nav needed there.
  // Return null AFTER all hooks so hook call order is consistent.
  const isVoyagerPack = pathname === '/voyager-pack'

  useEffect(() => {
    function handleMsg(e: MessageEvent) {
      if (e.data?.type === 'sheet-open') setSheetOpen(true)
      if (e.data?.type === 'sheet-close') setSheetOpen(false)
    }
    window.addEventListener('message', handleMsg)
    return () => window.removeEventListener('message', handleMsg)
  }, [])
  const isGuest = user.role === 'guest'

  if (isVoyagerPack) return null

  return (
    /* Primary nav bar — hidden when an iframe sheet is open (via postMessage) */
    <nav
      aria-label="Primary navigation"
      className="bottom-nav"
      hidden={sheetOpen}
    >
      {PRIMARY_NAV.map(({ href, label, icon }) => {
        const isHome = href === '/console'
        const isActive = isHome ? pathname === '/console' : pathname === href || pathname.startsWith(href + '/')
        const locked = isGuest && !isHome

        if (locked) {
          return (
            <Link
              key={href}
              href={`/login?redirect=${href}`}
              className="bottom-nav__item bottom-nav__item--locked"
              aria-label={`${label} — login required`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          )
        }

        return (
          <Link
            key={href}
            href={href}
            className={`bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {icon}
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
