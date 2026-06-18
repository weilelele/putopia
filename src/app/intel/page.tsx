'use client'

import Link from 'next/link'
import { MessageSquare, Plus } from 'lucide-react'
import { getAllIntel } from '@/lib/actions/intel'
import { getCommentCountsBulk } from '@/lib/actions/comments'
import { useEffect, useState } from 'react'
import type { IntelWithAvatar } from '@/types/database'
import { SectionTracker } from '@/components/section-tracker'
import { useAuth } from '@/lib/auth-context'
import { CreateIntelModal } from './CreateIntelModal'
import { FilterBar } from '@/components/filter-bar'

const TAG_COLOR: Record<string, string> = {
  NOTICE: 'var(--color-star-dim)',
  DEVICE: 'var(--color-nucleus)',
  ORG:    'var(--color-nebula)',
}

type FilterTab = 'all' | 'public' | 'classified'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Classified wall — shown when non-Voyager selects the classified filter ───
function ClassifiedWall() {
  return (
    <div style={{
      maxWidth: '720px',
      border: '1px solid rgba(255,107,53,0.25)',
      background: 'rgba(232,93,4,0.03)',
      padding: '3.5rem 2rem',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
        letterSpacing: '0.25em', color: 'rgba(245,245,245,0.2)',
        marginBottom: '1rem',
      }}>{"// ACCESS RESTRICTED"}</div>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)',
        color: 'rgba(245,245,245,0.5)', lineHeight: 1.8, marginBottom: '1.75rem',
      }}>
        This content is classified. Access restricted to Voyager and above.
      </p>
      <Link
        href="/voyager-pack"
        style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
          letterSpacing: '0.18em', color: '#FF6B35',
          border: '1px solid rgba(255,107,53,0.45)',
          padding: '0.5rem 1.75rem', textDecoration: 'none',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,107,53,0.08)')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        BECOME A VOYAGER →
      </Link>
    </div>
  )
}

