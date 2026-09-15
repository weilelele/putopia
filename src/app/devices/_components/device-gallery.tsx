'use client'

import NextImage, { type ImageProps } from 'next/image'
import { useState, type ReactNode } from 'react'
import type { DeviceBatchMedia } from '@/lib/device-batches'
import styles from './device-gallery.module.css'

export function DeviceMediaImage(props: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps['src'] | null>(null)
  if (failedSrc === props.src) return <p className={styles.caption}>Image unavailable</p>
  return <NextImage {...props} onError={() => setFailedSrc(props.src)} />
}

export function DeviceGallery({ primary, primaryLabel, media, selected, onSelect }: {
  primary: ReactNode
  primaryLabel: string
  media: DeviceBatchMedia[]
  selected: number
  onSelect: (index: number) => void
}) {
  const item = selected > 0 ? media[selected - 1] : null
  return <section className={styles.gallery} aria-label="Device media" id="device-gallery">
    {item ? <>
      <div className={styles.frame}>
        {item.kind === 'video'
          ? <video key={item.src} src={item.src} poster={item.poster} controls playsInline preload="metadata" />
          : <DeviceMediaImage src={item.src} alt={item.alt || item.caption} fill sizes="(max-width: 767px) 100vw, 1000px" unoptimized />}
      </div>
      {item.caption ? <p className={styles.caption}>{item.caption}</p> : null}
    </> : primary}
    {media.length ? <div className={styles.rail} aria-label="Choose media">
      <button className={styles.thumbnail} aria-pressed={!item} type="button" onClick={() => onSelect(0)}>{primaryLabel}</button>
      {media.map((entry, index) => <button className={styles.thumbnail} key={`${entry.kind}:${entry.src}`} type="button" aria-pressed={selected === index + 1} aria-label={entry.caption || `${entry.kind} ${index + 1}`} onClick={() => onSelect(index + 1)}>
        {entry.kind === 'image' || entry.poster ? <DeviceMediaImage src={entry.poster ?? entry.src} alt="" width={80} height={48} unoptimized /> : <span>VIDEO</span>}
        {entry.kind === 'video' ? <span>▶</span> : null}
      </button>)}
    </div> : null}
  </section>
}

export function UpdateMedia({ media }: { media: DeviceBatchMedia[] }) {
  return <div className={styles.updateMedia}>{media.map((item, index) => <figure key={`${item.src}-${index}`}>
    {item.kind === 'video' ? <video src={item.src} poster={item.poster} controls playsInline preload="none" />
      : <DeviceMediaImage src={item.src} alt={item.alt || item.caption} width={800} height={600} unoptimized />}
    {item.caption ? <figcaption className={styles.caption}>{item.caption}</figcaption> : null}
  </figure>)}</div>
}
