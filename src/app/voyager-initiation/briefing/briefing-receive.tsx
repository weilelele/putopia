'use client'

import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { FlipWordmark } from '@/components/flip-wordmark'
import { briefingReceiveOutcome, type BriefingReceiveOutcome } from '@/lib/initiation-briefing'
import { useScene } from './briefing-kit'
import { clipReady, clipSettled, prefetchClip } from './briefing-media'
import { OPENING_FILM } from './briefing-pages'
import s from './briefing.module.css'

export type BriefingReceived = { outcome: BriefingReceiveOutcome; wait_ms: number; cached: boolean }

/** How long this screen fades over page 1; the briefing keeps it mounted for as long. */
export const RECEIVE_LEAVE_MS = 360

/**
 * 0 · Before page 1: the launch wordmark keeps shuffling until page 1's film is downloaded, then settles, spreads and
 * hands over to page 1, so the briefing never opens on an empty frame.
 */
export function ReceivingScreen({ leaving, onReceived }: { leaving: boolean; onReceived: (received: BriefingReceived) => void }) {
  const [received, setReceived] = useState<BriefingReceived | null>(null)
  const [played, setPlayed] = useState(false)
  const markPlayed = useCallback(() => setPlayed(true), [])
  const deliver = useEffectEvent((details: BriefingReceived) => onReceived(details))
  // Reduced motion shows the still wordmark at once, so either can finish first.
  useEffect(() => { if (played && received) deliver(received) }, [played, received])

  useScene(true, scene => {
    const cached = clipReady(OPENING_FILM)
    void prefetchClip(OPENING_FILM)
    let done = false
    scene.loop(t => {
      if (done) return
      const outcome = briefingReceiveOutcome({ elapsedMs: t, ready: clipReady(OPENING_FILM), settled: clipSettled(OPENING_FILM) })
      if (!outcome) return
      done = true
      setReceived({ outcome, wait_ms: Math.round(t), cached })
    })
  })

  return <section className={s.receive} data-leaving={leaving || undefined} aria-label="Receiving the briefing" aria-busy={!leaving}>
    <FlipWordmark maxWidth={420} fill={0.88} playbackRate={2} replayable={false} hold={!received} onPlaybackComplete={markPlayed} />
  </section>
}