// ─── Individual Intel card ────────────────────────────────────────────────────
function IntelCard({ entry, commentCount = 0 }: { entry: IntelWithAvatar; commentCount?: number }) {
  const color    = TAG_COLOR[entry.tag] ?? 'var(--color-star-dim)'
  const hasImage = (entry.images?.length ?? 0) > 0
  const extraImgs = (entry.images?.length ?? 0) - 1
  const name     = entry.publisher_name ?? 'PUTOPIA COLLECTIVE'

  return (
    <Link
      href={`/intel/${entry.id}`}
      className="block"
      style={{ textDecoration: 'none', marginBottom: '12px' }}
    >
      <div
        style={{ background: '#151B3A', border: '1px solid rgba(255,107,53,0.16)', overflow: 'hidden', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,107,53,0.16)')}
      >
        {/* Publisher bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: '#0F1430', borderBottom: '1px solid rgba(255,107,53,0.16)' }}>

          {/* Avatar */}
          {entry.publisher_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.publisher_avatar_url}
              alt={name}
              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(138,154,181,0.25)' }}
            />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: `${color}18`, border: `1px solid ${color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, color,
            }}>
              {getInitials(name)}
            </div>
          )}

          {/* Name + date */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#F5F5F5', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            <div style={{ color: 'rgba(245,245,245,0.35)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)' }}>
              {formatDate(entry.timestamp)}
            </div>
          </div>

          {/* Colored dot (replaces text tag badge) */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: color, flexShrink: 0,
            boxShadow: `0 0 6px ${color}`,
          }} />

        </div>

        {/* Content row: text left, image right */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>

          {/* Text */}
          <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--fs-body)', color: '#F5F5F5', marginBottom: '8px', lineHeight: 1.4 }}>
              {entry.title}
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'rgba(245,245,245,0.55)', lineHeight: 1.7, margin: 0 }}>
              {entry.content.length > 140 ? entry.content.slice(0, 140) + '…' : entry.content}
            </p>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'rgba(245,245,245,0.35)' }}>
                <MessageSquare size={12} />
                {commentCount}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.16em', color, opacity: 0.8 }}>
                READ MORE →
              </span>
            </div>
          </div>

          {/* Image (desktop: right column, mobile: hidden to keep feed tight) */}
          {hasImage && (
            <div style={{ width: '140px', flexShrink: 0, borderLeft: '1px solid rgba(255,107,53,0.16)', position: 'relative' }} className="hidden sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.images[0]}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {extraImgs > 0 && (
                <div style={{
                  position: 'absolute', bottom: 6, right: 6,
                  background: 'rgba(11,15,23,0.82)', border: '1px solid rgba(255,107,53,0.16)',
                  color: 'rgba(245,245,245,0.55)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
                  padding: '2px 6px', letterSpacing: '0.08em',
                }}>
                  +{extraImgs}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Mobile image strip */}
        {hasImage && (
          <div className="block sm:hidden" style={{ borderTop: '1px solid rgba(255,107,53,0.16)', position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.images[0]}
              alt=""
              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '160px', objectFit: 'cover' }}
            />
            {extraImgs > 0 && (
              <div style={{
                position: 'absolute', bottom: 6, right: 6,
                background: 'rgba(11,15,23,0.82)', border: '1px solid rgba(255,107,53,0.16)',
                color: 'rgba(245,245,245,0.55)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
                padding: '2px 6px',
              }}>
                +{extraImgs}
              </div>
            )}
          </div>
        )}

      </div>
    </Link>
  )
}

const INTEL_FILTERS = [
  { key: 'all',        label: 'ALL'    },
  { key: 'public',     label: 'PUBLIC' },
  { key: 'classified', label: 'CLASSIFIED' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IntelPage() {
  const { isAtLeast } = useAuth()
  const [intel, setIntel] = useState<IntelWithAvatar[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const loadIntel = async () => {
    const data = await getAllIntel()
    const items = data as IntelWithAvatar[]
    setIntel(items)
    if (items.length > 0) {
      const counts = await getCommentCountsBulk('intel', items.map(e => e.id))
      setCommentCounts(counts)
    }
  }

  useEffect(() => { loadIntel() }, [])

  // Derive displayed list based on filter
  const visibleIntel =
    activeFilter === 'public'     ? intel.filter(e => !e.classified) :
    activeFilter === 'classified' ? intel.filter(e =>  e.classified) :
    intel

  const showClassifiedWall = activeFilter === 'classified' && !isAtLeast('voyager')

  return (
    <div className="main">
      <SectionTracker section="intel" />
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> INTEL FEED</div>
        <div className="right">
          <div className="item">ENTRIES <span className="val">{intel.length}</span></div>
          <div className="item">UTC <span className="val">{new Date().toISOString().slice(11, 19)}</span></div>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="h-eyebrow">{"// INTELLIGENCE"}</div>
          <h1>INTEL <span className="accent">FEED</span></h1>
          <p className="sub">Known intelligence — {intel.length} entries on record</p>
        </div>
        {/* Color legend */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {(['NOTICE', 'DEVICE', 'ORG'] as const).map((tag) => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: TAG_COLOR[tag] }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.18em', color: TAG_COLOR[tag] }}>{tag}</span>
            </div>
          ))}
        </div>
      </div>

      <FilterBar
        options={INTEL_FILTERS}
        active={activeFilter}
        onChange={(k) => setActiveFilter(k as FilterTab)}
      />

      {/* Feed */}
      <div style={{ maxWidth: '720px', width: '100%' }}>
        {showClassifiedWall
          ? <ClassifiedWall />
          : visibleIntel.map(entry => (
              <IntelCard key={entry.id} entry={entry} commentCount={commentCounts[entry.id] ?? 0} />
            ))
        }
      </div>

      <div className="footer-bar" style={{ marginTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>LAST UPDATED: {intel[0] ? new Date(intel[0].timestamp).toLocaleDateString() : '—'}</div>
      </div>

      {isAtLeast('architect') && (
        <button
          className="btn-secondary"
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 40,
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '0.55rem 1.25rem', fontSize: 'var(--fs-caption)',
          }}
          onClick={() => setShowCreate(true)}
        >
          <Plus size={12} />
          PUBLISH INTEL
        </button>
      )}

      {showCreate && (
        <CreateIntelModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadIntel() }}
          existingItems={intel}
        />
      )}
    </div>
  )
}
