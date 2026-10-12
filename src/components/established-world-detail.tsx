'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { History, Info } from 'lucide-react'
import { ReportBlockActions } from '@/components/report-block-actions'
import { LazyImage } from '@/components/lazy-image'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveTabs } from '@/components/archive-tabs'
import { CommentThread } from '@/components/comment-thread'
import { WorldReportSheet } from '@/components/world-report-sheet'
import { getArchiveReel } from '@/lib/actions/signal-tasks'
import type { ArchiveReel } from '@/lib/actions/signal-tasks'
import { WorldByline } from '@/components/world-byline'
import { getDiscovererAvatars } from '@/lib/actions/worlds'
import { getCommentCountsBulk } from '@/lib/actions/comments'
import { isFuzzyWorld, isOfficialWorld, worldByline, worldTags } from '@/lib/world-presentation'
import { useDeviceReporter } from '@/lib/use-device-reporter'
import { designateFirstObserver, getFirstObservers, getObserveOrder, getWorldReports } from '@/lib/actions/world-reports'
import { useAuth } from '@/lib/auth-context'
import { useSwipe } from '@/lib/use-swipe'
import type { ReportKind, WorldReportView } from '@/lib/world-reports'
import type { World } from '@/types/database'

type Tab = 'observed' | 'anomalies' | 'discussion'

function firstSentence(text: string) {
  const match = text.trim().match(/^[\s\S]+?[.!?。！？](\s|$)/)
  return (match ? match[0] : text).trim()
}

