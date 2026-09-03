'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { buildCameraEmbedUrl, isCameraStatusMessage, type CameraPlaybackState, type DeviceCameraSource } from '@/lib/device-camera'
import styles from './cosmo-camera-embed.module.css'

const subscribe = () => () => {}
const originSnapshot = () => window.location.origin
const serverOriginSnapshot = () => ''
const labels: Record<CameraPlaybackState | 'connecting', string> = {
  connecting: 'CONNECTING', ready: 'CAMERA READY', playing: 'PLAYING', buffering: 'BUFFERING',
  'autoplay-blocked': 'TAP PLAY IN CAMERA', unavailable: 'CAMERA UNAVAILABLE', error: 'CONNECTION LOST', paused: 'PAUSED',
}

function CameraFrame({ source, parentOrigin }: { source: DeviceCameraSource; parentOrigin: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<CameraPlaybackState | 'connecting'>('connecting')
  const receivedAt = useRef(0)
  const src = buildCameraEmbedUrl(source, parentOrigin)

  useEffect(() => {
    receivedAt.current = Date.now()
    const receive = (event: MessageEvent) => {
      if (event.origin !== source.embedOrigin || event.source !== frame.current?.contentWindow) return
      if (!isCameraStatusMessage(event.data, source.binding)) return
      receivedAt.current = Date.now()
      setState(event.data.state)
    }
    window.addEventListener('message', receive)
    const watchdog = setInterval(() => {
      if (Date.now() - receivedAt.current > 20000) setState('error')
    }, 5000)
    return () => { window.removeEventListener('message', receive); clearInterval(watchdog) }
  }, [source])

  return <>
    <div className={styles.viewport}>
      <iframe allow="autoplay; fullscreen" allowFullScreen className={styles.frame}
        onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'cosmo.embed.request-status', version: 1 }, source.embedOrigin)}
        ref={frame} referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" src={src} title={source.binding.title} />
    </div>
    <div className={styles.status} role="status" aria-live="polite">
      <span className={styles.state} data-playing={state === 'playing'}>{labels[state]}</span><span>SCHEDULED CAMERA</span>
    </div>
  </>
}

export function CosmoCameraEmbed({ source, children }: { source: DeviceCameraSource; children: ReactNode }) {
  const parentOrigin = useSyncExternalStore(subscribe, originSnapshot, serverOriginSnapshot)
  const [retry, setRetry] = useState(0)
  return <section className={styles.camera} aria-label={source.binding.title}>
    {source.demo ? <p className={styles.demo}>DEMO FEED · 宇宙飞船舱 — test footage, not this Batch’s location.</p> : null}
    {parentOrigin ? <CameraFrame key={`${source.embedOrigin}/${source.binding.channelId}/${source.binding.bandId}/${retry}`} source={source} parentOrigin={parentOrigin} /> : <div className={styles.viewport} aria-label="Connecting camera" />}
    <div className={styles.details}>{children}</div>
    <div className={styles.actions}><span>{source.binding.title}</span><button type="button" className="btn-ghost" onClick={() => setRetry((value) => value + 1)}>Reconnect</button></div>
  </section>
}
