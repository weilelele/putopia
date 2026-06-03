'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Send } from 'lucide-react'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'
import { getComments, postComment, deleteComment } from '@/lib/actions/comments'
import { HudField } from '@/components/hud-field'
import type { Comment, CommentSubjectType } from '@/types/database'

const SUBJECT_BASE: Record<CommentSubjectType, string> = {
  device: '/devices',
  intel:  '/intel',
  world:  '/worlds',
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

/**
 * Persistent, guest-read-only comment thread.
 * Reads/writes the shared `comments` table via server actions.
 * Guests see the thread but get a login prompt instead of the compose form.
 */
export function CommentThread({
  subjectType,
  subjectId,
  posthogEvent,
}: {
  subjectType: CommentSubjectType
  subjectId: string
  posthogEvent?: string
}) {
  const { user } = useAuth()
  const isGuest = user.role === 'guest'

  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [transmitted, setTransmitted] = useState(false)

  useEffect(() => {
    getComments(subjectType, subjectId).then(setComments)
  }, [subjectType, subjectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    if (posthogEvent) posthog.capture(posthogEvent, { subject_type: subjectType, subject_id: subjectId })
    const res = await postComment(subjectType, subjectId, body)
    setSending(false)
    if (res.error || !res.data) return
    setComments((prev) => [...prev, res.data!])
    setText('')
    setTransmitted(true)
    setTimeout(() => setTransmitted(false), 3000)
  }

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this transmission?')) return
    const res = await deleteComment(commentId)
    if (!res.error) setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  return (
    <>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', color: 'var(--color-star-deep)' }}>
          TRANSMISSIONS [{comments.length}]
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--bd-faint)' }} />
      </div>

      {comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {comments.map((c) => {
            const canDelete = (!!user.id && c.author_id === user.id) || user.role === 'architect'
            return (
              <div key={c.id} className="card-void">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  {c.author_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.author_avatar_url} alt={c.author_name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--bd-cyan-2)' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, background: 'rgba(232,93,4,0.08)', color: 'var(--color-nebula)', border: '1px solid var(--bd-cyan-2)', flexShrink: 0 }}>
                      {getInitials(c.author_name)}
                    </div>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-dim)' }}>{c.author_name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', marginLeft: 'auto' }}>
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {canDelete && (
                    <button onClick={() => handleDelete(c.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-star-deep)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', padding: '0 0.25rem' }}>✕</button>
                  )}
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.body}</p>
              </div>
            )
          })}
        </div>
      )}

      {comments.length === 0 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star-deep)', textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
          NO TRANSMISSIONS YET — BE THE FIRST.
        </div>
      )}

      {isGuest ? (
        <div className="hud-frame">
          <div style={{ padding: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.2em', color: 'var(--color-star-deep)', marginBottom: '0.75rem' }}>
              TRANSMISSIONS ARE MEMBERS-ONLY
            </div>
            <Link href={`/login?redirect=${SUBJECT_BASE[subjectType]}/${subjectId}`} className="btn-primary" style={{ display: 'inline-flex', padding: '0.5rem 1.25rem', fontSize: 'var(--fs-caption)' }}>
              LOG IN TO TRANSMIT
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="hud-frame">
            <div style={{ padding: '0 0.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', color: 'var(--color-star-deep)', marginBottom: '0.75rem' }}>
                TRANSMIT A MESSAGE
              </div>
              <HudField>
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Leave a transmission..."
                  className="input-dark"
                  style={{ resize: 'none' }}
                />
              </HudField>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                {transmitted ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-ok)' }}>✓ TRANSMISSION SENT</span>
                ) : <span />}
                <button type="submit" disabled={!text.trim() || sending} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: 'var(--fs-caption)' }}>
                  <Send size={10} /> {sending ? 'SENDING...' : 'TRANSMIT'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </>
  )
}
