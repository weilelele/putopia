'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getWorldById } from '@/lib/actions/worlds'
import { Send } from 'lucide-react'
import type { World } from '@/types/database'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'

interface Comment {
  id: string
  author: string
  timestamp: string
  text: string
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function WorldDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { user } = useAuth()
  const isGuest = user.role === 'guest'
  const backHref = isGuest ? '/console' : '/worlds'
  const backLabel = isGuest ? '← DASHBOARD' : '← WORLD RECORDS'

  const [world, setWorld] = useState<World | null | undefined>(undefined)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [transmitted, setTransmitted] = useState(false)

  useEffect(() => {
    getWorldById(id).then((w) => {
      setWorld(w ?? null)
      if (w) posthog.capture('world_viewed', { world_id: id, world_name: w.name_en || w.name })
    })
  }, [id])

  const handleTransmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    posthog.capture('world_comment_sent', { world_id: id })
    setComments((prev) => [...prev, {
      id: `c${Date.now()}`,
      author: 'You',
      timestamp: new Date().toISOString(),
      text: commentText.trim(),
    }])
    setCommentText('')
    setTransmitted(true)
    setTimeout(() => setTransmitted(false), 3000)
  }

  if (world === undefined) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>LOADING...</div>
      </div>
    )
  }

  if (!world) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--color-fault)', marginBottom: '1rem' }}>[ 404 ]</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-star-deep)', marginBottom: '1.5rem' }}>WORLD ENTRY NOT FOUND</div>
        <Link href={backHref} className="btn-ghost">← RETURN</Link>
      </div>
    )
  }

  const displayName = world.name_en || world.name
  const hasImage = !!world.image_path

  return (
    <div className="main">
      <div className="top-bar">
        <div className="crumbs">
          {isGuest
            ? <>PC://WORKSPACE <span>/</span> WORLD RECORDS</>
            : <>PC://CONSOLE <span>/</span> WORLD RECORDS <span>/</span> {world.id}</>
          }
        </div>
        <div className="right">
          <div className="item">ID <span className="val">{world.id}</span></div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href={backHref} className="btn-ghost" style={{ display: 'inline-flex' }}>{backLabel}</Link>
        </div>

        {/* Hero — image or gradient */}
        <div style={{ width: '100%', height: '280px', position: 'relative', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid var(--bd-faint)' }}>
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={world.image_path!}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${world.gradient_from}, ${world.gradient_to})` }} />
          )}
          {/* scanline overlay */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)', pointerEvents: 'none' }} />
          {/* bottom fade for text legibility */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(11,15,23,0.85) 100%)', pointerEvents: 'none' }} />
          {/* ID badge */}
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.15em', background: 'rgba(7,9,18,0.75)', color: 'var(--color-star-deep)', padding: '3px 8px', border: '1px solid var(--bd-faint)' }}>
              {world.id}
            </span>
          </div>
          {/* Verified badge */}
          {world.is_verified && (
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.12em', background: 'rgba(34,212,224,0.15)', color: 'var(--color-nebula)', padding: '3px 8px', border: '1px solid rgba(34,212,224,0.3)' }}>
                ✓ VERIFIED
              </span>
            </div>
          )}
          {/* Title overlay at bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem 1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-star)', lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
              {displayName}
            </div>
          </div>
        </div>

        {/* Meta bar */}
        <div className="hud-frame" style={{ marginBottom: '1.5rem' }}>
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>DISCOVERED BY</div>
                {world.discoverer_id ? (
                  <Link href="/voyagers" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-nebula)', textDecoration: 'none', fontWeight: 600 }}>
                    {world.discoverer_name}
                  </Link>
                ) : (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-star-dim)', fontWeight: 600 }}>{world.discoverer_name || '—'}</div>
                )}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>DISCOVERY DATE</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-star-dim)' }}>{world.discovery_date}</div>
              </div>
              {world.name !== world.name_en && world.name && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>LOCAL DESIGNATION</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-star-dim)' }}>{world.name}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="hud-frame" style={{ marginBottom: '2rem' }}>
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 1rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--color-star-deep)', marginBottom: '0.75rem' }}>FIELD NOTES</div>
            <div className="hr-cyan" />
            <article style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--color-star-dim)', lineHeight: 1.85, whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
              {world.description}
            </article>
          </div>
        </div>

        {/* Transmissions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--color-star-deep)' }}>TRANSMISSIONS</div>
          <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
        </div>

        {comments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {comments.map((comment) => (
              <div key={comment.id} className="card-void">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700,
                    background: 'rgba(34,212,224,0.08)', color: 'var(--color-nebula)',
                    border: '1px solid var(--bd-cyan-2)', flexShrink: 0,
                  }}>{getInitials(comment.author)}</div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-star-dim)' }}>{comment.author}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--color-star-deep)', marginLeft: 'auto' }}>
                    {new Date(comment.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-star-dim)', lineHeight: 1.6 }}>{comment.text}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleTransmit}>
          <div className="hud-frame">
            <div style={{ padding: '0 0.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--color-star-deep)', marginBottom: '0.75rem' }}>
                TRANSMIT A MESSAGE
              </div>
              <textarea
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave a transmission..."
                className="input-dark"
                style={{ resize: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                {transmitted ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-ok)' }}>✓ TRANSMISSION SENT</span>
                ) : <span />}
                <button type="submit" disabled={!commentText.trim()} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.7rem' }}>
                  <Send size={10} /> TRANSMIT
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="footer-bar" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <div className="tag">— BUILDING BETTER WORLDS, TOGETHER.</div>
        <div>WORLD ARCHIVE v2.6</div>
      </div>
    </div>
  )
}
