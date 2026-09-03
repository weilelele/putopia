'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { buildCameraEmbedUrl, isCameraStatusMessage, type CameraPlaybackState, type DeviceCameraSource } from '@/lib/device-camera'
import styles from './cosmo-camera-embed.module.css'

const subscribe = () => () => {}
const originSnapshot = () => window.location.origin
const serverOriginSnapshot = () => ''
function CameraFrame({ source, parentOrigin, location }: { source: DeviceCameraSource; parentOrigin: string; location: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<CameraPlaybackState | 'connecting'>('connecting')
  const [retry, setRetry] = useState(0)
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
      const elapsed = Date.now() - receivedAt.current
      if (elapsed > 20000) setState('error')
      // Quietly recover an unresponsive frame; Cosmo handles media recovery itself.
      if (elapsed > 60000) {
        receivedAt.current = Date.now()
        setRetry((value) => value + 1)
      }
    }, 5000)
    return () => { window.removeEventListener('message', receive); clearInterval(watchdog) }
  }, [source])

  return <>
      <iframe key={retry} allow="autoplay" className={styles.frame}
        onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'cosmo.embed.request-status', version: 1 }, source.embedOrigin)}
        ref={frame} referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" src={src} title={source.binding.title} />
    <span className={styles.live} data-playing={state === 'playing'}><span className={styles.dot} aria-hidden />LIVE</span>
    <span className={styles.location}>{location.toUpperCase()}</span>
  </>
}

export function CosmoCameraEmbed({ source, location }: { source: DeviceCameraSource; location: string }) {
  const parentOrigin = useSyncExternalStore(subscribe, originSnapshot, serverOriginSnapshot)
  return <section className={styles.camera} aria-label={source.binding.title}>
    {parentOrigin ? <CameraFrame key={`${source.embedOrigin}/${source.binding.channelId}/${source.binding.bandId}`} source={source} parentOrigin={parentOrigin} location={location} /> : null}
  </section>
}
