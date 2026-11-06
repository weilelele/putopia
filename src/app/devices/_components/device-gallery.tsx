'use client'

import NextImage, { type ImageProps } from 'next/image'
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import type { DeviceBatchMedia } from '@/lib/device-batches'
import styles from './device-gallery.module.css'

export function DeviceMediaImage(props: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps['src'] | null>(null)
  if (failedSrc === props.src) return <p className={styles.caption}>Image unavailable</p>
  return <NextImage {...props} onError={() => setFailedSrc(props.src)} />
}

/** Full-screen rather than ArchiveSheet: the Dialog's margins leave a phone's image no larger than it is on the page. */
function DeviceImageViewer({ item, onClose }: { item: DeviceBatchMedia; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const focus = useRef({ x: .5, y: .5 })
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (!element.open) element.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  // Keep the tapped point of the picture in view once it is enlarged.
  useLayoutEffect(() => {
    const element = stage.current
    if (!element || !zoomed) return
    element.scrollTo({
      left: focus.current.x * element.scrollWidth - element.clientWidth / 2,
      top: focus.current.y * element.scrollHeight - element.clientHeight / 2,
    })
  }, [zoomed])

  function toggleZoom(event: MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    focus.current = { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height }
    setZoomed(value => !value)
  }

  return <dialog ref={dialog} className={styles.viewer} aria-label={item.alt || item.caption || 'Device image'} onClose={onClose}>
    <div ref={stage} className={styles.viewerStage} data-zoomed={zoomed}>
      <button type="button" className={styles.viewerPicture} aria-label={zoomed ? 'Zoom out' : 'Zoom in'} aria-pressed={zoomed} onClick={toggleZoom}>
        <DeviceMediaImage src={item.src} alt={item.alt || item.caption} width={1600} height={1200} loading="eager" unoptimized />
      </button>
    </div>
    {item.caption ? <p className={styles.viewerCaption}>{item.caption}</p> : null}
    <ArchiveButton className={styles.viewerClose} variant="ghost" aria-label="Close" onClick={() => { dialog.current?.close(); onClose() }} type="button"><X size={22} /></ArchiveButton>
  </dialog>
}

function DeviceZoomImage({ item, className, onOpen, children }: { item: DeviceBatchMedia; className?: string; onOpen?: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className={`${styles.zoomTrigger}${className ? ` ${className}` : ''}`} aria-label={`Enlarge image: ${item.alt || item.caption || 'Device image'}`} aria-haspopup="dialog" onClick={() => { onOpen?.(); setOpen(true) }}>{children}</button>
    {open ? createPortal(<DeviceImageViewer item={item} onClose={() => setOpen(false)} />, document.body) : null}
  </>
}

export function DeviceGallery({ primary, primaryLabel, media, selected, onSelect, onVideoPlay, onImageEnlarge }: {
  onVideoPlay?: (index: number) => void
  onImageEnlarge?: (index: number) => void
  primary?: ReactNode
  primaryLabel?: string
  media: DeviceBatchMedia[]
  selected: number
  onSelect: (index: number) => void
}) {
  const hasPrimary = primary !== undefined && primary !== null
  const mediaOffset = hasPrimary ? 1 : 0
  const itemIndex = selected - mediaOffset
  const item = itemIndex >= 0 ? media[itemIndex] : null
  const primarySelected = hasPrimary && selected === 0

  return <section className={styles.gallery} aria-label="Device media" id="device-gallery">
    <div className={styles.stage}>
      {/* Keep the live iframe mounted so returning to it does not reconnect. */}
      {hasPrimary ? <div className={styles.primary} data-hidden={!primarySelected} aria-hidden={!primarySelected} inert={!primarySelected}>{primary}</div> : null}
    {item ? <>
      <div className={styles.frame}>
        {item.kind === 'video'
          ? <video key={item.src} src={item.src} poster={item.poster} controls playsInline preload="metadata" onPlay={() => onVideoPlay?.(itemIndex)} />
          : <DeviceZoomImage key={item.src} item={item} className={styles.frameZoom} onOpen={() => onImageEnlarge?.(itemIndex)}><DeviceMediaImage src={item.src} alt={item.alt || item.caption} fill sizes="(max-width: 767px) 100vw, 1000px" unoptimized /></DeviceZoomImage>}
      </div>
    </> : null}
    </div>
    {hasPrimary || media.length ? <div className={styles.rail} aria-label="Choose media">
      {hasPrimary ? <button className={styles.thumbnail} aria-pressed={primarySelected} type="button" onClick={() => onSelect(0)}>{primaryLabel}</button> : null}
      {media.map((entry, index) => <button className={styles.thumbnail} key={`${entry.kind}:${entry.src}`} type="button" aria-pressed={selected === index + mediaOffset} aria-label={entry.caption || `${entry.kind} ${index + 1}`} onClick={() => onSelect(index + mediaOffset)}>
        {entry.kind === 'image' || entry.poster ? <DeviceMediaImage src={entry.poster ?? entry.src} alt="" width={80} height={48} unoptimized /> : <span>VIDEO</span>}
        {entry.kind === 'video' ? <span>▶</span> : null}
      </button>)}
    </div> : null}
  </section>
}

/** One material record's picture, tappable to enlarge. */
export function DeviceRecordImage({ item, onOpen }: { item: DeviceBatchMedia; onOpen?: () => void }) {
  return <DeviceZoomImage item={item} onOpen={onOpen}><DeviceMediaImage alt={item.alt} height={1200} sizes="(max-width: 767px) calc(100vw - 64px), 34rem" src={item.src} style={{ height: 'auto', width: '100%' }} unoptimized width={1600} /></DeviceZoomImage>
}

export function UpdateMedia({ media }: { media: DeviceBatchMedia[] }) {
  return <div className={styles.updateMedia}>{media.map((item, index) => <figure key={`${item.src}-${index}`}>
    {item.kind === 'video' ? <video src={item.src} poster={item.poster} controls playsInline preload="none" />
      : <DeviceZoomImage item={item}><DeviceMediaImage src={item.src} alt={item.alt || item.caption} width={800} height={600} unoptimized /></DeviceZoomImage>}
    {item.caption ? <figcaption className={styles.caption}>{item.caption}</figcaption> : null}
  </figure>)}</div>
}
