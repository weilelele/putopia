'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Plus, HelpCircle } from 'lucide-react'
import type { McFunction } from '@/types/database'
import { ArchiveSheet } from './archive-sheet'
import { ArchiveLinkButton } from './archive-link-button'
import { CONSOLE_HERO } from '@/lib/console-hero'
import SmartImage from './smart-image'
import styles from './mc-console-panel.module.css'

const DETAILS: Record<string, string> = {
  'Worlds Detection': 'Observe parallel worlds.',
  'Audio Collection': 'Receive and send sound.',
}

export function McConsolePanel({ mcFunctions }: { mcFunctions: McFunction[] }) {
  const [guideOpen, setGuideOpen] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const currentImage = CONSOLE_HERO.images[imageIndex]
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (CONSOLE_HERO.images.length < 2 || guideOpen) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    if (imageRef.current) observer.observe(imageRef.current)
    const timer = window.setInterval(() => {
      if (document.hidden || motion.matches || !visible || imageRef.current?.matches(':hover, :focus-within')) return
      setImageIndex(index => (index + 1) % CONSOLE_HERO.images.length)
    }, CONSOLE_HERO.intervalMs)
    return () => { window.clearInterval(timer); observer.disconnect() }
  }, [guideOpen])

  const groups = [
    { title: 'Confirmed', functions: mcFunctions.filter(fn => fn.status === 'active'), confirmed: true },
    { title: 'Unconfirmed', functions: mcFunctions.filter(fn => fn.status !== 'active'), confirmed: false },
  ]

  return (
    <section className={styles.panel} aria-label="About the Multiverse Console">
      <div className={styles.device} ref={imageRef} tabIndex={0} aria-label="Console slideshow; pauses while focused">
        <SmartImage
          src={currentImage.src}
          alt={currentImage.alt}
          width={currentImage.width}
          height={currentImage.height}
          sizes="(min-width: 1200px) 960px, (min-width: 768px) calc(100vw - 320px), calc(100vw - 32px)"
          preload={imageIndex === 0}
          className={styles.deviceImage}
        />
      </div>
      <header className={styles.heading}>
        <h2 className={styles.sectionTitle}>Multiverse<br />Console</h2>
        <p>Our collective&apos;s exclusive device. Own it to unlock exploration of parallel worlds.</p>
      </header>
      <nav className={styles.exploreActions} aria-label="Explore the collective">
        <ArchiveLinkButton href="/intel" variant="primary" fullWidth className={styles.missions}>
          <span>View missions</span><ArrowRight size={20} aria-hidden />
        </ArchiveLinkButton>
        <ArchiveLinkButton href="/voyagers" variant="secondary" className={styles.exploreLink}>
          <span>Meet voyagers</span><ArrowRight size={20} aria-hidden />
        </ArchiveLinkButton>
        <ArchiveLinkButton href="/worlds" variant="secondary" className={styles.exploreLink}>
          <span>Explore worlds</span><ArrowRight size={20} aria-hidden />
        </ArchiveLinkButton>
      </nav>
      <button className={styles.guideButton} type="button" onClick={() => setGuideOpen(true)} aria-haspopup="dialog">Explore the function <Plus size={20} aria-hidden /></button>
      <ArchiveSheet open={guideOpen} onClose={() => setGuideOpen(false)} title="Console functions" className={styles.functionModal}>
        {mcFunctions.length ? groups.map(group => <section className={styles.group} key={group.title} aria-label={group.title}>
          <h3>{group.title}</h3>
          {group.functions.length ? <ul>{group.functions.map(fn => <li key={fn.id}>
            {group.confirmed ? <span className={styles.confirmedIcon}><Check size={19} aria-hidden /></span> : <HelpCircle className={styles.unknownIcon} size={32} aria-hidden />}
            <div><h4>{fn.name}</h4><p>{group.confirmed ? (DETAILS[fn.name] || 'Confirmed capability.') : fn.status === 'in_development' ? 'In development' : 'Unconfirmed'}</p></div>
          </li>)}</ul> : <p>No functions recorded in this category.</p>}
        </section>) : <p>Function details are currently unavailable.</p>}
      </ArchiveSheet>
    </section>
  )
}
