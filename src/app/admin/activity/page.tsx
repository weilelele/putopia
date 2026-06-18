'use client'

import { useEffect, useState, useTransition } from 'react'
import { getActivityFeedAdmin, setActivityEventVisibility, deleteActivityEvent } from '@/lib/actions/activity-events'
import type { ActivityEvent } from '@/lib/actions/activity-events'

const TYPE_COLOR: Record<string, string> = {
  intel_published: 'rgba(245,245,245,0.55)',
  intel_updated:   'rgba(245,245,245,0.35)',
  device_updated:  '#FF6B35',
  world_added:     '#9B7FE8',
  vote_opened:     '#20D890',
  vote_cast:       '#20D890',
  member_joined:   '#FF8A5C',
}

function relTs(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AdminActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let active = true
    getActivityFeedAdmin().then(data => {
      if (!active) return
      setEvents(data)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  function toggle(id: string, current: boolean) {
    startTransition(async () => {
      await setActivityEventVisibility(id, !current)
      setEvents(prev => prev.map(e => e.id === id ? { ...e, is_visible: !current } : e))
    })
  }

  function remove(id: string) {
    if (!confirm('Permanently delete this event?')) return
    startTransition(async () => {
      await deleteActivityEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
    })
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', color: 'var(--color-star-deep)', marginBottom: '0.4rem' }}>
          ADMIN / ACTIVITY FEED
        </div>
        <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--color-star)', letterSpacing: '0.18em', margin: 0 }}>
          ACTIVITY EVENTS
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', marginTop: '0.5rem' }}>
          Auto-generated on every write action. Hide events to suppress them from the public feed without deleting.
        </p>
      </div>

      {loading && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.2em' }}>
          LOADING…
        </div>
      )}

      {!loading && events.length === 0 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', padding: '2rem', border: '1px solid var(--bd-faint)', textAlign: 'center', letterSpacing: '0.2em' }}>
          NO EVENTS YET
        </div>
      )}

      {!loading && events.length > 0 && (
        <div style={{ border: '1px solid var(--bd-faint)', background: 'var(--color-void)' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 140px 80px 100px',
            gap: '0.75rem',
            padding: '0.5rem 1rem',
            borderBottom: '1px solid var(--bd-faint)',
            background: '#090D1A',
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
            letterSpacing: '0.18em', color: 'var(--color-star-deep)',
          }}>
            <span>EVENT</span>
            <span>ACTOR</span>
            <span>TYPE</span>
            <span>TIME</span>
            <span style={{ textAlign: 'right' }}>ACTIONS</span>
          </div>

          {events.map(ev => {
            const color = TYPE_COLOR[ev.event_type] ?? 'var(--color-star-deep)'
            return (
              <div
                key={ev.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 140px 80px 100px',
                  gap: '0.75rem',
                  padding: '0.65rem 1rem',
                  borderBottom: '1px solid var(--bd-faint)',
                  alignItems: 'center',
                  opacity: ev.is_visible ? 1 : 0.38,
                  transition: 'opacity 0.15s',
                }}
              >
                {/* Title */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)',
                    color: 'var(--color-star)', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ev.target_title ?? '—'}
                  </div>
                  {ev.vote_option && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', marginTop: '0.1rem' }}>
                      → {ev.vote_option}
                    </div>
                  )}
                </div>

                {/* Actor */}
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
                  color: 'var(--color-star-dim)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {ev.actor_name}
                </div>

                {/* Type */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color, letterSpacing: '0.12em' }}>
                  {ev.event_type}
                </div>

                {/* Time */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)' }}>
                  {relTs(ev.created_at)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => toggle(ev.id, ev.is_visible)}
                    disabled={pending}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
                      letterSpacing: '0.1em', padding: '0.2rem 0.5rem',
                      background: 'transparent', cursor: 'pointer',
                      color: ev.is_visible ? 'var(--color-star-deep)' : '#20D890',
                      border: `1px solid ${ev.is_visible ? 'var(--bd-faint)' : 'rgba(32,216,144,0.35)'}`,
                      transition: 'all 0.1s',
                    }}
                    title={ev.is_visible ? 'Hide from feed' : 'Show in feed'}
                  >
                    {ev.is_visible ? 'HIDE' : 'SHOW'}
                  </button>
                  <button
                    onClick={() => remove(ev.id)}
                    disabled={pending}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)',
                      letterSpacing: '0.1em', padding: '0.2rem 0.5rem',
                      background: 'transparent', cursor: 'pointer',
                      color: 'rgba(232,48,48,0.7)',
                      border: '1px solid rgba(232,48,48,0.25)',
                      transition: 'all 0.1s',
                    }}
                    title="Delete permanently"
                  >
                    DEL
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', letterSpacing: '0.15em' }}>
        {events.length} events total · {events.filter(e => e.is_visible).length} visible
      </div>
    </div>
  )
}
