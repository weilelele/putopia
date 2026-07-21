'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AdminNavItem {
  href: string
  label: string
}

interface AdminNavProps {
  items: AdminNavItem[]
}

export function AdminNav({ items }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <nav className="admin-archive-nav" aria-label="Administration sections">
      {items.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={`admin-tab${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
