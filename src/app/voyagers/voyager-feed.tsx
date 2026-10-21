'use client'
/* eslint-disable @next/next/no-img-element -- Feed attachments require authenticated requests; local previews and profile media retain their original URLs. */
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ThumbsUp, ThumbsDown, ImagePlus, Plus, MessageCircle, MoreHorizontal, UserRound, X } from 'lucide-react'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { MemberProfileSheet } from '@/components/member-profile-sheet'
import { ArchiveRouteLoading } from '@/components/archive-route-state'
import { ArchiveTextarea, ArchiveSelect } from '@/components/archive-input'
import { useAuth } from '@/lib/auth-context'
import { boundedFeedRequest, readFeedDraft, writeFeedDraft, type FeedDraft } from '@/lib/feed-recovery'
import { getRouteScrollContainer } from '@/lib/route-scroll-container'
import * as liveFeed from '@/lib/actions/voyager-feed'
import { withFeedVote, canPublishVoyagerFeed, canPublishAsNpc, canManageFeedEntry, type FeedEntry, type FeedPage } from '@/lib/voyager-feed'
import { VoyagerHeader } from './voyager-header'
import guestStyles from '../console/guest-intro.module.css'
import s from './feed.module.css'
import { REQUEST_ACCESS_HREF } from '@/lib/request-access'

type Modal = { type: 'compose' | 'permission' } | { type: 'menu' | 'edit' | 'delete'; entry: FeedEntry }
// List position is transient; text drafts are account-scoped session storage.
const feedPositions = new Map<string, { top: number; id: string; count: number }>()
let draftAccount: string | null = null
const protectedMedia = (entry: FeedEntry) => `/api/voyager-feed/media/${entry.id}`

