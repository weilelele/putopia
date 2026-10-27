'use client'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import SmartImage from './smart-image'
import { ArchiveButton } from './archive-button'
import { ArchiveLinkButton } from './archive-link-button'
import { ArchiveSheet } from './archive-sheet'
import styles from './dashboard-voyager-header.module.css'
export interface DashboardVoyager { role: string; name: string; avatarUrl: string | null; awaitingYou: number | null; deviceDays: number }
/** Account summary is dashboard content; profile editing remains in Voyagers. */
export function DashboardVoyagerHeader({ voyager }: { voyager: DashboardVoyager }) {
  const [deviceOpen, setDeviceOpen] = useState(false)
  const isVoyager = voyager.role === 'voyager' || voyager.role === 'architect'
  return <section className={`dashboard-voyager ${styles.header}`} aria-label="Your membership status">
    <div className="dashboard-voyager-welcome"><p>WELCOME,</p><h2>{isVoyager ? 'VOYAGER' : 'APPLICANT'}</h2>{isVoyager && <p className="dashboard-voyager-intro">YOU HAVE BEEN SELECTED TO EXPLORE<br />THE MYSTERIES OF PARALLEL WORLDS.</p>}</div>
    <div className={styles.board}>
      <div className={styles.identity}>
        <div className={styles.person}>
          <span className={styles.avatar}>{voyager.avatarUrl ? <SmartImage src={voyager.avatarUrl} alt={voyager.name} width={32} height={32} sizes="32px" /> : <span aria-label={voyager.name}>{voyager.name.slice(0,2).toUpperCase()}</span>}</span>
          <span className={styles.name}>{voyager.name}</span>
        </div>
        <ArchiveLinkButton href="/voyager-initiation" variant="ghost" className={styles.initiation}>
          <span className={styles.initiationSurface} aria-hidden />
          <span className={styles.initiationCopy}><strong>{voyager.role.toUpperCase()}</strong><span>VOYAGER INITIATION</span></span>
          <ArrowRight aria-hidden size={20} />
        </ArchiveLinkButton>
      </div>
      <div className={styles.metrics}>
        <ArchiveLinkButton href="/signal" variant="ghost" className={styles.dispatch}><span>SIGNAL DISPATCH</span><span><strong>{voyager.awaitingYou ?? '—'}</strong> awaiting you</span></ArchiveLinkButton>
        <ArchiveButton variant="ghost" className={styles.days} onClick={() => setDeviceOpen(true)} aria-label={`${voyager.deviceDays} Console holding days`}><SmartImage src="/assets/vi-icon.png" alt="" width={40} height={24} sizes="40px" /><span><strong>{voyager.deviceDays}</strong><span>DAYS</span></span></ArchiveButton>
      </div>
    </div>
    <ArchiveSheet open={deviceOpen} onClose={() => setDeviceOpen(false)} title="Multiverse Console"><p>{voyager.deviceDays} days held</p><p>No holding days recorded.</p><ArchiveLinkButton href="/devices" variant="primary" fullWidth>View Consoles <ArrowRight aria-hidden size={20} /></ArchiveLinkButton></ArchiveSheet>
  </section>
}
