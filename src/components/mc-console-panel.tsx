'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight } from 'lucide-react'
import { ArchiveButton } from './archive-button'
import { ArchiveSheet } from './archive-sheet'
import { CONSOLE_HERO } from '@/lib/console-hero'
import SmartImage from './smart-image'
import styles from './mc-console-panel.module.css'

/** Reel 01 without its Collective introduction, cut from ~/Sites/orientation-reel (composition ReelHowItWorks). `at` is where each control starts. */
const GUIDE_FILM = { src: '/assets/how-it-works-20261106.mp4', poster: '/assets/how-it-works-20261106-poster.jpg' }
const GUIDE_STEPS = [
  { title: 'Frequency', body: 'Turn the left knob to find a world.', at: 22.8 },
  { title: 'Band', body: 'Turn the right knob to choose a view.', at: 42.2 },
  { title: 'Quantum energy', body: 'Hold the top button for at least 3 seconds to charge and send energy.', at: 52.5 },
]

export function McConsolePanel({ heroVideo }: { heroVideo?: { src: string; poster?: string } } = {}) {
  const [guideState, setGuideState] = useState<'idle' | 'open' | 'closed'>('idle')
  const guideOpen = guideState === 'open'
  const guideFilm = useRef<HTMLVideoElement>(null)
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

  // Opened by a tap, so try with the narration; browsers that refuse play muted with the burned-in captions.
  useEffect(() => {
    const film = guideFilm.current
    if (!guideOpen || !film || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    film.play().catch(() => {
      film.muted = true
      return film.play().catch(() => {})
    })
  }, [guideOpen])

  function seekGuide(at: number) {
    const film = guideFilm.current
    if (!film) return
    film.currentTime = at
    void film.play().catch(() => {})
  }

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
      <ArchiveButton variant="primary" fullWidth className={styles.guideButton} onClick={() => setGuideState('open')} aria-haspopup="dialog">
        <span>How it works</span><ArrowRight size={20} aria-hidden />
      </ArchiveButton>
      {/* Retain the dialog after its first open so native close restores focus. */}
      {guideState !== 'idle' ? createPortal(<ArchiveSheet open={guideOpen} onClose={() => setGuideState('closed')} title="How it works" size="wide">
        {guideOpen ? <>
          <div className={styles.guideFilm}>
            <video ref={guideFilm} src={GUIDE_FILM.src} poster={GUIDE_FILM.poster} controls playsInline preload="metadata" aria-label="A narrated Console demonstration: the left knob tunes a world out of static, the right knob changes the view, and holding the top button charges and sends energy. Captions are part of the picture." />
          </div>
          <ol className={styles.steps}>
            {GUIDE_STEPS.map((step, index) => <li key={step.title}>
              <button type="button" onClick={() => seekGuide(step.at)} aria-label={`${step.title}: ${step.body} Play this part of the video.`}>
                <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div>
              </button>
            </li>)}
          </ol>
        </> : null}
      </ArchiveSheet>, document.body) : null}
    </section>
  )
}
