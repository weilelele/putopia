'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import styles from '../../live-observation-room.module.css'
import type { CosmoLiveVideo } from '@/lib/cosmo'

export function DeviceLiveVideo({
  fallbackImage,
  label,
  videos,
}: {
  fallbackImage: string
  label: string
  videos: CosmoLiveVideo[]
}) {
  const [index, setIndex] = useState(0)
  const activeIndex = videos.length ? index % videos.length : 0
  const activeVideo = videos[activeIndex]
  const nextVideo = videos.length > 1
    ? videos[(activeIndex + 1) % videos.length]
    : null
  const nextVideoUrl = nextVideo?.url

  useEffect(() => {
    if (!nextVideoUrl) return

    const preload = document.createElement('video')
    preload.muted = true
    preload.preload = 'auto'
    preload.src = nextVideoUrl
    preload.load()

    return () => {
      preload.removeAttribute('src')
      preload.load()
    }
  }, [nextVideoUrl])

  function advance() {
    setIndex((current) => videos.length ? (current + 1) % videos.length : 0)
  }

  if (!activeVideo) {
    return (
      <Image
        alt={label}
        fill
        loading="eager"
        sizes="(max-width: 768px) 100vw, 900px"
        src={fallbackImage}
      />
    )
  }

  return (
    <video
      aria-label={label}
      autoPlay
      className={styles.deviceLiveVideo}
      key={activeVideo.assetId}
      loop={videos.length === 1}
      muted
      onEnded={videos.length > 1 ? advance : undefined}
      playsInline
      poster={activeVideo.posterUrl ?? undefined}
      preload="auto"
      src={activeVideo.url}
    >
      Your browser does not support the live video feed.
    </video>
  )
}
