'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { preferredSurveillanceQuality, SURVEILLANCE_PROFILES, type SurveillancePreset } from '@/lib/surveillance-profile'
import styles from './surveillance-video.module.css'

type Connection = EventTarget & { saveData?: boolean }
type Client = Navigator & { connection?: Connection }
type Props = {
  className?: string
  label: string
  loop: boolean
  mediaRef?: RefObject<HTMLVideoElement | null>
  poster?: string
  preset: SurveillancePreset
  src: string
  onEnded?: () => void
  onError?: () => void
  onPlaying?: () => void
}

function noiseTiles() {
  return Array.from({ length: 4 }, (_, seed) => {
    const tile = document.createElement('canvas')
    tile.width = 64
    tile.height = 64
    const context = tile.getContext('2d')
    if (!context) return tile
    const pixels = context.createImageData(64, 64)
    let value = seed + 17
    for (let index = 0; index < pixels.data.length; index += 4) {
      value = (value * 1664525 + 1013904223) >>> 0
      pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = value >>> 24
      pixels.data[index + 3] = 255
    }
    context.putImageData(pixels, 0, 0)
    return tile
  })
}

export function SurveillanceVideo({ className, label, loop, mediaRef, poster, preset, src, onEnded, onError, onPlaying }: Props) {
  const internalVideo = useRef<HTMLVideoElement>(null)
  const videoRef = mediaRef ?? internalVideo
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [renderer, setRenderer] = useState<'native' | 'canvas'>('native')
  const [quality, setQuality] = useState<'standard' | 'eco'>('standard')
  const profile = SURVEILLANCE_PROFILES[preset][quality]
  const filter = `blur(${profile.softness}px) saturate(${profile.saturation}%) contrast(${profile.contrast}%)`

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Client).connection
    const update = () => setQuality(preferredSurveillanceQuality({ reducedMotion: motion.matches, saveData: connection?.saveData === true }))
    update()
    motion.addEventListener('change', update)
    connection?.addEventListener('change', update)
    return () => { motion.removeEventListener('change', update); connection?.removeEventListener('change', update) }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: false })
    if (!video || !canvas || !context) { setRenderer('native'); return }
    let inView = true
    let timer = 0
    let frame = 0
    const tiles = noiseTiles()
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { inView = !!entry?.isIntersecting })
    observer?.observe(canvas)
    const draw = () => {
      timer = window.setTimeout(draw, document.hidden || !inView ? 500 : 1000 / profile.maxFps)
      if (document.hidden || !inView || video.readyState < 2 || video.paused) return
      const width = profile.renderWidth
      const height = Math.max(1, Math.round(width * canvas.clientHeight / Math.max(1, canvas.clientWidth)))
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
      const scale = Math.max(width / video.videoWidth, height / video.videoHeight)
      const sourceWidth = width / scale
      const sourceHeight = height / scale
      try {
        context.globalAlpha = 1
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        context.drawImage(video, (video.videoWidth - sourceWidth) / 2, (video.videoHeight - sourceHeight) / 2, sourceWidth, sourceHeight, 0, 0, width, height)
        if (profile.noise > 0) {
          const pattern = context.createPattern(tiles[frame++ % tiles.length], 'repeat')
          if (pattern) { context.globalAlpha = profile.noise / 100; context.fillStyle = pattern; context.fillRect(0, 0, width, height) }
        }
        setRenderer('canvas')
      } catch { window.clearTimeout(timer); setRenderer('native') }
    }
    draw()
    return () => { window.clearTimeout(timer); observer?.disconnect() }
  }, [profile, src, videoRef])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let inView = true
    const update = () => {
      if (document.hidden || !inView) video.pause()
      else void video.play().catch(() => {})
    }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { inView = !!entry?.isIntersecting; update() })
    observer?.observe(video)
    document.addEventListener('visibilitychange', update)
    update()
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [src, videoRef])

  return <span className={`${styles.stage} ${className ?? ''}`} data-renderer={renderer} data-surveillance-preset={preset} data-surveillance-quality={quality}>
    <video ref={videoRef} aria-label={label} autoPlay className={styles.video} crossOrigin="anonymous" loop={loop} muted playsInline poster={poster} preload="metadata" src={src} style={{ filter }} onEnded={onEnded} onError={onError} onPlaying={onPlaying}>Your browser does not support this video.</video>
    <canvas aria-hidden className={styles.canvas} ref={canvasRef} style={{ filter }} />
  </span>
}