export function VoyagerFeed({ postId, services = liveFeed, baseHref = '/voyagers', mediaSource = protectedMedia, requestTimeout = 15000 }: { postId?: string; services?: typeof liveFeed; baseHref?: string; mediaSource?: (entry: FeedEntry) => string; requestTimeout?: number }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const root = useRef<HTMLElement>(null)
  const dialogTrigger = useRef<HTMLElement | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (authLoading) return
    if (draftAccount !== user.id) { feedPositions.clear(); draftAccount = user.id ?? null }
  }, [authLoading, user.id])
  const [page, setPage] = useState<FeedPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [modal, setModal] = useState<Modal | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [authorId, setAuthorId] = useState('')
  const [identities, setIdentities] = useState<Awaited<ReturnType<typeof liveFeed.getFeedPublishingIdentities>>>([])
  const [identityLoading, setIdentityLoading] = useState(false)
  const [identityError, setIdentityError] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [preparingImage, setPreparingImage] = useState(false)
  const preparingImageRef = useRef(false)
  const [uncertainEdit, setUncertainEdit] = useState(false)
  const [uncertainDelete, setUncertainDelete] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const requestId = useRef('')
  const draftKey = `${baseHref}:${page?.viewer?.id ?? user.id ?? 'guest'}:${postId ? `reply:${postId}` : 'compose'}`
  const composeKey = `${baseHref}:${page?.viewer?.id ?? user.id ?? 'guest'}:compose`
  const [reply, setReplyState] = useState('')
  const [replyPending, setReplyPending] = useState(false)
  const replyId = useRef('')
  const [replyTouched, setReplyTouched] = useState(false)
  const [recovery, setRecovery] = useState<{kind: 'compose' | 'reply' | 'edit'; draft: FeedDraft} | null>(null)
  const [attachment, setAttachment] = useState<FeedDraft['attachment']>()
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)
  const [offline, setOffline] = useState(false)
  const draftLoaded = useRef(false)
  const confirmed = useRef(false)
  const call = <T,>(promise: Promise<T>) => boundedFeedRequest(promise, requestTimeout)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update(); window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  useEffect(() => {
    if (!page?.viewer || page.locked || draftLoaded.current) return
    draftLoaded.current = true
    const saved = readFeedDraft(draftKey)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Offer persisted input only after server-verified account eligibility.
    if (saved) setRecovery({kind: postId ? 'reply' : 'compose', draft: saved})
  }, [page, draftKey, postId])
  useEffect(() => {
    if (!page?.viewer || recovery || confirmed.current) return
    if (modal?.type === 'compose' || modal?.type === 'edit') {
      const edit = modal.type === 'edit'
      const key = edit ? `${composeKey}:edit:${modal.entry.id}` : composeKey
      const draft: FeedDraft = { id: edit ? modal.entry.id : requestId.current, body, authorId: authorId || page.viewer.id, updated: Date.now(), pending: edit ? uncertainEdit : submitted, ...(edit ? {original: modal.entry.body} : {attachment}) }
      const saved = writeFeedDraft(key, body || attachment || submitted ? draft : null)
      setStorageFailed(!saved)
    } else if (postId && replyTouched) {
      const saved = writeFeedDraft(draftKey, reply || replyPending ? {id: replyId.current, body: reply, authorId: page.viewer.id, updated:Date.now(), pending:replyPending} : null)
      setStorageFailed(!saved)
    }
  }, [body, attachment, authorId, submitted, modal, page, recovery, composeKey, postId, replyTouched, reply, replyPending, draftKey, uncertainEdit])
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const load = useCallback(async (more = false) => {
    setLoading(true); setError('')
    try {
      const result = await boundedFeedRequest(services.getVoyagerFeed(postId, more ? page?.next ?? undefined : undefined), requestTimeout)
      if (!alive.current) return
      setPage(previous => more && previous && !result.locked ? { ...result, entries: [...previous.entries, ...result.entries.filter(entry => !previous.entries.some(old => old.id === entry.id))] } : result)
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'The feed could not be loaded.') }
    finally { if (alive.current) setLoading(false) }
  }, [postId, page, services, requestTimeout])
  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    const restoreRange = async () => {
      let result = await boundedFeedRequest(services.getVoyagerFeed(postId), requestTimeout)
      const saved = !postId && feedPositions.get(user.id ?? '')
      while (!cancelled && saved && !result.locked && result.next && result.entries.length < saved.count) {
        const more = await boundedFeedRequest(services.getVoyagerFeed(undefined, result.next), requestTimeout)
        result = { ...more, entries: [...result.entries, ...more.entries] }
      }
      return result
    }
    restoreRange().then(result => { if (!cancelled) setPage(result) }).catch(() => { if (!cancelled) setError('The feed could not be loaded. Please retry.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [postId, authLoading, services, user.id, requestTimeout])
  const restored = useRef(false)
  useEffect(() => {
    if (!page || restored.current) return
    restored.current = true
    const frame = requestAnimationFrame(() => {
      const position = feedPositions.get(user.id ?? '')
      if (!postId && position) {
        getRouteScrollContainer(root.current)?.scrollTo({ top: position.top })
        document.getElementById(`feed-${position.id}`)?.focus({ preventScroll: true })
      } else if (postId) document.getElementById('feed-post-heading')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [page, postId, user.id])
  useEffect(() => {
    if (!image) return
    const url = URL.createObjectURL(image)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Object URLs are browser resources with an explicit cleanup lifecycle.
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image])
  useEffect(() => {
    if (!reply) return
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [reply])
  const viewer = page?.viewer ?? null
  const setReply = (text: string) => {
    confirmed.current = false
    if (!replyId.current) replyId.current = crypto.randomUUID()
    setReplyTouched(true); setReplyState(text)
  }
  const recoverDraft = () => {
    if (!recovery) return
    const {draft,kind} = recovery
    confirmed.current = false
    if (kind === 'reply') { replyId.current = draft.id; setReplyState(draft.body); setReplyPending(draft.pending); setReplyTouched(true) }
    else {
      requestId.current = draft.id; setBody(draft.body); setAuthorId(draft.authorId); setSubmitted(draft.pending); setAttachment(draft.attachment); setImage(null)
      if (kind === 'edit') setUncertainEdit(draft.pending)
      if (kind === 'compose') { setModal({type:'compose'}); if (canPublishAsNpc(viewer)) void loadIdentities() }
    }
    setRecovery(null); setConfirmDiscard(false)
  }
  const discardRecovery = () => {
    if (!recovery) return
    if (recovery.draft.pending && !confirmDiscard) { setConfirmDiscard(true); return }
    setConfirmDiscard(false)
    const key = recovery.kind === 'reply' ? draftKey : recovery.kind === 'edit' ? `${composeKey}:edit:${recovery.draft.id}` : composeKey
    writeFeedDraft(key, null); setRecovery(null)
  }
  const loadIdentities = async () => {
    setIdentityLoading(true); setIdentityError('')
    try { setIdentities(await call(services.getFeedPublishingIdentities())) }
    catch { setIdentityError('NPC identities could not be loaded. You can still post as yourself.') }
    finally { if (alive.current) setIdentityLoading(false) }
  }
  const openCompose = () => {
    dialogTrigger.current = document.activeElement as HTMLElement
    setError('')
    if (!canPublishVoyagerFeed(viewer)) { setModal({ type: 'permission' }); return }
    setAuthorId(viewer!.id); setIdentities([]); setIdentityError('');
    if (canPublishAsNpc(viewer)) void loadIdentities()
    confirmed.current = false
    const saved = readFeedDraft(composeKey)
    setRecovery(saved ? {kind:'compose',draft:saved} : null)
    requestId.current = crypto.randomUUID(); setBody(''); setImage(null); setAttachment(undefined); setSubmitted(false); setModal({ type: 'compose' })
  }
  const run = async (work: () => Promise<void>) => {
    if (busyRef.current || preparingImageRef.current) return
    if (!navigator.onLine) { setError('You are offline. Your input is kept. Reconnect before trying again.'); return }
    busyRef.current = true; setBusy(true); setError('')
    try { await work() } catch { setError('The result could not be confirmed. Retry or reload to check the latest state.') }
    finally { busyRef.current = false; if (alive.current) setBusy(false) }
  }
  const prepareImage = async (selected: File) => {
    if (preparingImageRef.current || busyRef.current) return
    if (selected.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Choose a JPG, PNG or WebP image up to 5 MB.'); return
    }
    preparingImageRef.current = true; setPreparingImage(true); setError('')
    try {
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await selected.arrayBuffer()))).map(value => value.toString(16).padStart(2, '0')).join('')
      if (!alive.current) return
      if (submitted && attachment?.hash !== hash) { setError('Choose the same image used in the original request.'); return }
      setAttachment({ name: selected.name, size: selected.size, hash }); setImage(selected)
    } catch {
      if (alive.current) setError('This image could not be prepared. Select it again before publishing.')
    } finally {
      preparingImageRef.current = false
      if (alive.current) setPreparingImage(false)
    }
  }
  const publish = () => run(async () => {
    if (attachment && !image) { setError('Reselect the original image before retrying, or check whether this post was already published.'); return }
    setSubmitted(true)
    setStorageFailed(!writeFeedDraft(composeKey, {id:requestId.current,body,authorId,updated:Date.now(),pending:true,attachment}))
    const form = new FormData(); form.set('id', requestId.current); form.set('body', body); form.set('authorId', authorId)
    if (image) form.set('image', image)
    const result = await call(services.createVoyagerPost(form))
    if (!alive.current) return
    if (result.error) { setError(result.error); if (result.outcome === 'rejected') { setSubmitted(false); requestId.current = crypto.randomUUID() }; return }
    confirmed.current = true; writeFeedDraft(composeKey, null)
    closeModal(); setBody(''); setImage(null); setSubmitted(false); setNotice('Your post is published.')
    feedPositions.delete(user.id ?? '')
    if (postId) router.push(baseHref)
    else { await load(); getRouteScrollContainer(root.current)?.scrollTo({ top: 0 }) }
  })
  const sendReply = () => run(async () => {
    if (!replyId.current) replyId.current = crypto.randomUUID()
    setReplyTouched(true); setReplyPending(true)
    setStorageFailed(!writeFeedDraft(draftKey, {id:replyId.current,body:reply,authorId:viewer!.id,updated:Date.now(),pending:true}))
    const form = new FormData(); form.set('id', replyId.current); form.set('body', reply); form.set('parentId', postId!)
    const result = await call(services.createVoyagerPost(form))
    if (!alive.current) return
    if (result.error) { setError(result.error); if (result.outcome === 'rejected') { setReplyPending(false); replyId.current = crypto.randomUUID() }; return }
    confirmed.current = true; writeFeedDraft(draftKey, null); setReplyState(''); setReplyPending(false); setReplyTouched(false); replyId.current = ''; setNotice('Reply added.'); await load()
  })
  const checkSubmission = (kind: 'compose' | 'reply') => run(async () => {
    const id = kind === 'compose' ? requestId.current : replyId.current
    const result = await call(services === liveFeed ? fetch(`/api/voyager-feed/submissions/${id}`, {cache:'no-store'}).then(async response => { if (!response.ok) throw new Error('Result unavailable'); return response.json() as Promise<Awaited<ReturnType<typeof liveFeed.getVoyagerSubmission>>> }) : services.getVoyagerSubmission(id))
    if (!alive.current) return
    if (!result) { setError('No published content is visible yet. The earlier request may still be processing. Check again or retry with the same request.'); return }
    confirmed.current = true; writeFeedDraft(kind === 'compose' ? composeKey : draftKey, null)
    if (kind === 'compose') { closeModal(); setBody(''); setSubmitted(false); setAttachment(undefined) }
    else { setReplyState(''); setReplyPending(false); setReplyTouched(false); replyId.current = '' }
    setNotice('Publication confirmed.'); await load()
  })
  const save = () => run(async () => {
    if (!modal || !('entry' in modal)) return
    setUncertainEdit(true)
    setStorageFailed(!writeFeedDraft(`${composeKey}:edit:${modal.entry.id}`, {id:modal.entry.id,body,authorId:viewer!.id,updated:Date.now(),pending:true,original:modal.entry.body}))
    const result = await call(services.editVoyagerPost(modal.entry.id, body))
    if (!alive.current) return
    if (result.error) { setError(result.error); return }
    setUncertainEdit(false)
    confirmed.current = true; writeFeedDraft(`${composeKey}:edit:${modal.entry.id}`, null)
    closeModal(); setNotice('Changes saved.'); await load()
  })
  const checkChange = () => run(async () => {
    if (!modal || !('entry' in modal)) return
    const result = await call(services === liveFeed ? fetch(`/api/voyager-feed/submissions/${modal.entry.id}`, {cache:'no-store'}).then(async response => {if (!response.ok) throw new Error('Result unavailable'); return response.json() as Promise<Awaited<ReturnType<typeof liveFeed.getVoyagerSubmission>>>}) : services.getVoyagerSubmission(modal.entry.id))
    if (!alive.current) return
    if (modal.type === 'delete' && !result) { setUncertainDelete(false); closeModal(); setNotice('Deletion confirmed.'); if (modal.entry.id === postId) router.replace(baseHref); else await load(); return }
    if (modal.type === 'edit' && result?.body === body) { confirmed.current = true; writeFeedDraft(`${composeKey}:edit:${modal.entry.id}`, null); setUncertainEdit(false); closeModal(); setNotice('Changes confirmed.'); await load(); return }
    setError(result ? 'This change is not visible yet. Check again before retrying.' : 'This content is no longer available. Keep your draft or return to the feed.')
  })
  const remove = () => run(async () => {
    if (!modal || !('entry' in modal)) return
    setUncertainDelete(true)
    const result = await call(services.deleteVoyagerPost(modal.entry.id))
    if (!alive.current) return
    if (result.error) { setError(result.error); return }
    setUncertainDelete(false)
    closeModal(); setNotice('Content deleted.')
    if (modal.entry.id === postId) { writeFeedDraft(draftKey, null); router.replace(baseHref) } else await load()
  })
  const vote = (entry: FeedEntry, direction: -1 | 1) => run(async () => {
    const next = (direction === 1 ? entry.liked : entry.downvoted) ? 0 : direction
    const result = await call(services.setVoyagerVote(entry.id, next))
    if (!alive.current) return
    if (result.error) { setError(result.error); return }
    const update = (value: FeedEntry): FeedEntry => value.id === entry.id ? withFeedVote(value, next) : value
    setPage(current => current ? { ...current, entries: current.entries.map(update), post: current.post ? update(current.post) : current.post } : current)
  })
  const closeModal = () => { setModal(null); setImage(null); setError(''); requestAnimationFrame(() => dialogTrigger.current?.focus({ preventScroll: true })) }
  const remember = (id: string) => feedPositions.set(user.id ?? '', { id, count: page?.entries.length ?? 20, top: getRouteScrollContainer(root.current)?.scrollTop ?? 0 })
  const renderEntry = (entry: FeedEntry, detail = false) => <article key={entry.id} className={`${entry.parent_id ? s.reply : s.post} ${detail ? s.detailPost : ''}`}>
    <button className={s.avatarLink} aria-label={`View ${entry.display_name}'s profile`} onClick={() => setProfileId(entry.author_id)}><span className={s.avatar}>{entry.avatar_url ?  <img src={entry.avatar_url} alt="" loading="lazy" /> : <UserRound size={24} aria-hidden />}</span></button>
    <div className={s.postMain}><div className={s.postHeader}><strong className={s.identity}>{entry.display_name}</strong><small className={s.timestamp}><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</time>{entry.updated_at !== entry.created_at && ' · Edited'}</small>
      {(entry.can_manage ?? canManageFeedEntry(viewer, entry.author_id)) && <button className={s.iconButton} aria-label={`Options for your ${entry.parent_id ? 'reply' : 'post'}`} onClick={event => { dialogTrigger.current = event.currentTarget; setError(''); setModal({ type: 'menu', entry }) }}><MoreHorizontal size={18} /></button>}</div>
      {detail && <small className={s.detailRole}>{entry.author_role.toUpperCase()}</small>}
      {!entry.parent_id && !detail ? <Link id={`feed-${entry.id}`} className={s.postLink} href={`${baseHref}/posts/${entry.id}`} onClick={() => remember(entry.id)} aria-label={`Read post by ${entry.display_name}: ${entry.body}`}><p className={s.body}>{entry.body}</p>{entry.image_path &&  <img className={s.photo} src={mediaSource(entry)} alt={`Image shared by ${entry.display_name}`} loading="lazy" />}</Link> : <><p className={s.body}>{entry.body}</p>{entry.image_path &&  <img className={s.photo} src={mediaSource(entry)} alt={`Image shared by ${entry.display_name}`} />}</>}
      <div className={s.postActions}><button disabled={busy} aria-pressed={Boolean(entry.liked)} title="Upvote" aria-label={`${entry.liked ? 'Remove ' : ''}upvote ${entry.display_name}'s ${entry.parent_id ? 'reply' : 'post'}`} onClick={() => void vote(entry, 1)}><ThumbsUp size={18} fill={entry.liked ? 'currentColor' : 'none'} aria-hidden="true" /><span>{entry.like_count ?? 0}</span></button><button disabled={busy} aria-pressed={Boolean(entry.downvoted)} title="Downvote" aria-label={`${entry.downvoted ? 'Remove ' : ''}downvote ${entry.display_name}'s ${entry.parent_id ? 'reply' : 'post'}`} onClick={() => void vote(entry, -1)}><ThumbsDown size={18} fill={entry.downvoted ? 'currentColor' : 'none'} aria-hidden="true" /><span>{entry.down_count ?? 0}</span></button>{!entry.parent_id && (detail ? <button aria-label="Write a reply" onClick={() => document.getElementById('feed-reply')?.focus()}><MessageCircle size={18} /><span>{entry.reply_count}</span></button> : <Link href={`${baseHref}/posts/${entry.id}`} onClick={() => remember(entry.id)} aria-label={`View ${entry.reply_count} replies to ${entry.display_name}'s post`}><MessageCircle size={18} /><span>{entry.reply_count}</span></Link>)}</div>
    </div>
  </article>
  const recoveryPrompt = recovery && <section className={s.recovery} aria-label="Saved draft"><p>{recovery.draft.pending ? 'An earlier publishing result is still unconfirmed.' : 'You have a saved draft.'} Saved {new Date(recovery.draft.updated).toLocaleString()}.</p>{confirmDiscard && <p>Discarding this draft does not cancel or delete a post that may already have been published. You will lose its result-checking reference.</p>}{recovery.kind === 'edit' && recovery.draft.original !== (modal && 'entry' in modal ? modal.entry.body : '') && <p>The published content changed since this draft. Review it before saving.</p>}<div><ArchiveButton onClick={recoverDraft}>RESTORE DRAFT</ArchiveButton><ArchiveButton variant="secondary" onClick={discardRecovery}>{confirmDiscard ? 'CONFIRM DISCARD' : 'DISCARD DRAFT'}</ArchiveButton></div></section>
  const locked = page?.locked
  const title = modal?.type === 'compose' ? 'New post' : modal?.type === 'permission' ? 'Become a Voyager to post' : modal?.type === 'edit' ? 'Edit your content' : modal?.type === 'delete' ? 'Delete your content?' : 'Content options'
  return <main ref={root} className="main pilot-archive-page" data-route-scroll><div className={s.feed}>
    {postId && !locked ? <header className={s.detailHeader}><Link href={baseHref} aria-label="Back to feed"><ArrowLeft size={22} /></Link><h1 id="feed-post-heading" tabIndex={-1}>Post</h1></header> : <VoyagerHeader tab="feed" showBrand profile={Boolean(viewer || user.id)} />}
    {(loading || authLoading) && !page && <ArchiveRouteLoading label="LOADING CONVERSATIONS" />}
    {offline && <p role="status" className={s.status}>You are offline. Drafts stay on this device; reconnect to send.</p>}
    {storageFailed && <p role="alert">Draft storage is unavailable. Keep this page open to retain your input.</p>}
    {!modal && recovery && recoveryPrompt}
    {error && !modal && <div role="alert" className={s.error}>{error}<ArchiveButton variant="secondary" onClick={() => void load()}>Retry</ArchiveButton></div>}
    {notice && <p role="status" className={s.notice}>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={18} /></button></p>}
    {locked ? <section className={s.gate} aria-label="Join Multiverse Collective"><h2>Join the conversation</h2><p className={s.gateDescription}>{viewer ? 'Complete your registration to read and join Voyager conversations.' : 'Request access or log in to read and join Voyager conversations.'}</p><div className={guestStyles.actions}><ArchiveLinkButton href={viewer ? '/register?redirect=%2Fvoyagers' : REQUEST_ACCESS_HREF} variant="primary">REQUEST ACCESS</ArchiveLinkButton><ArchiveLinkButton href="/login?redirect=%2Fvoyagers">LOG IN</ArchiveLinkButton></div></section> : page && <>
      {postId ? page.post ? <section aria-label="Post detail" className={s.thread}>{renderEntry(page.post, true)}<div className={s.replyComposer}><label htmlFor="feed-reply">Reply to {page.post.display_name}</label><ArchiveTextarea id="feed-reply" maxLength={500} value={reply} disabled={busy || replyPending || Boolean(recovery)} placeholder="Add your perspective…" onChange={event => setReply(event.target.value)} /><div><small>{reply.length}/500</small>{replyPending && <ArchiveButton variant="secondary" disabled={busy} onClick={() => void checkSubmission('reply')}>CHECK RESULT</ArchiveButton>}{reply && <button disabled={busy || replyPending} className={s.clear} onClick={() => { writeFeedDraft(draftKey, null); setReplyState('') }}>Clear</button>}<ArchiveButton disabled={busy || Boolean(recovery) || !reply.trim()} onClick={() => void sendReply()}>{busy ? 'SAVING…' : replyPending ? 'RETRY REPLY' : 'REPLY'}</ArchiveButton></div></div><h2 className={s.replyHeading}>Replies <span>{page.post.reply_count}</span></h2>{page.entries.map(entry => renderEntry(entry))}{page.entries.length === 0 && <p className={s.empty}>No replies yet. Start the conversation.</p>}</section> : <section className={s.empty}><h2>Post unavailable</h2><p>It may have been deleted.</p><ArchiveLinkButton href={baseHref}>BACK TO FEED</ArchiveLinkButton></section> : <section aria-label="Voyager feed">{page.entries.map(entry => renderEntry(entry))}{page.entries.length === 0 && <p className={s.empty}>No posts yet. Share the first discovery.</p>}</section>}
      {page.next && <div className={s.more}><ArchiveButton variant="secondary" disabled={loading || busy} onClick={() => void load(true)}>{loading ? 'LOADING…' : 'LOAD MORE'}</ArchiveButton></div>}
      <ArchiveButton className={s.floatingPost} onClick={openCompose} aria-label="Share an update"><Plus size={20} strokeWidth={1.75} aria-hidden="true" /><span>Share an update</span></ArchiveButton>
    </>}
    {profileId && <MemberProfileSheet profileId={profileId} onClose={() => setProfileId(null)} />}
    {modal && <ArchiveSheet key={modal.type} open title={title} busy={busy || preparingImage} dirty={modal.type === 'compose' ? !submitted && Boolean(body || image) : modal.type === 'edit' && !uncertainEdit && body !== modal.entry.body} onClose={() => { if (recovery) { setRecovery(null); closeModal(); return }; if (modal.type === 'compose' && !submitted) writeFeedDraft(composeKey, null); if (modal.type === 'edit' && !uncertainEdit) writeFeedDraft(`${composeKey}:edit:${modal.entry.id}`, null); setRecovery(null); closeModal() }} footer={
      modal.type === 'permission' ? <ArchiveLinkButton href="/voyager-initiation" variant="primary" fullWidth>Voyager Initiation</ArchiveLinkButton> : modal.type === 'compose' ? <ArchiveButton fullWidth disabled={busy || preparingImage || Boolean(recovery) || !body.trim() || Boolean(attachment && !image)} onClick={() => void publish()}>{preparingImage ? 'PREPARING IMAGE…' : busy ? 'PUBLISHING…' : submitted ? 'RETRY POST' : 'POST'}</ArchiveButton> : modal.type === 'edit' ? <ArchiveButton fullWidth disabled={busy || Boolean(recovery) || !body.trim() || body === modal.entry.body} onClick={() => void save()}>SAVE CHANGES</ArchiveButton> : modal.type === 'delete' ? <div className="archive-sheet__actions"><ArchiveButton variant="secondary" disabled={busy} onClick={closeModal}>Cancel</ArchiveButton><ArchiveButton disabled={busy} onClick={() => void remove()}>DELETE</ArchiveButton></div> : undefined}>
      {storageFailed && <p role="alert">Draft storage is unavailable. Keep this page open to retain your input.</p>}
      {error && <p role="alert" className={s.error}>{error}</p>}
      {recovery && recoveryPrompt}
      {modal.type === 'compose' && submitted && <div><p>The publishing result needs confirmation. Your original request is retained.</p><ArchiveButton variant="secondary" disabled={busy} onClick={() => void checkSubmission('compose')}>CHECK RESULT</ArchiveButton></div>}
      {modal.type === 'compose' && attachment && !image && <div><p>Reselect {attachment.name}. Local images are not saved with drafts.</p>{!submitted && <ArchiveButton variant="ghost" onClick={() => setAttachment(undefined)}>REMOVE ATTACHMENT</ArchiveButton>}</div>}
      {((modal.type === 'edit' && uncertainEdit) || (modal.type === 'delete' && uncertainDelete)) && <ArchiveButton variant="secondary" disabled={busy} onClick={() => void checkChange()}>CHECK RESULT</ArchiveButton>}
      {modal.type === 'permission' && <div className={s.permission}><p>Become a Voyager to publish posts and share your updates here.</p></div>}
      {modal.type === 'compose' && !recovery && <ArchiveButton variant="ghost" disabled={busy || preparingImage} onClick={() => { const saved = writeFeedDraft(composeKey, {id:requestId.current,body,authorId,updated:Date.now(),pending:submitted,attachment}); if (!saved) { setStorageFailed(true); setError('Draft could not be saved. Keep this page open or explicitly discard your changes.'); return }; closeModal() }}>SAVE DRAFT & CLOSE</ArchiveButton>}
      {modal.type === 'compose' && <section className={s.composer} aria-label="Create a post">{canPublishAsNpc(viewer) && <div className={s.identityPicker}><label htmlFor="feed-publishing-identity">Post as</label><ArchiveSelect id="feed-publishing-identity" value={authorId} disabled={busy || submitted || identityLoading} onChange={event => setAuthorId(event.target.value)}><option value={viewer!.id}>{viewer!.display_name} (you)</option>{identities.map(identity => <option key={identity.id} value={identity.id}>{identity.display_name} (NPC)</option>)}</ArchiveSelect>{authorId !== viewer!.id && <p>Posting as {identities.find(identity => identity.id === authorId)?.display_name}</p>}{!identityLoading && !identityError && !identities.length && <p>No NPC identities are available.</p>}{identityLoading && <p role="status">Loading NPC identities…</p>}{identityError && <div role="alert"><p>{identityError}</p><ArchiveButton variant="ghost" disabled={busy || submitted} onClick={() => void loadIdentities()}>Retry identities</ArchiveButton></div>}</div>}<ArchiveTextarea aria-label="Post text" maxLength={500} rows={4} value={body} disabled={busy || submitted || Boolean(recovery)} placeholder="What’s happening in your world?" onChange={event => setBody(event.target.value)} />{image && imageUrl && <div className={s.attachment}>{}<img src={imageUrl} alt="Attached image preview" /><button disabled={busy || preparingImage || submitted} className={s.iconButton} aria-label="Remove attached image" onClick={() => { setImage(null); setAttachment(undefined) }}><X size={20} /></button></div>}<div className={s.composerActions}><input type="file" ref={fileInput} hidden accept="image/jpeg,image/png,image/webp" onChange={event => { const selected = event.target.files?.[0]; event.target.value = ''; if (selected) void prepareImage(selected) }} /><button className={s.iconButton} disabled={busy || preparingImage || (submitted && Boolean(image))} aria-label="Attach image" onClick={() => fileInput.current?.click()}><ImagePlus size={22} /></button><small>{body.length}/500</small></div></section>}
      {modal.type === 'menu' && <div className={s.menu}><ArchiveButton variant="secondary" onClick={() => { confirmed.current = false; const saved = readFeedDraft(`${composeKey}:edit:${modal.entry.id}`); setRecovery(saved ? {kind:'edit',draft:saved} : null); setUncertainEdit(false); setBody(modal.entry.body); setModal({ ...modal, type: 'edit' }) }}>Edit</ArchiveButton><ArchiveButton variant="secondary" onClick={() => { setUncertainDelete(false); setModal({ ...modal, type: 'delete' }) }}>Delete</ArchiveButton></div>}
      {modal.type === 'edit' && <ArchiveTextarea aria-label="Your content" rows={5} maxLength={500} value={body} disabled={busy || uncertainEdit || Boolean(recovery)} onChange={event => setBody(event.target.value)} />}
      {modal.type === 'delete' && <p>{modal.entry.parent_id ? 'This reply will be removed.' : 'This post and its replies will be removed.'} This cannot be undone.</p>}
    </ArchiveSheet>}
  </div></main>
}