function ReportList({ reports, empty, onDesignate, onChanged }: {
  reports: WorldReportView[]
  empty: string
  /** Called after a report or block so the list reloads without the hidden posts. */
  onChanged: () => void
  /** Architects on a fuzzy official world: designate or clear the first observer. */
  onDesignate?: (report: WorldReportView) => void
}) {
  const { user } = useAuth()
  if (!reports.length) return <div className="archive-empty-state">{empty}</div>
  return (
    <ul className="world-reports">
      {reports.map((r) => (
        <li key={r.id} className={`world-report${r.isFirstObserver ? ' is-first' : ''}`}>
          {r.isFirstObserver && <span className="world-report__flag">FIRST OBSERVER</span>}
          <WorldByline byline={{ name: r.authorName, profileId: r.authorId, pending: false }} avatar={r.authorAvatar} label={r.at} />
          <span>{r.body}</span>
          {!!r.images.length && (
            <span className="world-report__images">
              {r.images.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="world-report__image" aria-label="Open image">
                  <LazyImage src={url} sizes="(min-width: 768px) 240px, 40vw" style={{ objectFit: 'cover', display: 'block' }} />
                </a>
              ))}
            </span>
          )}
          <ReportBlockActions target={{ kind: 'world_report', id: r.id }} authorName={r.authorName} isOwn={!!user.id && user.id === r.authorId}
            onChanged={onChanged} />
          {onDesignate && (
            <ArchiveButton variant="secondary" size="compact" onClick={() => onDesignate(r)}>
              {r.isFirstObserver ? 'REMOVE FIRST OBSERVER' : 'DESIGNATE FIRST OBSERVER'}
            </ArchiveButton>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Tuning history: the signal chosen each day, ending in the final form. Loaded on demand. */
function TuningProcessSheet({ reel, onClose }: { reel: ArchiveReel; onClose: () => void }) {
  const days = (reel?.days ?? []).filter((d) => d.winner)
  return (
    <ArchiveSheet open onClose={onClose} title="Tuning process">
      <div className="world-tuning">
        {days.map((d) => (
          <figure key={d.dayIndex} className="world-tuning__step">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.winner!.display_url || d.winner!.processed_url || ''} alt={`Day ${d.dayIndex + 1} chosen signal`} />
            <figcaption>DAY {d.dayIndex + 1}{d.dispatchAt ? ` · ${d.dispatchAt.slice(0, 10)}` : ''}</figcaption>
          </figure>
        ))}
        {reel.finalAssets.map((f) => (
          <figure key={f.id} className="world-tuning__step world-tuning__step--final">
            {f.media === 'video'
              ? <video src={f.url} poster={f.posterUrl ?? undefined} autoPlay loop muted playsInline />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={f.url} alt="Final form" />}
            <figcaption>FINAL FORM</figcaption>
          </figure>
        ))}
      </div>
    </ArchiveSheet>
  )
}

export function EstablishedWorldDetail({ world }: { world: World }) {
  const name = world.name_en || world.name
  const canReport = useDeviceReporter()
  const [tab, setTab] = useState<Tab>('observed')
  const [infoOpen, setInfoOpen] = useState(false)
  const [tuningOpen, setTuningOpen] = useState(false)
  const [tuningReel, setTuningReel] = useState<ArchiveReel | null>(null)
  const [reportKind, setReportKind] = useState<ReportKind | null>(null)
  const [designating, setDesignating] = useState<WorldReportView | null>(null)
  const [designateBusy, setDesignateBusy] = useState(false)
  const [designateError, setDesignateError] = useState('')
  const { user } = useAuth()
  const router = useRouter()
  const [order, setOrder] = useState<string[]>([])
  const [observed, setObserved] = useState<WorldReportView[]>([])
  const [anomalous, setAnomalous] = useState<WorldReportView[]>([])
  const [observer, setObserver] = useState<{ id: string; name: string; avatar: string | null; image: string | null } | null>(null)
  const [discovererAvatar, setDiscovererAvatar] = useState<string | null>(null)
  const [discussions, setDiscussions] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const byline = worldByline(world, observer)
  const tags = worldTags(world, isFuzzyWorld(world.id, observer))
  const summary = firstSentence(world.description)
  const fuzzy = isFuzzyWorld(world.id, observer)
  // Only architects see the designation controls, and only on official worlds.
  const canDesignate = user.role === 'architect' && isOfficialWorld(world.id)

  async function confirmDesignation() {
    if (!designating) return
    setDesignateBusy(true); setDesignateError('')
    try {
      const result = await designateFirstObserver(world.id, designating.isFirstObserver ? null : designating.id)
      if (result.error) { setDesignateError(result.error); return }
      setDesignating(null)
      await load()
    } catch { setDesignateError('Result unconfirmed. Refresh to check before trying again.') }
    finally { setDesignateBusy(false) }
  }
  const avatar = isOfficialWorld(world.id) ? observer?.avatar ?? null : discovererAvatar
  // The first observer's photo becomes the world's picture until it has its own.
  const heroImage = world.image_path ?? observer?.image ?? null

  const load = useCallback(async () => {
    const [obs, ano, first] = await Promise.all([
      getWorldReports(world.id, 'observation'), getWorldReports(world.id, 'anomaly'), getFirstObservers([world.id]),
    ])
    setObserved(obs); setAnomalous(ano); setObserver(first[world.id] ?? null); setLoaded(true)
  }, [world.id])

  useEffect(() => { void Promise.resolve().then(load).catch(() => setLoaded(true)) }, [load])

  // Swiping left/right walks the Observe list, with no on-screen hint.
  useEffect(() => {
    let live = true
    getObserveOrder().then((ids) => { if (live) setOrder(ids) }).catch(() => {})
    return () => { live = false }
  }, [])
  const at = order.indexOf(world.id)
  const neighbours = { prev: at > 0 ? order[at - 1] : null, next: at >= 0 && at < order.length - 1 ? order[at + 1] : null }
  useEffect(() => {
    for (const id of [neighbours.prev, neighbours.next]) if (id) router.prefetch(`/worlds/${encodeURIComponent(id)}`)
  }, [neighbours.prev, neighbours.next, router])
  useSwipe((direction) => {
    const target = neighbours[direction]
    if (target) router.push(`/worlds/${encodeURIComponent(target)}`)
  })

  // The tuning-process entry only exists once tuning is complete, i.e. the world has a final form.
  useEffect(() => {
    let live = true
    getArchiveReel(world.id)
      .then((r) => { if (live && r.finalAssets.length > 0) setTuningReel(r) })
      .catch(() => {})
    return () => { live = false }
  }, [world.id])

  useEffect(() => {
    if (!world.discoverer_id || isOfficialWorld(world.id)) return
    let live = true
    getDiscovererAvatars([world.discoverer_id]).then((map) => { if (live) setDiscovererAvatar(map[world.discoverer_id!] ?? null) }).catch(() => {})
    return () => { live = false }
  }, [world.id, world.discoverer_id])

  useEffect(() => {
    let live = true
    getCommentCountsBulk('world', [world.id]).then((map) => { if (live) setDiscussions(map[world.id] ?? 0) }).catch(() => {})
    return () => { live = false }
  }, [world.id])

  return (
    <>
      {/* The first discoverer's photo leads the page, full width. */}
      <div className="world-detail__hero">
        {heroImage
          ? <LazyImage src={heroImage} alt={name} sizes="(min-width: 768px) 720px, 100vw" style={{ objectFit: 'cover', display: 'block' }} />
          : <div className="world-fuzzy"><strong>FUZZY SIGNAL</strong><span>Nobody has resolved this world yet. Be the first to observe it.</span></div>}
      </div>

      <header className="world-detail__title">
        <span className="world-row__id">{world.id}</span>
        <div className="world-detail__heading">
          <h1>{name}</h1>
          {tuningReel && <ArchiveButton variant="ghost" size="compact" className="world-detail__icon" aria-label="View tuning process" onClick={() => setTuningOpen(true)}><History aria-hidden size={22} /></ArchiveButton>}
        </div>
        <span className="world-tags">{tags.map((t) => <span key={t} className="world-tag">{t}</span>)}</span>
      </header>

      <div className="world-detail__who">
        <WorldByline byline={byline} avatar={avatar} label={byline.pending ? 'FIRST OBSERVER' : 'DISCOVERED BY'} />
      </div>

      <div className="world-detail__summary">
        <p>{summary}</p>
        <ArchiveButton variant="ghost" size="compact" className="world-detail__icon" aria-label="All observation details" onClick={() => setInfoOpen(true)}><Info aria-hidden size={20} /></ArchiveButton>
      </div>

      <div className="world-actions world-detail__actions">
        <ArchiveButton variant="secondary" size="compact" onClick={() => setReportKind('observation')}>REPORT OBSERVATION</ArchiveButton>
        <ArchiveButton variant="secondary" size="compact" onClick={() => setReportKind('anomaly')}>REPORT ANOMALY</ArchiveButton>
      </div>

      <ArchiveTabs ariaLabel="World reports" activeId={tab} onChange={(id) => setTab(id as Tab)}
        items={[
          { id: 'observed', label: 'OBSERVED', count: observed.length },
          { id: 'anomalies', label: 'ANOMALIES', count: anomalous.length },
          { id: 'discussion', label: 'DISCUSSION', count: discussions },
        ]} />

      <div className="world-detail__panel">
        {tab === 'observed' && fuzzy && isOfficialWorld(world.id) && (
          <p className="world-detail__notice">Observations are reviewed by the team. The first accepted one becomes this world&apos;s first observer, and their photo becomes its picture.</p>
        )}
        {tab === 'observed' && <ReportList reports={observed} empty={loaded ? 'NO OBSERVATIONS REPORTED YET' : 'LOADING…'} onDesignate={canDesignate ? setDesignating : undefined} onChanged={() => void load()} />}
        {tab === 'anomalies' && <ReportList reports={anomalous} empty={loaded ? 'NO ANOMALIES REPORTED YET' : 'LOADING…'} onChanged={() => void load()} />}
        {tab === 'discussion' && <CommentThread subjectType="world" subjectId={world.id} subjectTitle={name} posthogEvent="world_comment_sent" allowImages />}
      </div>

      {infoOpen && (
        <ArchiveSheet open onClose={() => setInfoOpen(false)} title="Observation details">
          <div className="world-info">
            <dl>
              <div><dt>WORLD</dt><dd>{name} · {world.id}</dd></div>
              <div><dt>FIRST OBSERVED</dt><dd>{observer ? observer.name : isOfficialWorld(world.id) ? 'Not yet observed' : byline.name}</dd></div>
              <div><dt>DATE</dt><dd>{world.discovery_date}</dd></div>
              <div><dt>TAGS</dt><dd>{tags.join(' · ')}</dd></div>
            </dl>
            <p>{world.description}</p>
          </div>
        </ArchiveSheet>
      )}
      {designating && (
        <ArchiveSheet open onClose={() => setDesignating(null)} title={designating.isFirstObserver ? 'Remove first observer' : 'Designate first observer'} busy={designateBusy}>
          <div className="world-info">
            <p>
              {designating.isFirstObserver
                ? `${designating.authorName} will no longer be this world's first observer, and ${name} returns to a fuzzy signal.`
                : `${designating.authorName} becomes the first observer of ${name}. Their name appears as "by" and their first photo becomes the world's picture.`}
            </p>
            {designateError && <p role="alert">{designateError}</p>}
            <ArchiveButton variant="primary" fullWidth loading={designateBusy} onClick={() => void confirmDesignation()}>
              {designating.isFirstObserver ? 'REMOVE' : 'DESIGNATE'}
            </ArchiveButton>
          </div>
        </ArchiveSheet>
      )}
      {tuningOpen && tuningReel && <TuningProcessSheet reel={tuningReel} onClose={() => setTuningOpen(false)} />}
      {reportKind && (
        <WorldReportSheet key={reportKind} open kind={reportKind} worldId={world.id} worldName={name} canReport={canReport}
          onClose={() => setReportKind(null)}
          onSubmitted={() => { setTab(reportKind === 'observation' ? 'observed' : 'anomalies'); void load() }} />
      )}
    </>
  )
}
