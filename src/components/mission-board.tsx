'use client'

import { ArrowRight, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ArchiveButton } from './archive-button'
import { ArchiveLinkButton } from './archive-link-button'
import { ArchiveSheet } from './archive-sheet'
import SmartImage from './smart-image'
import { acceptMission, loadMissionBriefing } from '@/lib/actions/missions'
import type { MissionEdition } from '@/lib/mission-board'
import styles from './mission-board.module.css'

const weekFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Shanghai',
  month: 'short',
  day: 'numeric',
})

type Mission = MissionEdition['missions'][number]
type Briefing = Awaited<ReturnType<typeof loadMissionBriefing>>

function MissionAuthor({ author }: { author: Mission['author'] }) {
  return <SmartImage src={author.avatar} alt="" width={36} height={36} sizes="36px" className={styles.avatar} />
}

function MissionDialog({ mission, signedIn, close }: { mission: Mission; signedIn: boolean; close: () => void }) {
  const [briefing, setBriefing] = useState<Briefing | 'error' | null>(null)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [acceptError, setAcceptError] = useState(false)

  useEffect(() => {
    if (!signedIn) return
    let active = true
    loadMissionBriefing(mission.id).then(
      result => { if (active) setBriefing(result) },
      () => { if (active) setBriefing('error') },
    )
    return () => { active = false }
  }, [mission.id, signedIn, attempt])

  async function accept() {
    setBusy(true)
    setAcceptError(false)
    try {
      const result = await acceptMission(mission.id)
      if (result === 'accepted') {
        setBriefing(current => current && current !== 'error' && current.kind === 'available'
          ? { ...current, accepted: true } : current)
      } else if (result === 'locked' || result === 'expired') {
        setBriefing({ kind: result })
      } else {
        setAcceptError(true)
      }
    } catch {
      setAcceptError(true)
    } finally {
      setBusy(false)
    }
  }

  const available = briefing && briefing !== 'error' && briefing.kind === 'available' ? briefing : null
  const locked = !signedIn || (briefing !== 'error' && briefing?.kind === 'locked')
  const expired = briefing !== 'error' && briefing?.kind === 'expired'
  const readError = briefing === 'error' || (available && !available.canAccept)
  return (
    <ArchiveSheet open onClose={close} title={mission.id} busy={busy} footer={
      <div className={styles.dialogFooter}>
        {locked && <>
          <p className={styles.requirement}>Multiverse Console required.</p>
          <ArchiveLinkButton href="/voyager-initiation" variant="primary" fullWidth>
            Go to Voyager Initiation <ArrowRight size={18} aria-hidden />
          </ArchiveLinkButton>
        </>}
        {!locked && !briefing && <p role="status">Checking Console access…</p>}
        {expired && <p role="status">This mission has closed. Reload the Dashboard for this week’s missions.</p>}
        {readError && <>
          <p role="status">Mission access could not be checked.</p>
          <ArchiveButton variant="secondary" onClick={() => { setBriefing(null); setAttempt(value => value + 1) }}>Try again</ArchiveButton>
        </>}
        {available?.canAccept && (available.accepted
          ? <p role="status">Mission accepted.</p>
          : <ArchiveButton loading={busy} onClick={accept}>Accept mission</ArchiveButton>)}
        {acceptError && <p role="alert">Could not accept this mission. Try again.</p>}
      </div>
    }>
      <div className={styles.dialogAuthor}><MissionAuthor author={mission.author} /><strong>{mission.author.name}</strong></div>
      <section className={styles.dialogBriefing}>
        <h3 className={styles.previewLabel}>{available ? 'Briefing' : 'Briefing Preview'}</h3>
        <p>{mission.preview}</p>
        {available && <p className={styles.instructions}>{available.briefing}</p>}
      </section>
    </ArchiveSheet>
  )
}

export function MissionBoard({ edition, signedIn, initialMission }: {
  edition: MissionEdition
  signedIn: boolean
  initialMission?: string
}) {
  const [selectedId, setSelectedId] = useState(initialMission ?? null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const selected = edition.missions.find(mission => mission.id === selectedId)

  function closeMission() {
    const row = trigger.current
    setSelectedId(null)
    requestAnimationFrame(() => row?.focus({ preventScroll: true }))
  }

  return (
    <section id="mission-board" className={styles.board} aria-labelledby="mission-board-heading">
      <header className={styles.heading}>
        <h2 id="mission-board-heading">Mission Board</h2>
        <span>Week of <time dateTime={edition.startsAt}>{weekFormat.format(new Date(edition.startsAt))}</time></span>
      </header>
      <ul className={styles.missions}>
        {edition.missions.map(mission => (
          <li key={mission.id}>
            <button type="button" className={styles.row} aria-haspopup="dialog" onClick={event => {
              trigger.current = event.currentTarget
              setSelectedId(mission.id)
            }}>
              <MissionAuthor author={mission.author} />
              <span>
                <strong className={styles.code}>{mission.id}</strong>
                <span className={styles.byline}>{mission.author.name}</span>
                <span className={styles.teaser}>{mission.teaser}</span>
              </span>
              <ChevronRight className={styles.chevron} size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {selected && <MissionDialog key={selected.id} mission={selected} signedIn={signedIn} close={closeMission} />}
    </section>
  )
}
