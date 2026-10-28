'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { ArchiveButton } from './archive-button'
import { ArchiveSheet } from './archive-sheet'
import { CONSOLE_HERO } from '@/lib/console-hero'
import SmartImage from './smart-image'
import styles from './mc-console-panel.module.css'

export function McConsolePanel({ heroVideo }: { heroVideo?: { src: string; poster?: string } } = {}) {
  const [guideOpen, setGuideOpen] = useState(false)
  const arrowId = useId()
  const [imageIndex, setImageIndex] = useState(0)
  const currentImage = CONSOLE_HERO.images[imageIndex]
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (heroVideo || CONSOLE_HERO.images.length < 2 || guideOpen) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    if (imageRef.current) observer.observe(imageRef.current)
    const timer = window.setInterval(() => {
      if (document.hidden || motion.matches || !visible || imageRef.current?.matches(':hover, :focus-within')) return
      setImageIndex(index => (index + 1) % CONSOLE_HERO.images.length)
    }, CONSOLE_HERO.intervalMs)
    return () => { window.clearInterval(timer); observer.disconnect() }
  }, [guideOpen, heroVideo])

  return (
    <section className={styles.panel} aria-label="About the Multiverse Console">
      {heroVideo ? <div className={`${styles.device} ${styles.deviceVideo}`} aria-label="Multiverse Console preview video">
        <video className={styles.deviceImage} src={heroVideo.src} poster={heroVideo.poster} autoPlay muted loop playsInline preload="metadata" />
      </div> : <div className={styles.device} ref={imageRef} tabIndex={0} aria-label="Console slideshow; pauses while focused">
        <SmartImage
          src={currentImage.src}
          alt={currentImage.alt}
          width={currentImage.width}
          height={currentImage.height}
          sizes="(min-width: 1200px) 960px, (min-width: 768px) calc(100vw - 320px), calc(100vw - 32px)"
          preload={imageIndex === 0}
          className={styles.deviceImage}
        />
      </div>}
      <header className={styles.heading}>
        <h2 className={styles.sectionTitle}>Multiverse<br />Console</h2>
        <p>It&apos;s a device that we own to explore parallel worlds.</p>
      </header>
      <ArchiveButton variant="primary" fullWidth className={styles.guideButton} onClick={() => setGuideOpen(true)} aria-haspopup="dialog">
        <span>How it works</span><ArrowRight size={20} aria-hidden />
      </ArchiveButton>
      <ArchiveSheet open={guideOpen} onClose={() => setGuideOpen(false)} title="How it works" size="wide">
        {guideOpen ? <>
          <figure className={styles.diagram} role="img" aria-label="Console controls: 1 points to the left Frequency knob, 2 to the right Band knob, and 3 to the top Quantum Energy Button.">
            <SmartImage src="/assets/device-reel-wasteland-20261021-poster.jpg" alt="" width={1280} height={720} sizes="(min-width: 576px) 480px, calc(100vw - 96px)" className={styles.diagramImage} />
            <svg className={styles.arrows} viewBox="0 0 1280 960" fill="none" aria-hidden="true">
              <defs><marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="28" markerHeight="28" markerUnits="userSpaceOnUse" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="currentColor" /></marker></defs>
              <g stroke="currentColor" strokeWidth="1.5" markerEnd={`url(#${arrowId})`}>
                <path d="M 135 430 H 200 L 278 485" vectorEffect="non-scaling-stroke" />
                <path d="M 1145 430 H 1050 L 947 485" vectorEffect="non-scaling-stroke" />
                <path d="M 650 110 V 295" vectorEffect="non-scaling-stroke" />
              </g>
            </svg>
            <span className={`${styles.diagramNumber} ${styles.frequencyNumber}`} aria-hidden="true">1</span>
            <span className={`${styles.diagramNumber} ${styles.bandNumber}`} aria-hidden="true">2</span>
            <span className={`${styles.diagramNumber} ${styles.energyNumber}`} aria-hidden="true">3</span>
          </figure>
          <ol className={styles.steps}>
            <li><span className={styles.stepNumber} aria-hidden="true">1</span><div><h3>Frequency</h3><p>Turn the left knob to find a world.</p></div></li>
            <li><span className={styles.stepNumber} aria-hidden="true">2</span><div><h3>Band</h3><p>Turn the right knob to choose a view.</p></div></li>
            <li><span className={styles.stepNumber} aria-hidden="true">3</span><div><h3>Quantum energy</h3><p>Hold the top button for at least 3 seconds to charge.</p></div></li>
          </ol>
        </> : null}
      </ArchiveSheet>
    </section>
  )
}
