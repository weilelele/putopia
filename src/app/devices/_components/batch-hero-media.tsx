'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { BatchMediaItem } from './batch-media-gallery'
import styles from '../device-batches.module.css'

export function BatchHeroMedia({ items }: { items: BatchMediaItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeItem = items[activeIndex]
  const hasMultipleItems = items.length > 1

  function showPrevious() {
    setActiveIndex((currentIndex) => (currentIndex - 1 + items.length) % items.length)
  }

  function showNext() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % items.length)
  }

  return (
    <div className={styles.detailMedia}>
      <figure className={styles.heroMediaStage}>
        {activeItem.kind === 'image' ? (
          <Image
            alt={activeItem.alt}
            fill
            loading={activeIndex === 0 ? 'eager' : 'lazy'}
            sizes="(max-width: 767px) 100vw, 68vw"
            src={activeItem.src}
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <video
            aria-label={activeItem.alt}
            controls
            muted
            playsInline
            poster={activeItem.poster}
            preload="metadata"
            src={activeItem.src}
          />
        )}
        <figcaption>{activeItem.caption}</figcaption>
        {hasMultipleItems ? (
          <div aria-label="Batch field media" className={styles.heroMediaControls} role="group">
            <button aria-label="Show previous media" onClick={showPrevious} type="button">
              <ChevronLeft aria-hidden size={18} />
            </button>
            <span>
              {activeIndex + 1} / {items.length}
            </span>
            <button aria-label="Show next media" onClick={showNext} type="button">
              <ChevronRight aria-hidden size={18} />
            </button>
          </div>
        ) : null}
      </figure>
    </div>
  )
}
