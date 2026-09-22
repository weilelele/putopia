'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AdminNavItem {
  href: string
  label: string
  external?: boolean
}

interface AdminNavProps {
  items: AdminNavItem[]
}

export function AdminNav({ items }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <nav className="admin-archive-nav" aria-label="Administration sections">
      {items.map(({ href, label, external }) => {
        const active = !external && (pathname === href || pathname.startsWith(`${href}/`))
        if (external) {
          return (
            <a
              key={href}
              href={href}
              className="admin-tab"
              target="_blank"
              rel="noreferrer"
            >
              {label} ↗
            </a>
          )
        }
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
