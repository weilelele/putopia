'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { buildCameraEmbedUrl, isCameraStatusMessage, shouldShowCameraLive, type CameraPlaybackState, type DeviceCameraSource } from '@/lib/device-camera'
import { preferredSurveillanceQuality, surveillanceEffectMessage, type SurveillanceQuality } from '@/lib/surveillance-profile'
import styles from './cosmo-camera-embed.module.css'

const subscribe = () => () => {}
const originSnapshot = () => window.location.origin
const serverOriginSnapshot = () => ''
type VideoConnection = EventTarget & { saveData?: boolean }
type NavigatorWithConnection = Navigator & { connection?: VideoConnection }
function CameraFrame({ source, parentOrigin, location }: { source: DeviceCameraSource; parentOrigin: string; location: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<CameraPlaybackState | 'connecting'>('connecting')
  const [hasPlayed, setHasPlayed] = useState(false)
  const [quality, setQuality] = useState<SurveillanceQuality>('standard')
  const [retry, setRetry] = useState(0)
  const receivedAt = useRef(0)
  const src = buildCameraEmbedUrl(source, parentOrigin, { effects: true })
  const effectMessage = useMemo(
    () => surveillanceEffectMessage(quality, source.binding),
    [quality, source.binding],
  )
  const sendEffect = useCallback(() => {
    frame.current?.contentWindow?.postMessage(effectMessage, source.embedOrigin)
  }, [effectMessage, source.embedOrigin])

  useEffect(sendEffect, [sendEffect])

  useEffect(() => {
    receivedAt.current = Date.now()
    const receive = (event: MessageEvent) => {
      if (event.origin !== source.embedOrigin || event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'cosmo.embed.effects-status') return
      if (!isCameraStatusMessage(event.data, source.binding)) return
      receivedAt.current = Date.now()
      setState(event.data.state)
      setHasPlayed((current) => event.data.state === 'playing' || (event.data.state === 'buffering' && current))
      sendEffect()
    }
    window.addEventListener('message', receive)
    const watchdog = setInterval(() => {
      const elapsed = Date.now() - receivedAt.current
      if (elapsed > 20000) setState('error')
      // Quietly recover an unresponsive frame; Cosmo handles media recovery itself.
      if (elapsed > 60000) {
        receivedAt.current = Date.now()
        setRetry((value) => value + 1)
      }
    }, 5000)
    return () => { window.removeEventListener('message', receive); clearInterval(watchdog) }
  }, [sendEffect, source])

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as NavigatorWithConnection).connection
    const update = () => setQuality(preferredSurveillanceQuality({
      reducedMotion: motion.matches,
      saveData: connection?.saveData === true,
    }))
    update()
    motion.addEventListener('change', update)
    connection?.addEventListener('change', update)
    return () => {
      motion.removeEventListener('change', update)
      connection?.removeEventListener('change', update)
    }
  }, [])

  const live = state !== 'connecting' && shouldShowCameraLive(state, hasPlayed)

  return <>
    <iframe key={retry} allow="autoplay" className={styles.frame}
        onLoad={() => {
          frame.current?.contentWindow?.postMessage({ type: 'cosmo.embed.request-status', version: 1 }, source.embedOrigin)
          sendEffect()
        }}
        ref={frame} referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" src={src} title={source.binding.title} />
    <span className={styles.live} data-playing={live}><span className={styles.dot} aria-hidden />LIVE</span>
    <span className={styles.location}>{location.toUpperCase()}</span>
  </>
}

export function CosmoCameraEmbed({ source, location }: { source: DeviceCameraSource; location: string }) {
  const parentOrigin = useSyncExternalStore(subscribe, originSnapshot, serverOriginSnapshot)
  return <section className={styles.camera} aria-label={source.binding.title}>
    {parentOrigin ? <CameraFrame key={`${source.embedOrigin}/${source.binding.channelId}/${source.binding.bandId}`} source={source} parentOrigin={parentOrigin} location={location} /> : null}
  </section>
}
