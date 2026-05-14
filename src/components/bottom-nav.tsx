'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Radio, Cpu, BookOpen, Users, Vote } from 'lucide-react'

const BOTTOM_NAV_ITEMS = [
  { href: '/intel', label: 'INTEL', icon: Radio },
  { href: '/devices', label: 'DEVICES', icon: Cpu },
  { href: '/logs', label: 'LOGS', icon: BookOpen },
  { href: '/voyagers', label: 'VOYAGERS', icon: Users },
  { href: '/vote', label: 'VOTE', icon: Vote },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex md:hidden fixed bottom-0 left-0 right-0 border-t z-50"
      style={{
        background: '#1A1200',
        borderColor: '#5C4A1E',
      }}
    >
      {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-all duration-150"
            style={{
              color: isActive ? '#E8A020' : '#7A6A40',
              background: isActive ? 'rgba(232,160,32,0.08)' : 'transparent',
            }}
          >
            <Icon size={18} />
            <span className="text-[9px] tracking-widest font-mono">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
