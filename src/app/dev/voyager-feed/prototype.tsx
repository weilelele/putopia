'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react'
import { ArrowLeft, ArrowRight, FileText, Globe, Heart, ImagePlus, Plus, LayoutDashboard, MessageCircle, MoreHorizontal, RotateCcw, UserRound, Users, X } from 'lucide-react'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import guestStyles from '../../console/guest-intro.module.css'
import { ArchiveTextarea } from '@/components/archive-input'
import { actors, canReadFeed, visibleFeed, canInteract, canManage, canPost, maren, ryo, samplePosts, type Actor, type Entry, type Role } from './model'
import s from './prototype.module.css'
import { REQUEST_ACCESS_HREF } from '@/lib/request-access'

type Modal = { type: 'compose' | 'permission' } | { type: 'edit' | 'delete' | 'menu'; postId: string; replyId?: string } | { type: 'profile'; actor: Actor } | { type: 'info'; title: string; text: string } | { type: 'reset' }
type Editor = { text: string; image?: string; error: string }
function subscribeToPost(callback: () => void) { window.addEventListener('hashchange', callback); return () => window.removeEventListener('hashchange', callback) }
const currentPost = () => new URLSearchParams(window.location.hash.slice(1)).get('post') ?? ''
const emptyEditor: Editor = { text: '', error: '' }
const tabs = ['FEED', 'MEMBERS', 'LOGS'] as const
const navigation = [{ label: 'DASHBOARD', icon: LayoutDashboard }, { label: 'INTEL', icon: FileText }, { label: 'DEVICES', icon: null }, { label: 'WORLDS', icon: Globe }, { label: 'VOYAGERS', icon: Users }]

function Avatar({ actor }: { actor: Actor }) {
  return <span className={s.avatar}>{actor.avatar
    // eslint-disable-next-line @next/next/no-img-element -- Prototype avatars and data URLs are local assets.
    ? <img src={actor.avatar} alt="" /> : <UserRound size={24} aria-hidden />}</span>
}
function Brand() {
  return <span className={s.brand}>
    {/* eslint-disable-next-line @next/next/no-img-element -- Preserve original brand raster assets. */}
    <img src="/assets/vi-icon.png" alt="" width="28" height="22" />
    {/* eslint-disable-next-line @next/next/no-img-element -- Preserve original wordmark proportions. */}
    <img src="/assets/vi-wordmark.png" alt="Multiverse Collective" width="120" height="34" />
  </span>
}

