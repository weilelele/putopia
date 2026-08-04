import Image from 'next/image'
import { Image as ImageIcon, Video } from 'lucide-react'
import styles from '../device-batches.module.css'

export type BatchMediaItem = {
  alt: string
  caption: string
  kind: 'image' | 'video'
  poster?: string
  src: string
}

export function BatchMediaGallery({
  items,
  variant = 'feature',
}: {
  items: BatchMediaItem[]
  variant?: 'compact' | 'feature'
}) {
  return (
    <div
      className={`${styles.mediaGallery} ${
        variant === 'compact' ? styles.mediaGalleryCompact : ''
      }`}
    >
      {items.map((item, index) => (
        <figure className={styles.mediaItem} key={`${item.src}-${item.caption}`}>
          <div className={styles.mediaVisual} style={{ position: 'relative' }}>
            {item.kind === 'image' ? (
              <Image
                alt={item.alt}
                fill
                sizes={
                  variant === 'compact'
                    ? '(max-width: 639px) 72vw, 18rem'
                    : '(max-width: 767px) 84vw, 34rem'
                }
                src={item.src}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <video
                aria-label={item.alt}
                controls
                muted
                playsInline
                poster={item.poster}
                preload="metadata"
                src={item.src}
              />
            )}
          </div>
          <figcaption>
            {item.kind === 'video' ? (
              <Video aria-hidden size={14} />
            ) : (
              <ImageIcon aria-hidden size={14} />
            )}
            <span>{item.caption}</span>
            <em>{String(index + 1).padStart(2, '0')}</em>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
