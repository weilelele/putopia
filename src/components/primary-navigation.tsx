'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, FileText, Globe, Users } from 'lucide-react'
import { PRIMARY_NAV, ownerTab } from '@/lib/ui-navigation'
import SmartImage from './smart-image'
const DeviceMark = () => <SmartImage className="navigation-device-mark" src="/assets/vi-icon.png" alt="" width={28} height={22} sizes="28px" />
const icons = { LayoutDashboard, FileText, DeviceMark, Globe, Users }
export function PrimaryNavigation({ variant, activePath, onNavigate }: { variant: 'bottom' | 'sidebar'; activePath?: string; onNavigate?: (href: string) => void }) {
  const currentPath = usePathname()
  const settledPath = activePath ?? currentPath
  const [pendingNavigation, setPendingNavigation] = useState<{ from: string; to: string } | null>(null)
  const pendingPath = pendingNavigation?.from === settledPath ? pendingNavigation.to : null
  const path = pendingPath ?? settledPath
  return <nav className={variant === 'bottom' ? 'bottom-nav' : 'sidebar-nav'} aria-label="Primary navigation" aria-busy={pendingPath !== null}>
    {PRIMARY_NAV.map(item => {
      const Icon = icons[item.icon]
      const active = ownerTab(path) === item.href
      return <Link key={item.href} href={item.href} scroll={false} onClick={event => {
        if (settledPath === item.href) { event.preventDefault(); return }
        setPendingNavigation({ from: settledPath, to: item.href })
        if (onNavigate) { event.preventDefault(); onNavigate(item.href) }
      }}
        className={variant === 'bottom' ? `bottom-nav__item${active ? ' bottom-nav__item--active' : ''}` : `nav-item${active ? ' active' : ''}`}
        aria-current={active ? 'page' : undefined}>
        <Icon aria-hidden size={22} strokeWidth={1.5} /><span>{item.label}</span>
      </Link>
    })}
  </nav>
}
