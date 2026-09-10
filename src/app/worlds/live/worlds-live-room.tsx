'use client'
import { ArchiveTabs } from '@/components/archive-tabs'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveTextarea } from '@/components/archive-input'
import { useSessionPreference } from '@/lib/use-session-preference'

import { ArchiveSheet } from '@/components/archive-sheet'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Check, ChevronRight, CircleHelp, Clock3 } from 'lucide-react'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { submitDreamcatcherWorld } from '@/lib/actions/worlds'
import { submitSignalResponse, type PublicInvestigation } from '@/lib/actions/signal-tasks'
import type { DreamcatcherJob, DreamcatcherRoom, DreamcatcherStatus } from '@/lib/dreamcatchers'
import { isDreamcatcherWorking, type DreamcatcherLiveVideoLibrary } from '@/lib/dreamcatcher-live'
import { DreamcatcherLiveVideo } from './dreamcatcher-live-video'
import { DreamcatcherChat } from './dreamcatcher-chat'
import roomStyles from './worlds-room.module.css'
import playerStyles from './dreamcatcher-live-video.module.css'
import styles from '../../live-observation-room.module.css'

type RoomTab = 'queue' | 'dispatch' | 'chat'
type Detail = { kind: 'dispatch'; investigation: PublicInvestigation }

const STATUS_LABEL: Record<DreamcatcherStatus, string> = {
  processing: 'PROCESSING',
  paused: 'PAUSED',
  idle: 'READY',
  offline: 'OFFLINE',
  awaiting_signal: 'PREPARING SIGNALS',
}

function localTime(timeZone: string, now: number) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, minute: '2-digit', second: '2-digit', timeZone }).format(new Date(now))
}

function jobStatus(job: DreamcatcherJob) {
  if (job.status === 'processing') return `ROUND ${job.roundNumber} · PROCESSING`
  if (job.status === 'returning') return `ROUND ${job.roundNumber} · RETURNING TO DEVICE`
  if (job.status === 'awaiting_vote' || job.status === 'awaiting_dispatch') return 'SIGNAL DISPATCH PENDING'
  return 'WAITING FOR DEVICE'
}

