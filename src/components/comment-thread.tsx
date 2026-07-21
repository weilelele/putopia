'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Send, CornerDownRight, ImagePlus, X } from 'lucide-react'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'
import { getComments, postComment, deleteComment, listImpersonatableProfiles } from '@/lib/actions/comments'
import { HudField } from '@/components/hud-field'
import type { Comment, CommentSubjectType, ImpersonatableProfile } from '@/types/database'

const SUBJECT_BASE: Record<CommentSubjectType, string> = {
  device: '/devices',
  intel:  '/intel',
  world:  '/worlds',
}

const MAX_IMAGES = 3

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Image thumbnails inside a rendered comment ───────────────────────────────

function CommentImages({ paths }: { paths: string[] }) {
  if (!paths || paths.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
      {paths.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', flexShrink: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Attachment ${i + 1}`}
            style={{
              height: 110,
              width: 'auto',
              maxWidth: 200,
              objectFit: 'cover',
              display: 'block',
              border: '1px solid rgba(227,82,5,0.18)',
              cursor: 'zoom-in',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.borderColor = 'rgba(227,82,5,0.5)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.borderColor = 'rgba(227,82,5,0.18)' }}
          />
        </a>
      ))}
    </div>
  )
}

/**
 * Persistent comment thread with replies.
 * - Guests see the thread but get a login prompt instead of the compose form.
 * - Members can reply to any transmission (the author is emailed when replied to).
 * - Architects can additionally post AS another voyager/architect identity.
 * - Attachments: up to 3 images per transmission.
 */
export function CommentThread({
  subjectType,
  subjectId,
  subjectTitle,
  posthogEvent,
  allowImages = false,
}: {
  subjectType: CommentSubjectType
  subjectId: string
  subjectTitle?: string
  posthogEvent?: string
  allowImages?: boolean
}) {
  const { user } = useAuth()
  const isGuest = user.role === 'guest'
  const isArchitect = user.role === 'architect'

  const [comments, setComments] = useState<Comment[]>([])
  const [identities, setIdentities] = useState<ImpersonatableProfile[]>([])
  const [replyTo, setReplyTo] = useState<string | null>(null)

  useEffect(() => {
    getComments(subjectType, subjectId).then(setComments)
  }, [subjectType, subjectId])

  useEffect(() => {
    if (isArchitect) listImpersonatableProfiles().then(setIdentities)
  }, [isArchitect])

  // Group replies under their parent for tree rendering. `comments` arrives
  // oldest→newest. We show top-level transmissions newest-first (reverse roots),
  // but keep each parent's replies in chronological order so a reply never
  // renders above the message it answers.
  const { roots, childrenOf } = useMemo(() => {
    const childrenOf = new Map<string, Comment[]>()
    const roots: Comment[] = []
    for (const c of comments) {
      if (c.parent_id) {
        const arr = childrenOf.get(c.parent_id) ?? []
        arr.push(c)
        childrenOf.set(c.parent_id, arr)
      } else {
        roots.push(c)
      }
    }
    roots.reverse()
    return { roots, childrenOf }
  }, [comments])

  const submit = async (body: string, parentId: string | null, asProfileId: string | null, imagePaths: string[]) => {
    if (posthogEvent) posthog.capture(posthogEvent, { subject_type: subjectType, subject_id: subjectId, is_reply: !!parentId, has_images: imagePaths.length > 0 })
    const res = await postComment(subjectType, subjectId, body, { parentId, asProfileId, subjectTitle, imagePaths })
    if (res.error || !res.data) return false
    setComments((prev) => [...prev, res.data!])
    setReplyTo(null)
    return true
  }

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this transmission?')) return
    const res = await deleteComment(commentId)
    if (!res.error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId))
    }
  }

  const renderComment = (c: Comment, depth: number): React.ReactNode => {
    const canDelete = (!!user.id && c.author_id === user.id) || isArchitect
    const kids = childrenOf.get(c.id) ?? []
    return (
      <div key={c.id} style={depth > 0 ? { marginLeft: '1.25rem', borderLeft: '1px solid var(--bd-faint)', paddingLeft: '1rem' } : undefined}>
        <div className="card-void">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            {c.author_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.author_avatar_url} alt={c.author_name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--bd-cyan-2)' }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontWeight: 700, background: 'rgba(200,68,6,0.08)', color: 'var(--color-nebula)', border: '1px solid var(--bd-cyan-2)', flexShrink: 0 }}>
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
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--color-star-dim)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{c.body}</p>
          <CommentImages paths={c.image_paths ?? []} />
          {!isGuest && (
            <button
              onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
              style={{ marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-star-deep)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: 0 }}
            >
              <CornerDownRight size={11} /> {replyTo === c.id ? 'CANCEL' : 'REPLY'}
            </button>
          )}
        </div>

        {replyTo === c.id && !isGuest && (
          <div style={{ marginLeft: '1.25rem', borderLeft: '1px solid var(--bd-faint)', paddingLeft: '1rem', marginTop: '0.75rem' }}>
            <Composer
              compact
              allowImages={allowImages}
              identities={identities}
              placeholder={`Reply to ${c.author_name}...`}
              onSubmit={(body, asProfileId, imagePaths) => submit(body, c.id, asProfileId, imagePaths)}
            />
          </div>
        )}

        {kids.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {kids.map((k) => renderComment(k, depth + 1))}
          </div>
        )}
      </div>
    )
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

      {roots.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {roots.map((c) => renderComment(c, 0))}
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
        <div className="hud-frame">
          <div style={{ padding: '0 0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.25em', color: 'var(--color-star-deep)', marginBottom: '0.75rem' }}>
              TRANSMIT A MESSAGE
            </div>
            <Composer
              identities={identities}
              allowImages={allowImages}
              placeholder="Leave a transmission..."
              onSubmit={(body, asProfileId, imagePaths) => submit(body, null, asProfileId, imagePaths)}
            />
          </div>
        </div>
      )}
    </>
  )
}

