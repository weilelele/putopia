'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SmartImage from '@/components/smart-image'
import styles from './console-carousel.module.css'

const slides = [
  { src: '/assets/kyoto-one-20260910/01-warehouse-hero.png', alt: 'Multiverse Console on a workshop table, displaying a starry parallel world' },
  { src: '/assets/voyager-initiation/console-multiview-portrait.png', alt: 'Console details: rear housing, side display and control dial in the Kyoto workshop', details: true },
  { src: '/assets/q1-20260910/01-robot-library.png', alt: 'Multiverse Console displaying a robot in an overgrown library' },
]

export function ConsoleCarousel({ suspended }: { suspended: boolean }) {
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const loaded = useRef(new Set<number>())

  useEffect(() => {
    if (suspended) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { threshold: 0.5 })
    if (root.current) observer.observe(root.current)
    const timer = window.setInterval(() => {
      if (!visible || document.hidden || motion.matches || root.current?.querySelector(':focus-visible')) return
      setActive(index => loaded.current.has((index + 1) % slides.length) ? (index + 1) % slides.length : index)
    }, 6000)
    return () => { window.clearInterval(timer); observer.disconnect() }
  }, [active, suspended])

  function move(delta: number) {
    setActive(index => (index + delta + slides.length) % slides.length)
  }

  return <div ref={root} className={styles.carousel} role="region" aria-roledescription="carousel" aria-label="Multiverse Console photographs">
    <div className={styles.frame}>
      {slides.map((slide, index) => <div key={slide.src} className={`${styles.slide} ${index === active ? styles.active : ''}`} aria-hidden={index !== active}>
        <div className={slide.details ? styles.detailsCrop : styles.image}>
          <SmartImage src={slide.src} alt={slide.alt} sizes="(min-width: 1200px) 960px, (min-width: 768px) calc(100vw - 320px), calc(100vw - 64px)" preload onLoad={() => { loaded.current.add(index) }} />
        </div>
      </div>)}
    </div>
    <div className={styles.controls}>
      <button className={styles.previous} type="button" onClick={() => move(-1)} aria-label="Previous Console photograph"><ChevronLeft size={20} aria-hidden /></button>
      <button className={styles.next} type="button" onClick={() => move(1)} aria-label="Next Console photograph"><ChevronRight size={20} aria-hidden /></button>
    </div>
  </div>
}
