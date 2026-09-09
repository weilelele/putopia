'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Gamepad2, Globe, Users } from 'lucide-react'
import { PRIMARY_NAV, ownerTab } from '@/lib/ui-navigation'
const icons = { LayoutDashboard, FileText, Gamepad2, Globe, Users }
export function PrimaryNavigation({ variant, activePath, onNavigate }: { variant: 'bottom' | 'sidebar'; activePath?: string; onNavigate?: (href: string) => void }) {
  const currentPath = usePathname()
  const path = activePath ?? currentPath
  return <nav className={variant === 'bottom' ? 'bottom-nav' : 'sidebar-nav'} aria-label="Primary navigation">
    {PRIMARY_NAV.map(item => {
      const Icon = icons[item.icon]
      const active = ownerTab(path) === item.href
      return <Link key={item.href} href={item.href} scroll={false} onClick={event => { if (onNavigate) { event.preventDefault(); onNavigate(item.href) } else if (path === item.href) event.preventDefault() }}
        className={variant === 'bottom' ? `bottom-nav__item${active ? ' bottom-nav__item--active' : ''}` : `nav-item${active ? ' active' : ''}`}
        aria-current={active ? 'page' : undefined}>
        <Icon aria-hidden size={22} strokeWidth={1.5} /><span>{item.label}</span>
      </Link>
    })}
  </nav>
}
