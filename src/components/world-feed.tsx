'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { LazyImage } from '@/components/lazy-image'
import { ArchiveButton } from '@/components/archive-button'
import { WorldByline } from '@/components/world-byline'
import { WorldReportSheet } from '@/components/world-report-sheet'
import { useDeviceReporter } from '@/lib/use-device-reporter'
import type { ReportKind } from '@/lib/world-reports'
import { orderedFilterTags, type WorldByline as Byline } from '@/lib/world-presentation'

export type FeedWorld = {
  id: string
  name: string
  cover: string | null
  byline: Byline
  avatar: string | null
  tags: string[]
  seen: number
  anomalies: number
  featured?: boolean
}

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return <span />
  return <span className="world-tags">{tags.map((t) => <span key={t} className="world-tag">{t}</span>)}</span>
}

function Stat({ value, label }: { value: number; label: string }) {
  return <span className="world-stat"><strong>{value}</strong><span>{label}</span></span>
}

function WorldRow({ world, open, onToggle, onReport }: {
  world: FeedWorld; open: boolean; onToggle: () => void; onReport: (kind: ReportKind) => void
}) {
  const panelId = `world-actions-${world.id}`
  return (
    <li className={`world-row${world.featured ? ' world-row--featured' : ''}${open ? ' is-open' : ''}`}>
      {world.featured && <div className="world-row__flag">WORTH WATCHING NOW</div>}
      {/* The whole card toggles; the byline is its own button, so the toggle is a div with a real button for keyboards. */}
      <div className="world-row__main" onClick={onToggle}>
        <span className="world-row__thumb">
          {world.cover
            ? <LazyImage src={world.cover} sizes="(min-width: 768px) 240px, 40vw" style={{ objectFit: 'cover', display: 'block' }} />
            : <span className="world-fuzzy world-fuzzy--thumb"><span>SIGNAL<br />UNRESOLVED</span></span>}
        </span>
        <span className="world-row__info">
          <span className="world-row__top">
            <span className="world-row__id">{world.id}</span>
            <button type="button" className="world-row__toggle" aria-expanded={open} aria-controls={panelId}
              aria-label={`${open ? 'Hide' : 'Show'} actions for ${world.name}`} onClick={(e) => { e.stopPropagation(); onToggle() }}>
              <ChevronDown aria-hidden size={18} className="world-row__chevron" />
            </button>
          </span>
          <span className="world-row__name">{world.name}</span>
          <span className="world-row__by" onClick={(e) => e.stopPropagation()}><WorldByline byline={world.byline} avatar={world.avatar} /></span>
        </span>
      </div>
      <div className="world-row__foot">
        <span className="world-stats">
          <Stat value={world.seen} label="SEEN" />
          <Stat value={world.anomalies} label="ANOMALIES" />
        </span>
        <Tags tags={world.tags} />
      </div>
      {open && (
        <div className="world-actions world-row__actions" id={panelId}>
          <ArchiveButton variant="secondary" size="compact" onClick={() => onReport('observation')}>REPORT OBSERVATION</ArchiveButton>
          <ArchiveButton variant="secondary" size="compact" onClick={() => onReport('anomaly')}>REPORT ANOMALY</ArchiveButton>
          <Link className="archive-button archive-button--primary archive-button--compact world-actions__lead" href={`/worlds/${encodeURIComponent(world.id)}`} prefetch={false}>MORE INFO →</Link>
        </div>
      )}
    </li>
  )
}

/** Observe list: key world first, tag filter, tap a row to reveal its actions. */
export function WorldFeed({ worlds }: { worlds: FeedWorld[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [report, setReport] = useState<{ world: FeedWorld; kind: ReportKind } | null>(null)
  const router = useRouter()
  const canReport = useDeviceReporter()
  const allTags = useMemo(() => orderedFilterTags(worlds.flatMap((w) => w.tags)), [worlds])
  const visible = tag ? worlds.filter((w) => w.tags.includes(tag)) : worlds

  return (
    <>
      <div className="world-filter" role="group" aria-label="Filter worlds by tag">
        {[null, ...allTags].map((t) => (
          <button key={t ?? 'all'} type="button" className={`world-filter__chip${t === tag ? ' is-active' : ''}`}
            aria-pressed={t === tag} onClick={() => setTag(t)}>{t ?? 'ALL'}</button>
        ))}
      </div>
      <ul className="world-list">
        {visible.map((world) => (
          <WorldRow key={world.id} world={world} open={openId === world.id}
            onToggle={() => setOpenId((id) => (id === world.id ? null : world.id))}
            onReport={(kind) => setReport({ world, kind })} />
        ))}
      </ul>
      {!visible.length && <div className="archive-empty-state">NO WORLDS WITH THIS TAG</div>}
      {report && (
        <WorldReportSheet key={`${report.world.id}-${report.kind}`} open kind={report.kind} worldId={report.world.id}
          worldName={report.world.name} canReport={canReport} onClose={() => setReport(null)} onSubmitted={() => router.refresh()} />
      )}
    </>
  )
}
