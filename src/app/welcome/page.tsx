'use client'
import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FlipWordmark } from '@/components/flip-wordmark'
/** A launch surface, not a route guard: deep links retain their destination. */
export default function WelcomePage() {
  const router = useRouter()
  const entered = useRef(false)
  const enter = useCallback(() => { if (entered.current) return; entered.current = true; router.replace('/console') }, [router])
  useEffect(() => { router.prefetch('/console'); const timer = setTimeout(enter, 3000); return () => clearTimeout(timer) }, [enter, router])
  return <main className="startup-screen" role="button" tabIndex={0} aria-label="Enter Dashboard" onClick={enter} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); enter() } }}>
    <div className="startup-wordmark"><FlipWordmark maxWidth={600} playbackRate={2} replayable={false} /></div>
    <p>Tap anywhere to enter</p>
  </main>
}
