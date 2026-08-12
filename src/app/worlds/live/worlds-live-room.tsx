'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Check, ChevronRight, CircleHelp, Clock3, ListFilter, Radio, X } from 'lucide-react'
import { submitDreamcatcherWorld } from '@/lib/actions/worlds'
import { submitSignalResponse, type PublicInvestigation } from '@/lib/actions/signal-tasks'
import type { DreamcatcherJob, DreamcatcherRoom, DreamcatcherStatus } from '@/lib/dreamcatchers'
import styles from '../../live-observation-room.module.css'

type RoomTab = 'queue' | 'dispatch' | 'chat'
type Detail = { kind: 'queue'; job: DreamcatcherJob } | { kind: 'dispatch'; investigation: PublicInvestigation }

const CHAT = [
  { initials: 'WM', name: 'Wu Mengyi', body: 'This Dreamcatcher works in fixed rounds. A result enters Signal Dispatch when the current search settles.' },
  { initials: 'DC', name: 'Dreamcatcher', body: 'The active world remains attached to this device through every round.' },
  { initials: 'AR', name: 'Archive relay', body: 'Community choices are recorded as part of the world record.' },
]

const STATUS_LABEL: Record<DreamcatcherStatus, string> = {
  processing: 'PROCESSING',
  paused: 'PAUSED',
  idle: 'READY',
  offline: 'OFFLINE',
  awaiting_signal: 'PREPARING SIGNALS',
}

