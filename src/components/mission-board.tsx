'use client'

import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useId } from 'react'
import SmartImage from './smart-image'
import { ArchiveLinkButton } from './archive-link-button'
import { missionCategories, type MissionCategory } from '@/lib/mission-board'
import styles from './mission-board.module.css'

export function MissionIcon({ category }: { category: MissionCategory }) {
  return <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {category === 'observation' && <><path d="M2 16s4-7 11-7 11 7 11 7-4 7-11 7S2 16 2 16Z" /><circle cx="13" cy="16" r="4" /><path className={styles.accent} d="M25 2v5m0 3v.1" /></>}
    {category === 'intervention' && <><path d="M7 16V9a2 2 0 0 1 4 0v6-10a2 2 0 0 1 4 0v10-8a2 2 0 0 1 4 0v11l2-3a2 2 0 0 1 3 2l-4 7c-2 3-8 3-11 0l-4-6a2 2 0 0 1 2-2Z" /><path className={styles.accent} d="M21 3c3 1 4 3 4 6M22 7l1 2" /></>}
    {category === 'frequency' && <><path d="M4 17v5m5-10v13m10-13v13m5-8v5" /><path className={styles.accent} d="M14 8v18m-2-23 2 2 2-2" /></>}
  </svg>
}

export function MissionBoardHeading() {
  return <><SmartImage className={styles.logo} src="/assets/vi-icon.png" alt="" width={881} height={492} sizes="32px" /><span>Mission Board</span></>
}

/** Published assignments are intentionally empty until the publishing workflow is defined. */
export function MissionBoard({ unlocked, id = 'mission-board' }: { unlocked: boolean; id?: string }) {
  const heading = useId()
  return <section id={id} className={styles.board} aria-labelledby={heading}>
    <header className={styles.heading}><h2 id={heading}><MissionBoardHeading /></h2>{!unlocked && <LockKeyhole size={20} aria-label="Locked" />}</header>
    {unlocked && <div className={styles.empty}><h3>No missions yet.</h3><p>Your access is open. New assignments from the Collective will appear here.</p></div>}
    <ul className={styles.categories}>
      {missionCategories.map(category => <li key={category.id}><MissionIcon category={category.id} /><div><h3>{category.label}</h3>{unlocked ? <p>{category.description}</p> : <div className={styles.redacted} aria-hidden="true"><span /><span /></div>}</div></li>)}
    </ul>
    {!unlocked && <ArchiveLinkButton href="/voyager-initiation" variant="primary" fullWidth>Voyager Initiation <ArrowRight size={20} aria-hidden /></ArchiveLinkButton>}
  </section>
}
