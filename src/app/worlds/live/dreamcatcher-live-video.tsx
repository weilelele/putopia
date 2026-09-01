'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import {
  advanceDreamcatcherPlayback,
  advanceDreamcatcherSteadyVideo,
  dreamcatcherReconnectDelay,
  syncDreamcatcherPlaybackToState,
  type DreamcatcherLivePhase,
  type DreamcatcherPlaybackCursor,
  type DreamcatcherLiveVideoLibrary,
} from '@/lib/dreamcatcher-live'
import styles from '../../live-observation-room.module.css'

export function DreamcatcherLiveVideo({
  library,
  working,
  fallbackImage,
  label,
}: {
  library: DreamcatcherLiveVideoLibrary | null
  working: boolean
  fallbackImage: string
  label: string
}) {
  const [cursor, setCursor] = useState<DreamcatcherPlaybackCursor>(() => ({
    phase: working ? 'working' : 'resting',
    index: 0,
    sequence: 0,
  }))
  const [reconnectingPhase, setReconnectingPhase] = useState<DreamcatcherLivePhase | null>(null)
  const libraryRef = useRef(library)

  const playbackCursor = syncDreamcatcherPlaybackToState(cursor, working, library)
  const active = library?.[playbackCursor.phase] ?? []
  const asset = active.length ? active[playbackCursor.index % active.length] : null
  const loopsContinuously = playbackCursor.phase === 'resting' || playbackCursor.phase === 'working'
  const poolSignature = active.map((item) => item.assetId).join(':')
  const reconnecting = reconnectingPhase === playbackCursor.phase
  const nextAsset = loopsContinuously && active.length > 1
    ? active[(playbackCursor.index + 1) % active.length]
    : null
  const nextAssetUrl = nextAsset?.url

  useEffect(() => {
    libraryRef.current = library
  }, [library])

  useEffect(() => {
    if (!nextAssetUrl) return

    const preload = document.createElement('video')
    preload.muted = true
    preload.preload = 'auto'
    preload.src = nextAssetUrl
    preload.load()

    return () => {
      preload.removeAttribute('src')
      preload.load()
    }
  }, [nextAssetUrl])

  useEffect(() => {
    if (!loopsContinuously || active.length < 2) return

    let disposed = false
    const timers = new Set<number>()

    function later(callback: () => void, delay: number) {
      const timer = window.setTimeout(() => {
        timers.delete(timer)
        if (!disposed) callback()
      }, delay)
      timers.add(timer)
    }

    function scheduleReconnect() {
      later(() => {
        setReconnectingPhase(playbackCursor.phase)
        later(() => {
          setCursor((current) => advanceDreamcatcherSteadyVideo(current, libraryRef.current))
        }, 380)
        later(() => {
          setReconnectingPhase(null)
          scheduleReconnect()
        }, 920)
      }, dreamcatcherReconnectDelay(Math.random()))
    }

    scheduleReconnect()
    return () => {
      disposed = true
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
    }
  }, [active.length, loopsContinuously, playbackCursor.phase, poolSignature])

  function advance() {
    setCursor(advanceDreamcatcherPlayback(playbackCursor, working, library))
  }

  if (!asset) {
    return <Image alt={label} fill loading="eager" sizes="(max-width: 768px) 100vw, 900px" src={fallbackImage} />
  }

  return (
    <div
      className={styles.signalFeed}
      data-asset-id={asset.assetId}
      data-reconnecting={reconnecting ? 'true' : 'false'}
      data-signal-filter="analog-interference"
      data-signal-phase={playbackCursor.phase}
    >
      <video
        aria-label={label}
        autoPlay
        className={styles.liveVideo}
        key={`${playbackCursor.phase}:${asset.assetId}:${playbackCursor.sequence}`}
        loop={loopsContinuously}
        muted
        onEnded={loopsContinuously ? undefined : advance}
        playsInline
        preload="auto"
        src={asset.url}
      />
      <span aria-live="polite" className={styles.signalNotice}>
        {reconnecting ? 'SIGNAL REACQUIRING' : null}
      </span>
    </div>
  )
}
