'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { hasGlobalNavigation } from '@/lib/ui-navigation'
import { PrimaryNavigation } from './primary-navigation'
export function BottomNav() {
  const path = usePathname()
  const [covered, setCovered] = useState(false)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => { if (event.origin === location.origin && event.data?.type === 'sheet-open') setCovered(true); if (event.origin === location.origin && event.data?.type === 'sheet-close') setCovered(false) }
    const viewport = window.visualViewport
    const resize = () => {
      const input = document.activeElement?.matches('input,textarea,[contenteditable="true"]')
      document.documentElement.dataset.keyboard = input && viewport && window.innerHeight - viewport.height > 150 ? 'open' : 'closed'
    }
    window.addEventListener('message', onMessage)
    viewport?.addEventListener('resize', resize)
    document.addEventListener('focusin', resize); document.addEventListener('focusout', resize)
    return () => { window.removeEventListener('message', onMessage); viewport?.removeEventListener('resize', resize); document.removeEventListener('focusin', resize); document.removeEventListener('focusout', resize) }
  }, [])
  if (!hasGlobalNavigation(path) || covered) return null
  return <PrimaryNavigation variant="bottom" />
}
