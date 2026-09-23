'use client'

import { ArchiveButton } from '@/components/archive-button'
import { ArchiveSelect, ArchiveTextarea, ArchiveInput } from '@/components/archive-input'
import { useState, useEffect, useMemo, useRef } from 'react'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { MemberProfileSheet } from '@/components/member-profile-sheet'
import styles from './comment-thread.module.css'
import { Send, CornerDownRight, ImagePlus, X } from 'lucide-react'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth-context'
import { getComments, postComment, deleteComment, listImpersonatableProfiles } from '@/lib/actions/comments'
import { ArchiveField } from '@/components/archive-field'
import { useId } from 'react'
import type { Comment, CommentSubjectType, ImpersonatableProfile } from '@/types/database'

const SUBJECT_BASE: Record<CommentSubjectType, string> = {
  device: '/devices',
  device_batch: '/devices/batches',
  intel:  '/intel',
  world:  '/worlds',
  dreamcatcher: '/worlds/live',
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
  const profileTrigger = useRef<HTMLButtonElement | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reload, setReload] = useState(0)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const headingId = useId()

  useEffect(() => {
    if (profileId === null) profileTrigger.current?.focus({ preventScroll: true })
  }, [profileId])

  useEffect(() => {
    let active = true
    getComments(subjectType, subjectId).then(items => {
      if (active) { setComments(items); setLoadState('ready') }
    }).catch(() => { if (active) setLoadState('error') })
    return () => { active = false }
  }, [subjectType, subjectId, reload])

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
    if (res.error || !res.data) return { error: res.error ?? 'Could not send your comment. Please try again.' }
    setComments((prev) => [...prev, res.data!])
    setReplyTo(null)
    return { error: null }
  }

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this transmission?')) return
    setDeleting(commentId)
    setDeleteError(null)
    try {
      const res = await deleteComment(commentId)
      if (res.error) { setDeleteError('Could not delete this comment. Please try again.'); return }
      setComments(prev => {
        const removed = new Set([commentId])
        let changed = true
        while (changed) {
          changed = false
          for (const item of prev) {
            if (item.parent_id && removed.has(item.parent_id) && !removed.has(item.id)) {
              removed.add(item.id); changed = true
            }
          }
        }
        return prev.filter(item => !removed.has(item.id))
      })
    } catch {
      setDeleteError('Could not confirm deletion. Reload the discussion before retrying.')
    } finally { setDeleting(null) }
  }

  const renderComment = (c: Comment, depth: number): React.ReactNode => {
    const canDelete = (!!user.id && c.author_id === user.id) || isArchitect
    const kids = childrenOf.get(c.id) ?? []
    return (
      <div key={c.id} className={depth === 1 ? styles.replies : undefined}>
        <article className={styles.comment}>
          <header className={styles.commentHeader}>
            {c.author_id ? (
              <button type="button" className={styles.author} onClick={event => { profileTrigger.current = event.currentTarget; setProfileId(c.author_id) }} aria-label={`View ${c.author_name}'s profile`} aria-haspopup="dialog">
                <CommentAvatar name={c.author_name} url={c.author_avatar_url} />
                <span>{c.author_name}</span>
              </button>
            ) : (
              <div className={styles.author}><CommentAvatar name={c.author_name} url={c.author_avatar_url} /><span>{c.author_name}</span></div>
            )}
            <time className={styles.date} dateTime={c.created_at}>
              {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </time>
          </header>
          <p className={styles.body}>{c.body}</p>
          <CommentImages paths={c.image_paths ?? []} />
          {(!isGuest || canDelete) && <div className={styles.actions}>
            {!isGuest && <ArchiveButton type="button" variant="ghost" className={styles.textAction}
              onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} aria-expanded={replyTo === c.id}>
              <CornerDownRight size={16} aria-hidden /> {replyTo === c.id ? 'Cancel reply' : 'Reply'}
            </ArchiveButton>}
            {canDelete && <ArchiveButton type="button" variant="ghost" className={styles.textAction}
              onClick={() => handleDelete(c.id)} disabled={deleting !== null} aria-label={`Delete comment by ${c.author_name}`}>
              {deleting === c.id ? 'Deleting…' : 'Delete'}
            </ArchiveButton>}
          </div>}
        </article>

        {replyTo === c.id && !isGuest && (
          <div className={styles.replyComposer}>
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
          <div>
            {kids.map((k) => renderComment(k, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className={styles.thread} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>Discussion{loadState === 'ready' && <span> ({comments.length})</span>}</h2>
      {loadState === 'loading' && <p className={styles.feedback} role="status">Loading comments…</p>}
      {loadState === 'error' && <div className={styles.feedback} role="alert">
        <p>Comments could not be loaded.</p>
        <ArchiveButton variant="secondary" onClick={() => { setLoadState('loading'); setReload(value => value + 1) }}>Retry</ArchiveButton>
      </div>}
      {deleteError && <p className={styles.feedback} role="alert">{deleteError}</p>}
      {roots.length > 0 && <div>{roots.map(c => renderComment(c, 0))}</div>}
      {loadState === 'ready' && comments.length === 0 && <p className={styles.feedback}>No comments yet. Start the discussion.</p>}
      <div className={styles.composer}>
        {isGuest ? <>
          <p className={styles.feedback}>Log in to join the discussion.</p>
          <ArchiveLinkButton href={`/login?redirect=${subjectType === 'dreamcatcher' ? '/worlds/live' : `${SUBJECT_BASE[subjectType]}/${subjectId}`}`}>Log in to comment</ArchiveLinkButton>
        </> : <Composer
          identities={identities}
          allowImages={allowImages}
          placeholder="Add to the discussion…"
          onSubmit={(body, asProfileId, imagePaths) => submit(body, null, asProfileId, imagePaths)}
        />}
      </div>
      {profileId && <MemberProfileSheet key={profileId} profileId={profileId} onClose={() => setProfileId(null)} />}
    </section>
  )
}

function CommentAvatar({ name, url }: { name: string; url: string | null }) {
  return url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className={styles.avatar} src={url} alt="" />
    : <span className={styles.avatar} aria-hidden>{getInitials(name)}</span>
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
  onSubmit: (body: string, asProfileId: string | null, imagePaths: string[]) => Promise<{ error: string | null }>
  compact?: boolean
  allowImages?: boolean
}) {
  const commentFieldId = useId()
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

    try {
      const result = await onSubmit(body, asProfileId || null, imagePaths)
      if (result.error) {
        setUploadErr(result.error)
        return
      }
    } catch {
      setUploadErr('Could not confirm your comment was sent. Check the thread before trying again.')
      return
    } finally {
      setSending(false)
    }
    setText('')
    setStaged([])
    setTransmitted(true)
    setTimeout(() => setTransmitted(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {identities.length > 0 && (
        <div className={styles.postAs}>
          <label htmlFor={`${commentFieldId}-identity`}>Post as</label>
          <ArchiveSelect
            id={`${commentFieldId}-identity`}
            value={asProfileId}
            onChange={(e) => setAsProfileId(e.target.value)}

            className={styles.identitySelect}
          >
            <option value="">Yourself</option>
            {identities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name} ({p.role})
              </option>
            ))}
          </ArchiveSelect>
        </div>
      )}

      <ArchiveField htmlFor={commentFieldId} label={compact ? "REPLY" : "COMMENT"}>
        <ArchiveTextarea
          id={commentFieldId}
          rows={compact ? 2 : 3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}

          className={styles.textarea}
        />
      </ArchiveField>

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
              <ArchiveButton variant="secondary"
                type="button"
                aria-label={`Remove attachment ${i + 1}`}
                onClick={() => removeImage(i)}
                style={{ position: 'absolute', top: 2, right: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, padding: 0 }}
              >
                <X size={16} aria-hidden />
              </ArchiveButton>
            </div>
          ))}
        </div>
      )}

      {uploadErr && (
        <div role="alert" style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-star)', letterSpacing: '0.05em' }}>
          {uploadErr}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {allowImages && (
            <>
              <ArchiveInput
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <ArchiveButton variant="secondary"
                type="button"
                onClick={() => canAddMore && fileRef.current?.click()}
                disabled={!canAddMore}
                title={canAddMore ? `Add image (${staged.length}/${MAX_IMAGES})` : `Maximum ${MAX_IMAGES} images reached`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--color-star-dim)', padding: '4px 8px', cursor: canAddMore ? 'pointer' : 'not-allowed' }}
              >
                <ImagePlus size={16} aria-hidden />
                {staged.length}/{MAX_IMAGES}
              </ArchiveButton>
            </>
          )}
          {transmitted && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--color-ok)' }}>✓ TRANSMISSION SENT</span>
          )}
        </div>
        <ArchiveButton variant="primary" type="submit" disabled={!text.trim() || sending}  style={{ padding: '0.5rem 1.25rem' }}>
          <Send size={16} aria-hidden /> {sending ? (staged.length > 0 ? 'UPLOADING...' : 'SENDING...') : 'TRANSMIT'}
        </ArchiveButton>
      </div>
    </form>
  )
}
