'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getIntelById } from '@/lib/actions/intel'
import { Send } from 'lucide-react'
import type { Intel } from '@/types/database'
import posthog from 'posthog-js'

const TAG_COLOR: Record<string, string> = {
  NOTICE: 'var(--color-star-dim)',
  DEVICE: 'var(--color-nucleus)',
  ORG:    'var(--color-nebula)',
}

interface Comment {
  id: string
  author: string
  timestamp: string
  text: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function IntelDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [entry, setEntry] = useState<Intel | null | undefined>(undefined)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [transmitted, setTransmitted] = useState(false)

  useEffect(() => {
    getIntelById(id).then((e) => {
      setEntry(e ?? null)
      if (e) posthog.capture('intel_viewed', { intel_id: id, intel_tag: e.tag, intel_title: e.title })
    })
  }, [id])

  if (entry === undefined) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>LOADING...</div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="main" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--color-fault)', marginBottom: '1rem' }}>[ 404 ]</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-star-deep)', marginBottom: '1.5rem' }}>INTEL ENTRY NOT FOUND</div>
        <Link href="/intel" className="btn-ghost">← RETURN TO INTEL</Link>
      </div>
    )
  }

  const color = TAG_COLOR[entry.tag] ?? 'var(--color-star-dim)'
  const hasImages = (entry.images?.length ?? 0) > 0
  const isSingle  = entry.images?.length === 1

  const handleTransmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    posthog.capture('intel_comment_sent', { intel_id: id, intel_tag: entry?.tag })
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

  return (
    <div className="main">
      <div className="top-bar">
        <div className="crumbs">PC://CONSOLE <span>/</span> INTEL FEED <span>/</span> DISPATCH</div>
        <div className="right">
          <div className="item">ID <span className="val">{id.slice(0, 8).toUpperCase()}</span></div>
        </div>
      </div>

      <div style={{ maxWidth: '720px', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/intel" className="btn-ghost" style={{ display: 'inline-flex' }}>← INTEL</Link>
        </div>

        {/* HUD frame for the intel entry */}
        <div className="hud-frame" style={{ marginBottom: '2rem' }}>
          <div className="hud-tick-rail hud-tick-left" />
          <div className="hud-tick-rail hud-tick-right" />
          <div style={{ padding: '0 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span className="label-tag" style={{ color }}>{entry.tag}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-star-deep)', letterSpacing: '0.18em' }}>{formatDate(entry.timestamp)}</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--color-star)', marginBottom: '1rem', lineHeight: 1.3 }}>
              {entry.title}
            </h1>

            {/* Publisher */}
            {entry.publisher_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--color-muted)' }}>PUBLISHED BY</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--color-star-dim)', fontWeight: 600 }}>{entry.publisher_name}</span>
              </div>
            )}

            <div className="hr-cyan" />
            <article style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-star-dim)', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
              {entry.content}
            </article>
          </div>
        </div>

        {/* Full-color images — revealed at detail level */}
        {hasImages && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--color-star-deep)' }}>
                VISUAL ATTACHMENTS [{entry.images.length}]
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
            </div>

            {isSingle ? (
              <div style={{ width: '100%', overflow: 'hidden', border: '1px solid var(--bd-faint)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.images[0]}
                  alt="Intel attachment"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px' }}>
                {entry.images.map((url, i) => (
                  <div key={i} style={{ aspectRatio: '4/3', overflow: 'hidden', border: '1px solid var(--bd-faint)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Attachment ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
        <div>PUTOPIA.COLLECTIVE</div>
      </div>
    </div>
  )
}
