'use client'

import { LogIn, Sparkle } from 'lucide-react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { ArchiveButton } from './archive-button'
import { ArchiveLinkButton } from './archive-link-button'
import { DashboardStats } from './dashboard-stats'
import { useActivateAccess } from './activate-action'
import SmartImage from './smart-image'
import styles from './dashboard-guest-header.module.css'

/** The guest introduction is the Dashboard's brand header, not a second header. */
export function DashboardGuestHeader({ stats }: { stats: { worlds: number; voyagers: number } | null }) {
  const { trigger, modal } = useActivateAccess(
    typeof window === 'undefined' ? '/new' : `/new${window.location.search}`,
  )
  const requestAccess = () => {
    posthog.capture('workspace_request_access_clicked')
    trigger('hero')
  }
  return <section className={styles.hero} aria-label="Discover Multiverse Collective">
    <div className={styles.introduction}>
      <SmartImage src="/assets/vi-wordmark.png" alt="Multiverse Collective" width={3699} height={1020} sizes="(min-width: 768px) 400px, 86vw" preload className={styles.wordmark} />
      <SmartImage src="/assets/vi-icon.png" alt="" width={140} height={78} sizes="112px" className={styles.emblem} />
      <p className={styles.tagline}>We own devices looking into parallel worlds.</p>
    </div>
    <div className={styles.showcase}>
      <Link href="/devices" className={styles.device} aria-label="View device · Multiverse Console">
        <span className={styles.deviceHeading}><span>UNIT 01</span><strong>MULTIVERSE CONSOLE</strong></span>
        <SmartImage src="/assets/device-console.jpg" alt="Multiverse Console with its energy button, channel controls and world display" width={1280} height={1023} sizes="(min-width: 768px) 520px, 100vw" preload className={styles.deviceImage} />
        <span className={styles.deviceFooter}>VIEW DEVICE →</span>
      </Link>
    </div>
    <div className={styles.actions}>
      <ArchiveButton onClick={requestAccess}><Sparkle size={16} aria-hidden />REQUEST ACCESS</ArchiveButton>
      <ArchiveLinkButton href="/login" variant="secondary" onClick={() => posthog.capture('workspace_login_clicked')}><LogIn size={16} aria-hidden />LOGIN</ArchiveLinkButton>
    </div>
    <div className={styles.statistics}><DashboardStats stats={stats} /></div>
    {modal}
  </section>
}