export function VoyagerFeedPrototype() {
  const [role, setRole] = useState<Role>('voyager')
  const [tab, setTab] = useState<(typeof tabs)[number]>('FEED')
  const [posts, setPosts] = useState(samplePosts)
  const [draft, setDraft] = useState<Editor>(emptyEditor)
  const [edit, setEdit] = useState('')
  const [replies, setReplies] = useState<Record<string, string>>({})
  const postId = useSyncExternalStore(subscribeToPost, currentPost, () => '')
  const reply = replies[postId] ?? ''
  const hasReplyDraft = Object.values(replies).some(text => text.length > 0)
  const setReply = (text: string) => setReplies(current => ({ ...current, [postId]: text }))
  const feedScroll = useRef(0)
  const entryTrigger = useRef<string | null>(null)
  const [modal, setModal] = useState<Modal | null>(null)
  const [notice, setNotice] = useState('')
  const [reported, setReported] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const uploadVersion = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const scroll = useRef<HTMLElement>(null)
  const actor = actors[role]
  const readablePosts = visibleFeed(role, posts)
  const thread = readablePosts.find(post => post.id === postId)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scroll.current?.scrollTo({ top: postId ? 0 : feedScroll.current })
      if (!postId && entryTrigger.current) {
        const trigger = Array.from(scroll.current?.querySelectorAll<HTMLAnchorElement>('a[aria-label]') ?? []).find(link => link.getAttribute('aria-label') === entryTrigger.current)
        trigger?.focus({ preventScroll: true })
      }
      else document.getElementById('post-heading')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [postId])
  const selectedPost = modal && 'postId' in modal ? posts.find(p => p.id === modal.postId) : undefined
  const selectedEntry = modal && 'replyId' in modal && modal.replyId ? selectedPost?.replies.find(r => r.id === modal.replyId) : selectedPost
  const info = (title: string, text: string) => setModal({ type: 'info', title, text })
  const loginPrompt = () => info('Join the conversation', 'Log in as an Applicant to like and reply. In this prototype, close this dialog and choose Applicant in the preview toolbar.')
  const modifyEntry = (postId: string, replyId: string | undefined, update: (entry: Entry) => Entry) => {
    setPosts(current => current.map(post => post.id !== postId ? post : replyId ? { ...post, replies: post.replies.map(r => r.id === replyId ? update(r) : r) } : update(post)))
  }
  const toggleLike = (postId: string, replyId?: string) => {
    if (!canInteract(role)) { loginPrompt(); return }
    modifyEntry(postId, replyId, entry => ({ ...entry, likes: entry.likes.includes(actor.id) ? entry.likes.filter(id => id !== actor.id) : [...entry.likes, actor.id] }))
  }
  const publish = () => {
    if (!canPost(role) || !draft.text.trim() || uploading) return
    setPosts(current => [{ id: crypto.randomUUID(), author: actor, text: draft.text.trim(), image: draft.image, time: 'Just now', likes: [], replies: [] }, ...current])
    setDraft(emptyEditor); setModal(null); setTab('FEED'); feedScroll.current = 0; window.location.hash = ''; requestAnimationFrame(() => scroll.current?.scrollTo({ top: 0 })); setNotice('Your post is published in this preview.')
  }
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setDraft(current => ({ ...current, error: 'Choose a JPG, PNG or WebP image under 5 MB.' })); return
    }
    const version = ++uploadVersion.current
    setUploading(true)
    const reader = new FileReader()
    reader.onload = () => { if (version !== uploadVersion.current) return; setDraft(current => ({ ...current, image: String(reader.result), error: '' })); setUploading(false) }
    reader.onerror = () => { if (version !== uploadVersion.current) return; setDraft(current => ({ ...current, error: 'Image could not be read. Try another file.' })); setUploading(false) }
    reader.readAsDataURL(file)
  }
  const sendReply = () => {
    if (!thread || !canInteract(role) || !reply.trim()) return
    modifyEntry(thread.id, undefined, post => ({ ...post, replies: [...post.replies, { id: crypto.randomUUID(), author: actor, text: reply.trim(), time: 'Just now', likes: [], replies: [] }] }))
    setReply(''); setNotice('Reply added.')
  }
  const saveEdit = () => {
    if (!modal || !('postId' in modal) || !selectedEntry || !canManage(actor, selectedEntry) || !edit.trim()) return
    modifyEntry(modal.postId, 'replyId' in modal ? modal.replyId : undefined, entry => ({ ...entry, text: edit.trim(), edited: true }))
    setModal(null); setNotice('Changes saved.')
  }
  const deleteEntry = () => {
    if (!modal || !('postId' in modal) || !selectedEntry || !canManage(actor, selectedEntry)) return
    if ('replyId' in modal && modal.replyId) { modifyEntry(modal.postId, undefined, p => ({ ...p, replies: p.replies.filter(r => r.id !== modal.replyId) })); setModal(null) }
    else { setPosts(current => current.filter(p => p.id !== modal.postId)); setReplies(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== modal.postId))); setModal(null); if (postId === modal.postId) window.location.hash = '' }
    setNotice('Your content was deleted.')
  }
  const selectRole = (next: Role) => {
    // Distinct simulated accounts: switching roles never inherits another user's ownership.
    ++uploadVersion.current; setUploading(false); setRole(next); setModal(null); setDraft(emptyEditor); setReplies({}); setNotice(''); feedScroll.current = 0; entryTrigger.current = null; scroll.current?.scrollTo({ top: 0 }); if (!canReadFeed(next)) window.location.hash = ''
  }
  const closeModal = () => {
    if (modal?.type === 'compose') { ++uploadVersion.current; setUploading(false); setDraft(emptyEditor) }
    setModal(null)
  }
  const openComposer = () => setModal({ type: canPost(role) ? 'compose' : 'permission' })
  const rememberFeed = (trigger?: HTMLAnchorElement) => {
    if (!postId) feedScroll.current = scroll.current?.scrollTop ?? 0
    if (trigger) entryTrigger.current = trigger.getAttribute('aria-label')
  }
  const backToFeed = () => {
    if (entryTrigger.current) window.history.back()
    else window.location.hash = ''
  }
  const renderEntry = (entry: Entry, parentId?: string, detail = false) => <article key={entry.id} className={`${parentId ? s.reply : s.post} ${detail ? s.detailPost : ''}`}>
    <button className={s.avatarLink} aria-label={`View ${entry.author.name}'s profile`} onClick={() => setModal({ type: 'profile', actor: entry.author })}><Avatar actor={entry.author} /></button>
    <div className={s.postMain}>
      <div className={s.postHeader}>
        <button className={s.identity} onClick={() => setModal({ type: 'profile', actor: entry.author })}><strong>{entry.author.name}</strong></button>
        <small className={s.timestamp}>· {entry.time}{entry.edited ? ' · Edited' : ''}</small>
        <button className={s.iconButton} aria-label={`Options for ${entry.author.name}'s ${parentId ? 'reply' : 'post'}`} onClick={() => setModal({ type: 'menu', postId: parentId ?? entry.id, replyId: parentId ? entry.id : undefined })}><MoreHorizontal size={18} /></button>
      </div>
      {detail && <small className={s.detailRole}>{entry.author.role.toUpperCase()}</small>}
      {!parentId && !detail ? <a className={s.postLink} href={`#post=${encodeURIComponent(entry.id)}`} onClick={event => rememberFeed(event.currentTarget)} aria-label={`Read post by ${entry.author.name}: ${entry.text}`}>
        <p className={s.body}>{entry.text}</p>
        {entry.image && <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Local prototype media. */}
          <img className={s.photo} src={entry.image} alt={`Image shared by ${entry.author.name}`} />
        </>}
      </a> : <><p className={s.body}>{entry.text}</p>{entry.image && <>
        {/* eslint-disable-next-line @next/next/no-img-element -- Local prototype media. */}
        <img className={s.photo} src={entry.image} alt={`Image shared by ${entry.author.name}`} />
      </>}</>}
      <div className={s.postActions}>
        <button aria-label={`${entry.likes.includes(actor.id) ? 'Unlike' : 'Like'} ${entry.author.name}'s ${parentId ? 'reply' : 'post'}`} aria-pressed={entry.likes.includes(actor.id)} onClick={() => toggleLike(parentId ?? entry.id, parentId ? entry.id : undefined)}><Heart size={18} fill={entry.likes.includes(actor.id) ? 'currentColor' : 'none'} /><span>{entry.likes.length}</span></button>
        {!parentId && (detail ? <button aria-label="Write a reply" onClick={() => document.getElementById('reply-text')?.focus()}><MessageCircle size={18} /><span>{entry.replies.length}</span></button> : <a aria-label={`View ${entry.replies.length} replies to ${entry.author.name}'s post`} href={`#post=${encodeURIComponent(entry.id)}`} onClick={event => rememberFeed(event.currentTarget)}><MessageCircle size={18} /><span>{entry.replies.length}</span></a>)}
      </div>
    </div>
  </article>
  const dialogTitle = modal?.type === 'compose' ? 'New post' : modal?.type === 'permission' ? 'Become a Voyager to post' : modal?.type === 'edit' ? 'Edit your content' : modal?.type === 'delete' ? 'Delete your content?' : modal?.type === 'menu' ? 'Content options' : modal?.type === 'profile' ? modal.actor.name : modal?.type === 'info' ? modal.title : 'Reset preview?'

  return <main ref={scroll} className={s.page}>
    <div className={s.lab} aria-label="Prototype controls"><span>原型 · 本地数据</span><label><span className="sr-only">体验身份</span><select aria-label="体验身份" value={role} disabled={Boolean(draft.text || draft.image || uploading || hasReplyDraft)} onChange={e => selectRole(e.target.value as Role)}>{Object.keys(actors).map(r => <option key={r} value={r}>{r === 'guest' ? 'guest · 未登录' : r === 'unregistered' ? '未完成注册' : r}</option>)}</select></label><button aria-label="Reset preview" onClick={() => setModal({ type: 'reset' })}><RotateCcw size={16} /><span>重置</span></button>{(draft.text || draft.image || hasReplyDraft) && <small>发布或清空草稿后可切换身份</small>}</div>
    <aside className={s.desktopRail}><Brand /><p>A place for shared discoveries.</p><span>VOYAGERS</span><p>Preview as {role}</p></aside>
    <div className={s.content}>
      {postId && canReadFeed(role) ? <>
        <header className={s.detailHeader}><button className={s.iconButton} aria-label="Back to feed" onClick={backToFeed}><ArrowLeft size={22} /></button><h1 id="post-heading" tabIndex={-1}>Post</h1></header>
        {thread ? <section className={s.thread} aria-label="Post detail">
          {renderEntry(thread, undefined, true)}
          <div className={s.replyComposer}><label htmlFor="reply-text">Reply to {thread.author.name}</label><ArchiveTextarea id="reply-text" placeholder="Add your perspective…" rows={2} maxLength={500} value={reply} onChange={e => setReply(e.target.value)} /><div><small>{reply.length}/500</small>{reply && <button className={s.clear} onClick={() => setReply('')}>Clear</button>}<ArchiveButton disabled={!reply.trim()} onClick={sendReply}>REPLY</ArchiveButton></div></div>
          {notice && <p className={s.notice} role="status">{notice}</p>}
          <h2 className={s.replyHeading}>Replies <span>{thread.replies.length}</span></h2>
          {thread.replies.map(item => renderEntry(item, thread.id))}
          {thread.replies.length === 0 && <p className={s.empty}>No replies yet. Start the conversation.</p>}
        </section> : <section className={s.section}><h2>Post unavailable</h2><p>This post may have been deleted.</p><ArchiveButton onClick={() => { window.location.hash = '' }}>BACK TO FEED</ArchiveButton></section>}
      </> : <>
      {(tab !== 'FEED' || canReadFeed(role)) && <header className={s.header}><Brand />{canReadFeed(role) && <button className={s.profileLink} onClick={() => setModal({ type: 'profile', actor })}>MY PROFILE <ArrowRight size={18} /></button>}</header>}
      <h1 className="sr-only">Voyagers</h1>
      <nav className={s.tabs} aria-label="Voyagers sections">{tabs.map(name => <button key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => { setTab(name); setNotice('') }}>{name}</button>)}</nav>
      {tab === 'FEED' && (canReadFeed(role) ? <>
        {notice && <p className={s.notice} role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16} /></button></p>}
        <section aria-label="Voyager feed">{readablePosts.map(post => renderEntry(post))}{readablePosts.length === 0 && <p className={s.empty}>No posts yet. Share the first discovery.</p>}</section>
      </> : <section className={s.gate} aria-label="Join Multiverse Collective">
        <h2>Join the conversation</h2>
        <p className={s.gateDescription}>{role === 'unregistered' ? 'Complete your registration to read and join Voyager conversations.' : 'Request access or log in to read and join Voyager conversations.'}</p>
        <div className={guestStyles.actions}><ArchiveLinkButton href={role === 'unregistered' ? '/register' : REQUEST_ACCESS_HREF} variant="primary">REQUEST ACCESS</ArchiveLinkButton><ArchiveLinkButton href="/login?redirect=%2Fvoyagers" variant="secondary">LOG IN</ArchiveLinkButton></div>
      </section>)}
      {tab === 'MEMBERS' && <section className={s.section}><h2>Meet the Voyagers</h2><p>People exploring alongside you.</p>{[ryo, maren, actors.voyager, actors.architect].map(member => <button className={s.member} key={member.id} onClick={() => setModal({ type: 'profile', actor: member })}><Avatar actor={member} /><span><strong>{member.name}</strong><small>{member.location}</small></span><ArrowRight size={20} /></button>)}</section>}
      {tab === 'LOGS' && <section className={s.section}><h2>Voyager Logs</h2><p>Longer stories from the collective.</p><button className={s.log} onClick={() => info('A week beside the ocean', 'On the first morning, everything looked familiar. By the seventh, I had learned to look more closely. The shifting clouds and changing shoreline made each visit its own discovery. This is a sample Voyager Log for the interaction prototype.')}><small>RYO TANAKA · OCT 10, 2026</small><h3>A week beside the ocean</h3><p>Seven mornings. One shoreline. A different story each time.</p><span>READ LOG <ArrowRight size={18} /></span></button></section>}
      </>}
    </div>
    {canReadFeed(role) && (tab === 'FEED' || Boolean(postId)) && <ArchiveButton className={s.floatingPost} onClick={openComposer} aria-label="Share an update"><Plus size={20} strokeWidth={1.75} aria-hidden="true" /><span>Share an update</span></ArchiveButton>}
    <nav className={s.bottom} aria-label="Primary navigation">{navigation.map(({ label, icon: Icon }) => <button key={label} aria-current={label === 'VOYAGERS' ? 'page' : undefined} onClick={() => label === 'VOYAGERS' ? (setTab('FEED'), window.location.hash = '', scroll.current?.scrollTo({ top: 0, behavior: 'smooth' })) : info(label, 'This prototype focuses on Voyagers. Other product sections remain available in the main application. Close this dialog to continue exploring the feed.')}>
      {Icon ? <Icon size={22} /> : <span className={s.deviceMark}>{/* eslint-disable-next-line @next/next/no-img-element -- Original navigation mark. */}
<img src="/assets/vi-icon.png" alt="" /></span>}<span>{label}</span>
    </button>)}</nav>
    {modal && <ArchiveSheet key={modal.type} open title={dialogTitle} onClose={closeModal} dirty={modal.type === 'edit' ? edit !== selectedEntry?.text : modal.type === 'compose' && Boolean(draft.text || draft.image)} footer={
      modal.type === 'compose' ? <ArchiveButton fullWidth disabled={!draft.text.trim() || uploading} onClick={publish}>{uploading ? 'READING…' : 'POST'}</ArchiveButton> :
      modal.type === 'permission' ? <ArchiveLinkButton href="/voyager-initiation" variant="primary" fullWidth>Voyager Initiation</ArchiveLinkButton> :
      modal.type === 'edit' ? <ArchiveButton fullWidth disabled={!edit.trim() || edit === selectedEntry?.text} onClick={saveEdit}>SAVE CHANGES</ArchiveButton> :
      modal.type === 'delete' ? <div className="archive-sheet__actions"><ArchiveButton variant="secondary" onClick={closeModal}>Cancel</ArchiveButton><ArchiveButton onClick={deleteEntry}>DELETE</ArchiveButton></div> :
      modal.type === 'reset' ? <div className="archive-sheet__actions"><ArchiveButton variant="secondary" onClick={closeModal}>Cancel</ArchiveButton><ArchiveButton onClick={() => { ++uploadVersion.current; setUploading(false); setPosts(samplePosts()); setDraft(emptyEditor); setReplies({}); setReported([]); setNotice('Preview reset.'); setModal(null) }}>RESET</ArchiveButton></div> : undefined
    }>
      {modal.type === 'compose' && <section className={s.composer} aria-label="Create a post">
          <div className={s.composerRow}><Avatar actor={actor} /><textarea aria-label="Post text" placeholder="What’s happening in your world?" rows={2} maxLength={500} value={draft.text} onChange={e => setDraft(current => ({ ...current, text: e.target.value }))} /></div>
          {draft.image && <div className={s.attachment}>{/* eslint-disable-next-line @next/next/no-img-element -- Local preview file. */}
<img src={draft.image} alt="Attached image preview" /><button className={s.iconButton} aria-label="Remove attached image" onClick={() => setDraft(current => ({ ...current, image: undefined }))}><X size={20} /></button></div>}
          <div className={s.composerActions}><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} /><button className={s.iconButton} aria-label="Attach image" disabled={uploading} onClick={() => fileInput.current?.click()}><ImagePlus size={22} /></button>{draft.text && <small>{draft.text.length}/500</small>}{(draft.text || draft.image) && <button className={s.clear} onClick={() => { ++uploadVersion.current; setUploading(false); setDraft(emptyEditor) }}>Clear</button>}</div>
          {draft.error && <p role="alert">{draft.error}</p>}
        </section>}
      {modal.type === 'permission' && <div className={s.permission}><p>Become a Voyager to publish posts and share your updates here.</p><small>Your current access: APPLICANT</small></div>}
      {modal.type === 'menu' && selectedEntry && <div className={s.menu}>{canManage(actor, selectedEntry) ? <><ArchiveButton variant="secondary" onClick={() => { setEdit(selectedEntry.text); setModal({ ...modal, type: 'edit' }) }}>Edit</ArchiveButton><ArchiveButton variant="secondary" onClick={() => setModal({ ...modal, type: 'delete' })}>Delete</ArchiveButton></> : <><p>Only the author can edit or delete this content.</p><ArchiveButton variant="secondary" disabled={reported.includes(selectedEntry.id)} onClick={() => { if (!canInteract(role)) { loginPrompt(); return }; setReported(current => [...current, selectedEntry.id]); info('Report recorded in preview', 'Thank you. In the live product, this report would be sent for review. No report has been sent from this prototype.') }}>{reported.includes(selectedEntry.id) ? 'Reported in preview' : 'Report content'}</ArchiveButton></>}</div>}
      {modal.type === 'edit' && <div><label htmlFor="edit-content">Your content</label><ArchiveTextarea id="edit-content" value={edit} rows={5} maxLength={500} onChange={e => setEdit(e.target.value)} /><small>{edit.length}/500</small></div>}
      {modal.type === 'delete' && <p>{'replyId' in modal && modal.replyId ? 'This reply will be removed.' : 'This post and its replies will be removed.'} This cannot be undone within the preview.</p>}
      {modal.type === 'profile' && <div className={s.profile}><Avatar actor={modal.actor} /><p>{modal.actor.role.toUpperCase()}</p><p>{modal.actor.location}</p><p>Curious about the places we have yet to discover.</p><ArchiveButton variant="secondary" onClick={() => { setTab('FEED'); window.location.hash = ''; setModal(null); setNotice(`${modal.actor.name}'s posts appear in the shared feed.`) }}>BACK TO FEED</ArchiveButton></div>}
      {modal.type === 'info' && <p>{modal.text}</p>}
      {modal.type === 'reset' && <p>Remove your preview posts, replies and likes and restore the sample content? No live account data is involved.</p>}
    </ArchiveSheet>}
  </main>
}