export function WorldsLiveRoom({
  rooms,
  investigations,
  liveVideoLibrary,
  liveVideoRoomSlug,
  loggedIn,
}: {
  rooms: DreamcatcherRoom[]
  investigations: PublicInvestigation[]
  liveVideoLibrary: DreamcatcherLiveVideoLibrary | null
  liveVideoRoomSlug: string
  loggedIn: boolean
}) {
  const router = useRouter()
  const [selectedSlug, setSelectedSlug] = useSessionPreference('mc:view:worlds:room', rooms[0]?.slug ?? '')
  const [activeTab, setActiveTab] = useSessionPreference<RoomTab>('mc:view:worlds:tab', 'queue')
  const [infoOpen, setInfoOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [dream, setDream] = useState('')
  const [submissionUnknown, setSubmissionUnknown] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [pendingChoice, setPendingChoice] = useState('')
  const [isPending, startTransition] = useTransition()
  const selected = rooms.find((room) => room.slug === selectedSlug) ?? rooms[0]
  const [now, setNow] = useState(rooms[0]?.observedAt ?? 0)
  const queueFull = !!selected && selected.queue.length >= selected.queueCapacity
  const currentJob = selected?.queue.find((job) => job.status === 'processing')
  const working = isDreamcatcherWorking(selected?.status ?? 'idle', selected?.queue ?? [])
  const clock = localTime(selected?.timeZone ?? 'UTC', now)
  const roomInvestigations = useMemo(() => {
    const worldIds = new Set(selected?.queue.map((job) => job.worldId) ?? [])
    return investigations.filter((item) => item.worldId && worldIds.has(item.worldId))
  }, [investigations, selected])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [router])

  if (!selected) return (
    <main className={`main ${styles.page}`} data-route-scroll>
      <header className={`${styles.roomHeader} ${styles.rootActions}`}><h1 className="sr-only">Worlds</h1><Link className={styles.archiveLink} href="/worlds">ARCHIVE</Link></header>
      <section className={styles.sectionPanel}><div className={styles.emptyRoom}>NO DREAMCATCHERS PUBLISHED<br />Please check back later. Existing worlds remain in the archive.</div></section>
    </main>
  )

  function chooseRoom(slug: string) {
    setSelectedSlug(slug)
    setActiveTab('queue')
    setStatusMessage('')
  }

  function submitDream(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dream.trim() || queueFull || isPending || submissionUnknown) return
    setStatusMessage('')
    startTransition(async () => {
      try {
      const result = await submitDreamcatcherWorld({
        dreamcatcherSlug: selected.slug,
        name: dream.trim().slice(0, 80),
        description: dream.trim(),
      })
      if (result.error) {
        setStatusMessage(result.error)
        return
      }
      setDream('')
      setSubmitOpen(false)
      setActiveTab('queue')
      setStatusMessage('Dream accepted by this device.')
      window.location.reload()
      } catch { setSubmissionUnknown(true); setStatusMessage('Result unconfirmed. Refresh the queue to check your submission before trying again.') }
    })
  }

  const dispatch = detail?.kind === 'dispatch' ? detail.investigation : null
  const dispatchDay = dispatch?.days.findLast((day) => !day.task.closed) ?? dispatch?.days.at(-1)

  function confirmSignal() {
    if (!dispatchDay || !pendingChoice || isPending || submissionUnknown) return
    startTransition(async () => {
      try {
      const result = await submitSignalResponse(dispatchDay.task.id, pendingChoice)
      if (!result.ok) {
        setStatusMessage(result.error ?? 'Could not record this signal.')
        return
      }
      setDetail(null)
      setPendingChoice('')
      setStatusMessage('Signal recorded. This world will return to its original Dreamcatcher.')
      window.location.reload()
      } catch { setSubmissionUnknown(true); setStatusMessage('Result unconfirmed. Refresh the queue to check your submission before trying again.') }
    })
  }

  return (
    <main className={`main ${styles.page}`} data-route-scroll>
      <h1 className="sr-only">Worlds</h1>

      <div className="archive-root-actions"><ArchiveLinkButton href="/worlds" variant="ghost" aria-label="Archive — explore all Worlds">ARCHIVE <ChevronRight aria-hidden size={18} /></ArchiveLinkButton></div>
      <nav className={`${styles.objectNav} ${roomStyles.navigation}`} aria-label="Dreamcatcher locations">
        <ArchiveTabs mode="filter" ariaLabel="Dreamcatcher location" activeId={selected.slug}
          items={rooms.map(room=>({id:room.slug,label:room.city.toUpperCase()}))} onChange={chooseRoom} />

      </nav>

      <div className={styles.workspace}><div className={styles.workspaceMedia}>
      <section className={`${styles.liveFrame} ${playerStyles.frame}`} aria-label={`${selected.city} Dreamcatcher state video`}>
        <div className={styles.liveImage}>
          <DreamcatcherLiveVideo key={selected.id}
            fallbackImage={selected.cameraImagePath}
            label={`${selected.name} operating at ${selected.location}`}
            library={selected.slug === liveVideoRoomSlug ? liveVideoLibrary : null}
            working={working} />
          <div className={playerStyles.metadata}>
            <span className={playerStyles.location}>{selected.location.toUpperCase()}</span>
            <span className={playerStyles.clock} aria-label={`Local time in ${selected.city}: ${clock}`}><Clock3 aria-hidden size={14} />{clock}</span>
          </div>
        </div>
      </section>

      </div><div className={`${styles.desktopSplit} ${styles.workspaceDetails}`}>
        <section className={styles.sectionPanel} aria-labelledby="device-status">
          <header className={styles.queueHeader}>
            <div><div className={styles.eyebrow}>CURRENT DEVICE STATE</div><h2 id="device-status">{STATUS_LABEL[selected.status]}</h2></div>
            <strong className={styles.queueCount}>{selected.code}</strong>
          </header>
          <div className={styles.deviceStateBody}>
            <span>{selected.status === 'offline' ? 'NOT ACCEPTING DREAMS' : selected.status === 'paused' ? 'ROUNDS PAUSED · QUEUE OPEN' : currentJob ? `ROUND ${currentJob.roundNumber} IN PROGRESS` : queueFull ? 'QUEUE AT CAPACITY' : 'ACCEPTING DREAMS'}</span>
            <span>EST. ~{selected.roundDurationMinutes} MIN / ROUND</span>
          </div>
          <div className={styles.dreamActionRow}>
            <ArchiveButton variant="ghost" aria-label="How this Dreamcatcher works" className={styles.infoButton} onClick={() => setInfoOpen(true)} type="button"><CircleHelp aria-hidden size={20} /></ArchiveButton>
            <ArchiveButton variant="primary" className={styles.primaryButton} disabled={queueFull || selected.status === 'offline'} onClick={() => setSubmitOpen(true)} type="button">{queueFull ? 'CHOOSE ANOTHER DEVICE' : 'DESCRIBE A DREAM'}</ArchiveButton>
          </div>
          {statusMessage ? <p aria-live="polite" className={styles.formStatus}>{statusMessage}</p> : null}
        </section>

        <section className={styles.sectionPanel}>
          <ArchiveTabs ariaLabel="Dreamcatcher room content" activeId={activeTab}
            items={[{id:'queue',label:'QUEUE'},{id:'dispatch',label:'DISPATCH',count:roomInvestigations.length},{id:'chat',label:'LIVE CHAT'}].map(item=>({...item,panelId:`world-room-${item.id}`}))}
            onChange={id => setActiveTab(id as typeof activeTab)} />

          {activeTab === 'queue' ? <div className={styles.queueList} role="tabpanel" id={`world-room-${activeTab}`} aria-labelledby={`world-room-${activeTab}-tab`}>
            {selected.queue.map((job, index) => <Link className={`${styles.queueItem} ${roomStyles.queueLink}`} data-active={job.status === 'processing'} key={job.id} href={`/worlds/${encodeURIComponent(job.worldId)}`} prefetch={false}><span className={styles.queueIndex}>{String(index + 1).padStart(2, '0')}</span><span><strong>{job.title}</strong><small>SUBMITTED BY {job.submitter.toUpperCase()}</small></span><span className={styles.queueStatus}>{jobStatus(job)} <ChevronRight aria-hidden size={14} /></span></Link>)}
            {!selected.queue.length ? <div className={styles.emptyRoom}>NO DREAMS WAITING · {STATUS_LABEL[selected.status]}</div> : null}
          </div> : null}

          {activeTab === 'dispatch' ? <div className={styles.queueList} role="tabpanel" id={`world-room-${activeTab}`} aria-labelledby={`world-room-${activeTab}-tab`}>
            {roomInvestigations.map((investigation) => {
              const day = investigation.days.findLast((item) => !item.task.closed) ?? investigation.days.at(-1)
              const options = day?.task.assets.filter((asset) => asset.asset_role === 'option') ?? []
              return <ArchiveButton variant="secondary" className={styles.dispatchItem} key={investigation.id} onClick={() => { setPendingChoice(day?.task.mySelection ?? ''); setDetail({ kind: 'dispatch', investigation }) }} type="button"><span className={styles.dispatchMosaic}>{options.slice(0, 4).map((asset) => asset.display_url || asset.processed_url ? <Image alt="" height={80} key={asset.id} src={asset.display_url ?? asset.processed_url!} width={80} unoptimized /> : null)}</span><span className={styles.dispatchCopy}><span className={styles.eyebrow}>SIGNAL DISPATCH · ROUND {day?.dayIndex ?? 1}</span><strong>{investigation.title}</strong><small>{day?.task.mySelection ? 'CHOICE RECORDED' : `${options.length} SIGNALS · COMMUNITY CHOICE`}</small></span><ChevronRight aria-hidden size={18} /></ArchiveButton>
            })}
            {!roomInvestigations.length ? <div className={styles.emptyRoom}>NO SIGNALS AWAITING A COMMUNITY CHOICE</div> : null}
          </div> : null}

          {activeTab === 'chat' ? <div role="tabpanel" id={`world-room-${activeTab}`} aria-labelledby={`world-room-${activeTab}-tab`}><DreamcatcherChat key={selected.id} roomId={selected.id} city={selected.city} timeZone={selected.timeZone} /></div> : null}
        </section>
      </div>


      </div>
      {infoOpen ? <ArchiveSheet open onClose={() => setInfoOpen(false)} title="How the Dreamcatcher works" dirty={false} busy={false}><div className={styles.dialogBody}><p>This Dreamcatcher processes one world at a time in fixed rounds of roughly {selected.roundDurationMinutes} minutes. The duration is predictable, but the room does not show a countdown.</p><p>A completed round returns three or four video signals for community selection. After the choice closes, the world returns to this same Dreamcatcher for its next round.</p><p>The waiting queue has a fixed capacity. If this device stops accepting dreams, choose another location.</p></div></ArchiveSheet> : null}

      {submitOpen ? <ArchiveSheet open onClose={() => setSubmitOpen(false)} title="Describe a dream" dirty={!submissionUnknown && !!dream.trim()} busy={isPending}>{loggedIn ? <form className={styles.submissionForm} onSubmit={submitDream}><label htmlFor="dream-description">WHAT SHOULD THIS DEVICE SEARCH FOR?</label><ArchiveTextarea autoFocus className={styles.textArea} id="dream-description" maxLength={2000} minLength={20} onChange={(event) => setDream(event.target.value)} placeholder="Describe a dream or world…" rows={5} value={dream} /><ArchiveButton variant="primary" className={styles.primaryButton} disabled={dream.trim().length < 20 || isPending || submissionUnknown} type="submit">{isPending ? 'JOINING…' : `SUBMIT TO ${selected.city.toUpperCase()}`}</ArchiveButton>{statusMessage ? <p role="status" className={styles.formStatus}>{statusMessage}</p> : null}{submissionUnknown && <ArchiveButton variant="primary" type="button" className={styles.primaryButton} onClick={() => window.location.reload()}>Reload and check queue</ArchiveButton>}</form> : <div className={styles.dialogBody}><p>Applicant access or above is required to submit to a Dreamcatcher.</p><Link className={styles.primaryButton} href="/login">LOG IN TO CONTINUE</Link></div>}</ArchiveSheet> : null}

      {detail ? <ArchiveSheet open onClose={() => setDetail(null)} title="Dream details" dirty={!submissionUnknown && !!pendingChoice && !dispatchDay?.task.mySelection} busy={isPending}><div className={styles.dreamDetailBody}>{dispatchDay ? <><p>{dispatchDay.task.prompt ?? 'Which video signal feels most true to this world?'}</p><div className={styles.signalCandidateGrid}>{dispatchDay.task.assets.filter((asset) => asset.asset_role === 'option').map((asset, index) => <ArchiveButton variant="ghost" aria-label={`Select signal ${index + 1}`} aria-pressed={pendingChoice === asset.id} className={styles.signalCandidate} disabled={!!dispatchDay.task.mySelection || dispatchDay.task.closed} key={asset.id} onClick={() => setPendingChoice(asset.id)} type="button">{asset.processed_url ? <video autoPlay loop muted playsInline preload="metadata" src={asset.processed_url} /> : asset.display_url ? <Image alt="" fill src={asset.display_url} unoptimized /> : null}<span>SIGNAL {String(index + 1).padStart(2, '0')}</span>{pendingChoice === asset.id ? <Check aria-hidden className={styles.signalCheck} size={20} /> : null}</ArchiveButton>)}</div><ArchiveButton variant="primary" className={styles.primaryButton} disabled={!pendingChoice || !!dispatchDay.task.mySelection || dispatchDay.task.closed || isPending || submissionUnknown} onClick={confirmSignal} type="button">{dispatchDay.task.mySelection ? 'SIGNAL RECORDED' : 'CONFIRM SIGNAL'}</ArchiveButton>{statusMessage && <p role="status" className={styles.formStatus}>{statusMessage}</p>}{submissionUnknown && <ArchiveButton variant="primary" type="button" className={styles.primaryButton} onClick={() => window.location.reload()}>Reload and check signal</ArchiveButton>}</> : null}</div></ArchiveSheet> : null}
    </main>
  )
}
