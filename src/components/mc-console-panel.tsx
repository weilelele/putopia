'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { CONSOLE_HERO } from '@/lib/console-hero'
import SmartImage from './smart-image'
import styles from './mc-console-panel.module.css'

export function McConsolePanel({ heroVideo }: { heroVideo?: { src: string; poster?: string } } = {}) {
  const [guideOpen, setGuideOpen] = useState(false)
  const guideId = useId()
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
      </header>
      <button className={styles.guideButton} type="button" onClick={() => setGuideOpen(open => !open)} aria-expanded={guideOpen} aria-controls={guideId}>
        How it works {guideOpen ? <Minus size={20} aria-hidden /> : <Plus size={20} aria-hidden />}
      </button>
      <div id={guideId} hidden={!guideOpen} className={styles.guide}>
        {guideOpen ? <>
          <SmartImage src="/assets/voyager-briefing/console-real.jpg" alt="A Multiverse Console held in two hands, showing its central screen and the controls on either side" width={1280} height={720} sizes="(min-width: 1200px) 960px, (min-width: 768px) calc(100vw - 320px), calc(100vw - 32px)" className={styles.guideImage} />
          <ol className={styles.steps}>
            <li><h3>Find a world</h3><p>Turn the left knob to tune its Frequency.</p></li>
            <li><h3>Choose a view</h3><p>Turn the right knob to switch Bands.</p></li>
            <li><h3>Send energy</h3><p>Hold the Quantum Energy Button for at least 3 seconds to charge before sending energy.</p></li>
          </ol>
        </> : null}
      </div>
    </section>
  )
}