function localTime(timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, minute: '2-digit', second: '2-digit', timeZone }).format(new Date())
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
  loggedIn,
}: {
  rooms: DreamcatcherRoom[]
  investigations: PublicInvestigation[]
  loggedIn: boolean
}) {
  const [selectedSlug, setSelectedSlug] = useState(rooms[0]?.slug ?? '')
  const [activeTab, setActiveTab] = useState<RoomTab>('queue')
  const [listOpen, setListOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [dream, setDream] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [pendingChoice, setPendingChoice] = useState('')
  const [isPending, startTransition] = useTransition()
  const selected = rooms.find((room) => room.slug === selectedSlug) ?? rooms[0]
  const [clock, setClock] = useState(() => localTime(selected?.timeZone ?? 'UTC'))
  const queueFull = !!selected && selected.queue.length >= selected.queueCapacity
  const currentJob = selected?.queue.find((job) => job.status === 'processing')
  const roomInvestigations = useMemo(() => {
    const worldIds = new Set(selected?.queue.map((job) => job.worldId) ?? [])
    return investigations.filter((item) => item.worldId && worldIds.has(item.worldId))
  }, [investigations, selected])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(localTime(selected?.timeZone ?? 'UTC')), 1000)
    return () => window.clearInterval(timer)
  }, [selected?.timeZone])

  if (!selected) return null

  function chooseRoom(slug: string) {
    setSelectedSlug(slug)
    setActiveTab('queue')
    setListOpen(false)
    setStatusMessage('')
  }

  function submitDream(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dream.trim() || queueFull || isPending) return
    setStatusMessage('')
    startTransition(async () => {
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
    })
  }

  const dispatch = detail?.kind === 'dispatch' ? detail.investigation : null
  const dispatchDay = dispatch?.days.findLast((day) => !day.task.closed) ?? dispatch?.days.at(-1)

  function confirmSignal() {
    if (!dispatchDay || !pendingChoice || isPending) return
    startTransition(async () => {
      const result = await submitSignalResponse(dispatchDay.task.id, pendingChoice)
      if (!result.ok) {
        setStatusMessage(result.error ?? 'Could not record this signal.')
        return
      }
      setDetail(null)
      setPendingChoice('')
      setStatusMessage('Signal recorded. This world will return to its original Dreamcatcher.')
      window.location.reload()
    })
  }

  return (
    <main className={`main ${styles.page}`}>
      <header className={styles.roomHeader}>
        <h1>WORLDS</h1>
        <Link className={styles.archiveLink} href="/worlds">ARCHIVE <ChevronRight aria-hidden size={16} /></Link>
      </header>

      <nav className={styles.objectNav} aria-label="Dreamcatcher locations">
        <div className={styles.objectTabs} role="tablist">
          {rooms.slice(0, 3).map((room) => (
            <button aria-selected={selected.slug === room.slug} className={styles.objectTab} key={room.slug} onClick={() => chooseRoom(room.slug)} role="tab" type="button">{room.city.toUpperCase()}</button>
          ))}
        </div>
        <button aria-label="Open all Dreamcatchers" className={styles.listButton} onClick={() => setListOpen(true)} type="button"><ListFilter aria-hidden size={20} /></button>
      </nav>

      <section className={styles.liveFrame} aria-label={`${selected.city} Dreamcatcher live camera`}>
        <div className={styles.liveImage}>
          <Image alt={`${selected.name} operating at ${selected.location}`} fill loading="eager" sizes="(max-width: 768px) 100vw, 900px" src={selected.cameraImagePath} />
          <div className={styles.liveMeta}>
            <span className={styles.liveMetaItem}><span className={styles.dot} />{STATUS_LABEL[selected.status]}</span>
            <span>LIVE OBSERVATION</span>
            <span>{selected.location.toUpperCase()}</span>
            <span className={styles.liveMetaItem}><Clock3 aria-hidden size={14} />{clock}</span>
          </div>
        </div>
      </section>

      <div className={styles.desktopSplit}>
        <section className={styles.sectionPanel} aria-labelledby="device-status">
          <header className={styles.queueHeader}>
            <div><div className={styles.eyebrow}>CURRENT DEVICE STATE</div><h2 id="device-status">{STATUS_LABEL[selected.status]}</h2></div>
            <strong className={styles.queueCount}>{selected.code}</strong>
          </header>
          <div className={styles.deviceStateBody}>
            <span>{currentJob ? `ROUND ${currentJob.roundNumber} IN PROGRESS` : queueFull ? 'QUEUE AT CAPACITY' : 'ACCEPTING DREAMS'}</span>
            <span>EST. ~{selected.roundDurationMinutes} MIN / ROUND</span>
          </div>
          <div className={styles.dreamActionRow}>
            <button aria-label="How this Dreamcatcher works" className={styles.infoButton} onClick={() => setInfoOpen(true)} type="button"><CircleHelp aria-hidden size={20} /></button>
            <button className={styles.primaryButton} disabled={queueFull || selected.status === 'offline'} onClick={() => setSubmitOpen(true)} type="button">{queueFull ? 'CHOOSE ANOTHER DEVICE' : 'DESCRIBE A DREAM'}</button>
          </div>
          {statusMessage ? <p aria-live="polite" className={styles.formStatus}>{statusMessage}</p> : null}
        </section>

        <section className={styles.sectionPanel}>
          <div className={styles.contentTabs} role="tablist" aria-label="Dreamcatcher room content">
            <button aria-selected={activeTab === 'queue'} className={styles.contentTab} onClick={() => setActiveTab('queue')} role="tab" type="button">QUEUE</button>
            <button aria-selected={activeTab === 'dispatch'} className={styles.contentTab} onClick={() => setActiveTab('dispatch')} role="tab" type="button">DISPATCH {roomInvestigations.length || ''}</button>
            <button aria-selected={activeTab === 'chat'} className={styles.contentTab} onClick={() => setActiveTab('chat')} role="tab" type="button">LIVE CHAT</button>
          </div>

          {activeTab === 'queue' ? <div className={styles.queueList} role="tabpanel">
            {selected.queue.map((job, index) => <button className={styles.queueItem} data-active={job.status === 'processing'} key={job.id} onClick={() => setDetail({ kind: 'queue', job })} type="button"><span className={styles.queueIndex}>{String(index + 1).padStart(2, '0')}</span><span><strong>{job.title}</strong><small>SUBMITTED BY {job.submitter.toUpperCase()}</small></span><span className={styles.queueStatus}>{jobStatus(job)}</span></button>)}
            {!selected.queue.length ? <div className={styles.emptyRoom}>NO DREAMS WAITING · THIS DEVICE IS READY</div> : null}
          </div> : null}

          {activeTab === 'dispatch' ? <div className={styles.queueList} role="tabpanel">
            {roomInvestigations.map((investigation) => {
              const day = investigation.days.findLast((item) => !item.task.closed) ?? investigation.days.at(-1)
              const options = day?.task.assets.filter((asset) => asset.asset_role === 'option') ?? []
              return <button className={styles.dispatchItem} key={investigation.id} onClick={() => { setPendingChoice(day?.task.mySelection ?? ''); setDetail({ kind: 'dispatch', investigation }) }} type="button"><span className={styles.dispatchMosaic}>{options.slice(0, 4).map((asset) => asset.display_url || asset.processed_url ? <Image alt="" height={80} key={asset.id} src={asset.display_url ?? asset.processed_url!} width={80} unoptimized /> : null)}</span><span className={styles.dispatchCopy}><span className={styles.eyebrow}>SIGNAL DISPATCH · ROUND {day?.dayIndex ?? 1}</span><strong>{investigation.title}</strong><small>{day?.task.mySelection ? 'CHOICE RECORDED' : `${options.length} SIGNALS · COMMUNITY CHOICE`}</small></span><ChevronRight aria-hidden size={18} /></button>
            })}
            {!roomInvestigations.length ? <div className={styles.emptyRoom}>NO SIGNALS AWAITING A COMMUNITY CHOICE</div> : null}
          </div> : null}

          {activeTab === 'chat' ? <div className={styles.panelBody} role="tabpanel"><div className={styles.chatList}><div className={styles.systemMessage}><div className={styles.eyebrow}><Radio aria-hidden size={14} /> DEVICE RELAY</div><p className={styles.intro}>{STATUS_LABEL[selected.status]} · {currentJob ? currentJob.title : 'Waiting for the next dream'}</p></div>{CHAT.map((message) => <div className={styles.chatMessage} key={message.name}><span className={styles.avatar}>{message.initials}</span><span><strong>{message.name}</strong><p>{message.body}</p></span></div>)}</div></div> : null}
        </section>
      </div>

      {listOpen ? <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setListOpen(false) }}><section aria-label="All Dreamcatchers" aria-modal="true" className={styles.sheet} role="dialog"><header className={styles.sheetHeader}><h2>ALL DREAMCATCHERS</h2><button aria-label="Close Dreamcatcher list" className={styles.iconButton} onClick={() => setListOpen(false)} type="button"><X aria-hidden size={22} /></button></header><div className={styles.sheetList}>{rooms.map((room) => <button className={styles.sheetRow} key={room.slug} onClick={() => chooseRoom(room.slug)} type="button"><span className={styles.dot} style={{ background: room.status === 'offline' ? 'var(--color-fault)' : room.status === 'paused' ? 'var(--color-warn)' : 'var(--color-ok)' }} /><span><strong>{room.name.toUpperCase()}</strong><small>{room.location} · {room.code}</small></span><span className={styles.sheetStatus}>{STATUS_LABEL[room.status]}</span><ChevronRight aria-hidden size={18} /></button>)}</div></section></div> : null}

      {infoOpen ? <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInfoOpen(false) }}><section aria-label="How the Dreamcatcher works" aria-modal="true" className={styles.sheet} role="dialog"><header className={styles.sheetHeader}><h2>HOW THIS DEVICE WORKS</h2><button aria-label="Close information" className={styles.iconButton} onClick={() => setInfoOpen(false)} type="button"><X aria-hidden size={22} /></button></header><div className={styles.dialogBody}><p>This Dreamcatcher processes one world at a time in fixed rounds of roughly {selected.roundDurationMinutes} minutes. The duration is predictable, but the room does not show a countdown.</p><p>A completed round returns three or four video signals for community selection. After the choice closes, the world returns to this same Dreamcatcher for its next round.</p><p>The waiting queue has a fixed capacity. If this device stops accepting dreams, choose another location.</p></div></section></div> : null}

      {submitOpen ? <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSubmitOpen(false) }}><section aria-label="Describe a dream" aria-modal="true" className={styles.sheet} role="dialog"><header className={styles.sheetHeader}><div><div className={styles.eyebrow}>SUBMIT TO {selected.code}</div><h2>DESCRIBE A DREAM</h2></div><button aria-label="Close dream submission" className={styles.iconButton} onClick={() => setSubmitOpen(false)} type="button"><X aria-hidden size={22} /></button></header>{loggedIn ? <form className={styles.submissionForm} onSubmit={submitDream}><label htmlFor="dream-description">WHAT SHOULD THIS DEVICE SEARCH FOR?</label><textarea autoFocus className={styles.textArea} id="dream-description" maxLength={2000} minLength={20} onChange={(event) => setDream(event.target.value)} placeholder="Describe a dream or world…" rows={5} value={dream} /><button className={styles.primaryButton} disabled={dream.trim().length < 20 || isPending} type="submit">{isPending ? 'JOINING…' : `SUBMIT TO ${selected.city.toUpperCase()}`}</button>{statusMessage ? <p className={styles.formStatus}>{statusMessage}</p> : null}</form> : <div className={styles.dialogBody}><p>Applicant access or above is required to submit to a Dreamcatcher.</p><Link className={styles.primaryButton} href="/login">LOG IN TO CONTINUE</Link></div>}</section></div> : null}

      {detail ? <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null) }}><section aria-label="Dream details" aria-modal="true" className={styles.sheet} role="dialog"><header className={styles.sheetHeader}><div><div className={styles.eyebrow}>{detail.kind === 'dispatch' ? 'SIGNAL DISPATCH' : 'QUEUE RECORD'}</div><h2>{detail.kind === 'queue' ? detail.job.title : detail.investigation.title}</h2></div><button aria-label="Close dream details" className={styles.iconButton} onClick={() => setDetail(null)} type="button"><X aria-hidden size={22} /></button></header><div className={styles.dreamDetailBody}>{detail.kind === 'queue' ? <><p>{detail.job.description}</p><div className={styles.detailFacts}><span>SUBMITTED BY <strong>{detail.job.submitter.toUpperCase()}</strong></span><span>STATUS <strong>{jobStatus(detail.job)}</strong></span></div></> : dispatchDay ? <><p>{dispatchDay.task.prompt ?? 'Which video signal feels most true to this world?'}</p><div className={styles.signalCandidateGrid}>{dispatchDay.task.assets.filter((asset) => asset.asset_role === 'option').map((asset, index) => <button aria-label={`Select signal ${index + 1}`} aria-pressed={pendingChoice === asset.id} className={styles.signalCandidate} disabled={!!dispatchDay.task.mySelection || dispatchDay.task.closed} key={asset.id} onClick={() => setPendingChoice(asset.id)} type="button">{asset.processed_url ? <video autoPlay loop muted playsInline preload="metadata" src={asset.processed_url} /> : asset.display_url ? <Image alt="" fill src={asset.display_url} unoptimized /> : null}<span>SIGNAL {String(index + 1).padStart(2, '0')}</span>{pendingChoice === asset.id ? <Check aria-hidden className={styles.signalCheck} size={20} /> : null}</button>)}</div><button className={styles.primaryButton} disabled={!pendingChoice || !!dispatchDay.task.mySelection || dispatchDay.task.closed || isPending} onClick={confirmSignal} type="button">{dispatchDay.task.mySelection ? 'SIGNAL RECORDED' : 'CONFIRM SIGNAL'}</button></> : null}</div></section></div> : null}
    </main>
  )
}
