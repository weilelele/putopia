'use client'
import { useCallback, useEffect, useState } from 'react'
import { History, Info } from 'lucide-react'
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
import { getFirstObservers, getWorldReports } from '@/lib/actions/world-reports'
import type { ReportKind, WorldReportView } from '@/lib/world-reports'
import type { World } from '@/types/database'

type Tab = 'observed' | 'anomalies' | 'discussion'

function firstSentence(text: string) {
  const match = text.trim().match(/^[\s\S]+?[.!?。！？](\s|$)/)
  return (match ? match[0] : text).trim()
}

function ReportList({ reports, empty }: { reports: WorldReportView[]; empty: string }) {
  if (!reports.length) return <div className="archive-empty-state">{empty}</div>
  return (
    <ul className="world-reports">
      {reports.map((r) => (
        <li key={r.id} className="world-report">
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
        </li>
      ))}
    </ul>
  )
}

/** Tuning history: the signal chosen each day, ending in the final form. Loaded on demand. */
function TuningProcessSheet({ worldId, onClose }: { worldId: string; onClose: () => void }) {
  const [reel, setReel] = useState<ArchiveReel | null>(null)
  useEffect(() => {
    let live = true
    getArchiveReel(worldId)
      .then((r) => { if (live) setReel(r) })
      .catch(() => { if (live) setReel({ days: [], finalAssets: [], lockedAt: null }) })
    return () => { live = false }
  }, [worldId])
  const days = (reel?.days ?? []).filter((d) => d.winner)
  return (
    <ArchiveSheet open onClose={onClose} title="Tuning process">
      <div className="world-tuning">
        {reel === null && <p>LOADING…</p>}
        {reel && !days.length && !reel.finalAssets.length && <p>No tuning history was recorded for this world.</p>}
        {days.map((d) => (
          <figure key={d.dayIndex} className="world-tuning__step">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.winner!.display_url || d.winner!.processed_url || ''} alt={`Day ${d.dayIndex + 1} chosen signal`} />
            <figcaption>DAY {d.dayIndex + 1}{d.dispatchAt ? ` · ${d.dispatchAt.slice(0, 10)}` : ''}</figcaption>
          </figure>
        ))}
        {reel?.finalAssets.map((f) => (
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
  const [reportKind, setReportKind] = useState<ReportKind | null>(null)
  const [observed, setObserved] = useState<WorldReportView[]>([])
  const [anomalous, setAnomalous] = useState<WorldReportView[]>([])
  const [observer, setObserver] = useState<{ id: string; name: string; avatar: string | null; image: string | null } | null>(null)
  const [discovererAvatar, setDiscovererAvatar] = useState<string | null>(null)
  const [discussions, setDiscussions] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const byline = worldByline(world, observer)
  const tags = worldTags(world, isFuzzyWorld(world.id, observer))
  const summary = firstSentence(world.description)
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
          <ArchiveButton variant="ghost" size="compact" className="world-detail__icon" aria-label="View tuning process" onClick={() => setTuningOpen(true)}><History aria-hidden size={22} /></ArchiveButton>
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
        {tab === 'observed' && <ReportList reports={observed} empty={loaded ? 'NO OBSERVATIONS REPORTED YET' : 'LOADING…'} />}
        {tab === 'anomalies' && <ReportList reports={anomalous} empty={loaded ? 'NO ANOMALIES REPORTED YET' : 'LOADING…'} />}
        {tab === 'discussion' && <CommentThread subjectType="world" subjectId={world.id} subjectTitle={name} posthogEvent="world_comment_sent" allowImages />}
      </div>

      {infoOpen && (
        <ArchiveSheet open onClose={() => setInfoOpen(false)} title="Observation details">
          <div className="world-info">
            <dl>
              <div><dt>WORLD</dt><dd>{name} · {world.id}</dd></div>
              <div><dt>FIRST OBSERVED</dt><dd>{observer ? observer.name : 'Not yet observed'}</dd></div>
              <div><dt>DATE</dt><dd>{world.discovery_date}</dd></div>
              <div><dt>TAGS</dt><dd>{tags.join(' · ')}</dd></div>
            </dl>
            <p>{world.description}</p>
          </div>
        </ArchiveSheet>
      )}
      {tuningOpen && <TuningProcessSheet worldId={world.id} onClose={() => setTuningOpen(false)} />}
      {reportKind && (
        <WorldReportSheet key={reportKind} open kind={reportKind} worldId={world.id} worldName={name} canReport={canReport}
          onClose={() => setReportKind(null)}
          onSubmitted={() => { setTab(reportKind === 'observation' ? 'observed' : 'anomalies'); void load() }} />
      )}
    </>
  )
}
