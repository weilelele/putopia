'use client'
import { useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { routeLabel, safeAppPath } from '@/lib/ui-navigation'
const subscribe = () => () => {}
export function BackLink({ href, label }: { href: string; label: string }) {
  const path = usePathname()
  const source = useSyncExternalStore(subscribe, () => { try { return safeAppPath(sessionStorage.getItem(`mc:from:${path}`), location.origin) } catch { return null } }, () => null)
  const target = source && source.split('?')[0] !== path ? source : href
  return <a href={target} className="archive-back-link"><ArrowLeft aria-hidden size={20} strokeWidth={1.5} />{source ? `Back to ${routeLabel(target.split('?')[0])}` : label}</a>
}
