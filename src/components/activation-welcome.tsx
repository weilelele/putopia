'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { ArchiveLinkButton } from './archive-link-button'
import { mountActivationScene } from '@/lib/activation-scene'
import styles from './activation-welcome.module.css'

const BRIEFING_HREF = '/voyager-initiation?briefing=1'
const packs = [
  { name: 'console', file: 'console.webp', width: 1200, height: 800 },
  { name: 'initial', file: 'welcome-pack.webp', width: 420, height: 601 },
  { name: 'antenna', file: 'antenna.webp', width: 1200, height: 800 },
  { name: 'fourth', file: 'fourth-delivery.webp', width: 1200, height: 800 },
] as const

/** `frame` is supplied only by the read-only development/branch-preview fixture. */
export function ActivationWelcome({ frame }: { frame?: number }) {
  const scene = useRef<HTMLAnchorElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!scene.current || !canvas.current) return
    return mountActivationScene(scene.current, canvas.current, frame)
  }, [frame])

  return <main className={styles.page}>
    <div className={styles.welcome}>
      <header className={styles.intro}>
        <p className={styles.status}>ACCOUNT ACTIVATED</p>
        <h1 className={styles.heading}>The unknown<br />is waiting.</h1>
        <p className={styles.description}>Your account is ready.<br />Discover what comes next.</p>
      </header>
      <div className={styles.discovery}>
        <Link ref={scene} href={BRIEFING_HREF} prefetch={false} className={styles.scene}
          aria-label="Watch the Voyager Initiation briefing: discover the Console, welcome letter and badge, Antenna design studies and an unrevealed delivery">
          <div className={styles.photographs} aria-hidden="true">
            {packs.map((pack, index) => <span key={pack.name} data-pack={pack.name} className={`${styles.tile} ${styles[pack.name]}`}>
              <Image src={`/assets/activation-welcome/${pack.file}`} alt="" width={pack.width} height={pack.height}
                unoptimized loading="eager" fetchPriority={index === 0 ? 'high' : 'auto'} />
            </span>)}
          </div>
          <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        </Link>
      </div>
      <section className={styles.invitation} aria-label="Your next step">
        <ArchiveLinkButton href={BRIEFING_HREF} variant="primary" fullWidth className={styles.action}>EXPLORE INITIATION</ArchiveLinkButton>
        <ArchiveLinkButton href="/console" variant="secondary" fullWidth className={styles.action}>BACK TO DASHBOARD</ArchiveLinkButton>
      </section>
    </div>
  </main>
}