// ─── Staged image type ────────────────────────────────────────────────────────

type StagedImage = { file: File; dataUrl: string }

/**
 * Compose box shared by the top-level form and inline reply boxes.
 * When `identities` is non-empty (architect only) it shows a "Post as" selector.
 * When `allowImages` is true, up to 3 image attachments are supported.
 */
function Composer({
  identities,
  placeholder,
  onSubmit,
  compact,
  allowImages,
}: {
  identities: ImpersonatableProfile[]
  placeholder: string
  onSubmit: (body: string, asProfileId: string | null, imagePaths: string[]) => Promise<boolean>
  compact?: boolean
  allowImages?: boolean
}) {
  const [text, setText] = useState('')
  const [asProfileId, setAsProfileId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [transmitted, setTransmitted] = useState(false)
  const [staged, setStaged] = useState<StagedImage[]>([])
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const canAddMore = staged.length < MAX_IMAGES

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_IMAGES - staged.length
    const toAdd = files.slice(0, remaining)
    toAdd.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setStaged((prev) => {
          if (prev.length >= MAX_IMAGES) return prev
          return [...prev, { file, dataUrl: ev.target?.result as string }]
        })
      }
      reader.readAsDataURL(file)
    })
    // reset input so the same file can be re-added
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeImage(idx: number) {
    setStaged((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setUploadErr(null)

    // Upload staged images sequentially → collect public URLs
    const imagePaths: string[] = []
    for (const img of staged) {
      try {
        const fd = new FormData()
        fd.append('image', img.file)
        const res = await fetch('/api/comments/upload-image', { method: 'POST', body: fd })
        const json = await res.json()
        if (json.url) {
          imagePaths.push(json.url)
        } else if (json.error) {
          setUploadErr(`Image upload failed: ${json.error}`)
          setSending(false)
          return
        }
      } catch {
        setUploadErr('Image upload failed — check your connection')
        setSending(false)
        return
      }
    }

    const ok = await onSubmit(body, asProfileId || null, imagePaths)
    setSending(false)
    if (!ok) return
    setText('')
    setStaged([])
    setTransmitted(true)
    setTimeout(() => setTransmitted(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit}>
      {identities.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em', color: 'var(--color-star-deep)' }}>POST AS</label>
          <select
            value={asProfileId}
            onChange={(e) => setAsProfileId(e.target.value)}
            className="input-dark"
            style={{ padding: '0.25rem 0.5rem', fontSize: 'var(--fs-caption)', fontFamily: 'var(--font-mono)', flex: compact ? 1 : 'unset', maxWidth: 280 }}
          >
            <option value="">Yourself</option>
            {identities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name} ({p.role})
              </option>
            ))}
          </select>
        </div>
      )}

      <HudField>
        <textarea
          rows={compact ? 2 : 3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="input-dark"
          style={{ resize: 'none' }}
        />
      </HudField>

      {/* Staged image thumbnails */}
      {staged.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {staged.map((img, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUrl}
                alt={`Staged ${i + 1}`}
                style={{
                  height: 72, width: 'auto', maxWidth: 140,
                  objectFit: 'cover', display: 'block',
                  border: '1px solid rgba(227,82,5,0.3)',
                }}
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                style={{
                  position: 'absolute', top: 2, right: 2,
                  background: 'rgba(10,14,39,0.85)',
                  border: '1px solid rgba(227,82,5,0.3)',
                  borderRadius: 0, cursor: 'pointer', color: '#F5F5F5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 18, height: 18, padding: 0,
                }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadErr && (
        <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--sig-fault)', letterSpacing: '0.05em' }}>
          {uploadErr}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {allowImages && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => canAddMore && fileRef.current?.click()}
                disabled={!canAddMore}
                title={canAddMore ? `Add image (${staged.length}/${MAX_IMAGES})` : `Maximum ${MAX_IMAGES} images reached`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'none',
                  border: '1px solid rgba(227,82,5,0.2)',
                  color: canAddMore ? 'rgba(245,245,245,0.4)' : 'rgba(245,245,245,0.15)',
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', letterSpacing: '0.1em',
                  padding: '4px 8px', cursor: canAddMore ? 'pointer' : 'not-allowed',
                }}
              >
                <ImagePlus size={11} />
                {staged.length}/{MAX_IMAGES}
              </button>
            </>
          )}
          {transmitted && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-ok)' }}>✓ TRANSMISSION SENT</span>
          )}
        </div>
        <button type="submit" disabled={!text.trim() || sending} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: 'var(--fs-caption)' }}>
          <Send size={10} /> {sending ? (staged.length > 0 ? 'UPLOADING...' : 'SENDING...') : 'TRANSMIT'}
        </button>
      </div>
    </form>
  )
}
