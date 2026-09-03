'use client'

import Image from 'next/image'
import { memo, useEffect, useRef, useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import {
  advanceDreamcatcherPlayback,
  advanceDreamcatcherSteadyVideo,
  dreamcatcherReconnectDelay,
  syncDreamcatcherPlaybackToState,
  type DreamcatcherLivePhase,
  type DreamcatcherLiveVideoLibrary,
  type DreamcatcherPlaybackCursor,
} from '@/lib/dreamcatcher-live'
import styles from '../../live-observation-room.module.css'
import playerStyles from './dreamcatcher-live-video.module.css'

type Props = {
  library: DreamcatcherLiveVideoLibrary | null
  working: boolean
  fallbackImage: string
  label: string
}

/** The room clock ticks independently; it must not restart the current clip. */
export const DreamcatcherLiveVideo = memo(function DreamcatcherLiveVideo({
  library, working, fallbackImage, label,
}: Props) {
  const [cursor, setCursor] = useState<DreamcatcherPlaybackCursor>({
    phase: working ? 'working' : 'resting', index: 0, sequence: 0,
  })
  const [reconnectingPhase, setReconnectingPhase] = useState<DreamcatcherLivePhase | null>(null)
  const [paused, setPaused] = useState(false)
  const libraryRef = useRef(library)
  useEffect(() => { libraryRef.current = library }, [library])

  // Persist the transition cursor. A merely derived cursor would forget an
  // in-flight transition when status changes again or a reconnect timer runs.
  const synced = syncDreamcatcherPlaybackToState(cursor, working, library)
  if (synced !== cursor) setCursor(synced)
  if (reconnectingPhase && (reconnectingPhase !== synced.phase || paused)) setReconnectingPhase(null)

  const { phase } = synced
  const pool = library?.[phase] ?? []
  const asset = pool.length ? pool[synced.index % pool.length] : null
  const steady = phase === 'resting' || phase === 'working'
  const poolSignature = pool.map((item) => item.assetId).join(':')
  const nextUrl = steady && pool.length > 1 ? pool[(synced.index + 1) % pool.length].url : null

  useEffect(() => {
    if (!nextUrl) return
    const preload = document.createElement('video')
    preload.muted = true
    preload.preload = 'auto'
    preload.src = nextUrl
    preload.load()
    return () => { preload.removeAttribute('src'); preload.load() }
  }, [nextUrl])

  useEffect(() => {
    if (!steady || pool.length < 2 || paused) return
    let timer: ReturnType<typeof setTimeout>
    let swap: ReturnType<typeof setTimeout> | undefined
    let finish: ReturnType<typeof setTimeout> | undefined
    function schedule() {
      timer = setTimeout(() => {
        if (document.visibilityState !== 'visible') { schedule(); return }
        setReconnectingPhase(phase)
        swap = setTimeout(() => setCursor((current) => (
          current.phase === phase ? advanceDreamcatcherSteadyVideo(current, libraryRef.current) : current
        )), 380)
        finish = setTimeout(() => { setReconnectingPhase(null); schedule() }, 920)
      }, dreamcatcherReconnectDelay(Math.random()))
    }
    schedule()
    return () => { clearTimeout(timer); clearTimeout(swap); clearTimeout(finish) }
  }, [phase, steady, pool.length, poolSignature, paused])

  return (
    <div className={`${styles.signalFeed} ${paused ? playerStyles.paused : ''}`} data-asset-id={asset?.assetId}
      data-reconnecting={reconnectingPhase === phase ? 'true' : 'false'}
      data-signal-filter="analog-interference" data-signal-phase={phase}>
      {asset ? (
        <StateClip key={`${phase}:${asset.assetId}:${synced.sequence}`} url={asset.url}
          label={label} loop={steady} fallbackImage={fallbackImage} paused={paused} onPauseChange={setPaused}
          onEnded={() => setCursor((current) => advanceDreamcatcherPlayback(current, working, library))} />
      ) : (
        <>
          <Image alt={label} fill loading="eager" sizes="(max-width: 640px) 100vw, 1200px" src={fallbackImage} />
          <span className={playerStyles.unavailable}>STATE VIDEO UNAVAILABLE</span>
        </>
      )}
      <span aria-live="polite" className={styles.signalNotice}>
        {reconnectingPhase === phase ? 'SIGNAL REACQUIRING' : null}
      </span>
    </div>
  )
})

function StateClip({ url, label, loop, fallbackImage, onEnded, paused, onPauseChange }: {
  url: string; label: string; loop: boolean; fallbackImage: string; onEnded: () => void
  paused: boolean; onPauseChange: (paused: boolean) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video || failed) return
    let disposed = false
    function updatePlayback() {
      if (document.visibilityState !== 'visible' || paused) { video!.pause(); return }
      void video!.play().catch((error: unknown) => {
        if (!disposed && error instanceof DOMException && error.name === 'NotAllowedError') setBlocked(true)
      })
    }
    updatePlayback()
    document.addEventListener('visibilitychange', updatePlayback)
    return () => { disposed = true; document.removeEventListener('visibilitychange', updatePlayback) }
  }, [paused, failed, attempt])

  function resume() {
    onPauseChange(false)
    void videoRef.current?.play().then(() => setBlocked(false)).catch(() => setBlocked(true))
  }

  return (
    <>
      {failed ? (
        <>
          <Image alt={label} fill sizes="(max-width: 640px) 100vw, 1200px" src={fallbackImage} />
          <span className={playerStyles.unavailable} role="status">VIDEO COULD NOT LOAD</span>
        </>
      ) : (
        <video key={attempt} ref={videoRef} aria-label={label} autoPlay={!paused} className={styles.liveVideo}
          loop={loop} muted playsInline preload="auto" src={url}
          onEnded={loop ? undefined : onEnded} onError={() => setFailed(true)}
          onPlaying={() => setBlocked(false)}>
          Your browser does not support this video.
        </video>
      )}
      <div className={playerStyles.controls}>
        {failed ? (
          <ArchiveButton variant="secondary" onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>RETRY VIDEO</ArchiveButton>
        ) : (
          <ArchiveButton variant="secondary" aria-label={paused || blocked ? 'Play device video' : 'Pause device video'}
            onClick={paused || blocked ? resume : () => { videoRef.current?.pause(); onPauseChange(true) }}>
            {paused || blocked ? 'PLAY' : 'PAUSE'}
          </ArchiveButton>
        )}
      </div>
    </>
  )
}
