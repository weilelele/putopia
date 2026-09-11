'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FlipWordmark } from '@/components/flip-wordmark'
/** A launch surface, not a route guard: deep links retain their destination. */
export default function WelcomePage() {
  const router = useRouter()
  const entered = useRef(false)
  const [playbackComplete, setPlaybackComplete] = useState(false)
  const animationFinished = useCallback(() => setPlaybackComplete(true), [])
  const enter = useCallback(() => { if (entered.current) return; entered.current = true; router.replace('/console') }, [router])
  useEffect(() => { router.prefetch('/console') }, [router])
  useEffect(() => {
    if (!playbackComplete) return
    const timer = setTimeout(enter, 3000)
    return () => clearTimeout(timer)
  }, [enter, playbackComplete])
  return <main className="startup-screen" data-playback={playbackComplete ? 'complete' : 'playing'} role="button" tabIndex={0} aria-label="Enter Dashboard" onClick={enter} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); enter() } }}>
    <div className="startup-wordmark"><FlipWordmark maxWidth={520} fill={0.82} playbackRate={2} replayable={false} onPlaybackComplete={animationFinished} /></div>
    <Image className="startup-symbol" src="/assets/vi-icon.png" alt="" width={881} height={492} priority />
    <p>Tap anywhere to enter</p>
  </main>
}
