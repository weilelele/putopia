'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { useAuth } from '@/lib/auth-context'
import { deleteComment, postComment } from '@/lib/actions/comments'
import { CHAT_MAX_LENGTH, CHAT_POLL_MS, prependChatMessage, type ChatPage } from '@/lib/dreamcatcher-chat-model'
import type { Comment } from '@/types/database'
import styles from './worlds-room.module.css'

export function DreamcatcherChat({ roomId, city, timeZone }: { roomId: string; city: string; timeZone: string }) {
  const { user, loading: authLoading } = useAuth()
  const [messages, setMessages] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [readError, setReadError] = useState('')
  const [status, setStatus] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const mutationVersion = useRef(0)
  const canPost = !!user.id && !authLoading

  useEffect(() => {
    let disposed = false
    let inFlight = false
    let timer: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    async function load() {
      if (disposed || inFlight) return
      inFlight = true
      const version = mutationVersion.current
      try {
        const suffix = cursor ? `?before=${encodeURIComponent(cursor)}` : ''
        const response = await fetch(`/api/dreamcatchers/${roomId}/chat${suffix}`, { cache: 'no-store', signal: controller.signal })
        const result = await response.json() as ChatPage & { error?: string }
        if (disposed || version !== mutationVersion.current) return
        if (!response.ok) {
          if (response.status === 404) setMessages([])
          throw new Error(result.error || 'Could not load messages.')
        }
        setMessages(result.messages)
        setNextCursor(result.nextCursor)
        setReadError('')
      } catch (error) {
        if (!disposed && version === mutationVersion.current) setReadError(error instanceof Error ? error.message : 'Could not load messages.')
      } finally {
        inFlight = false
        if (!disposed) setLoading(false)
      }
    }
    function schedule() {
      timer = setTimeout(async () => {
        if (document.visibilityState === 'visible' && !cursor) await load()
        if (!disposed) schedule()
      }, CHAT_POLL_MS)
    }
    function resume() { if (document.visibilityState === 'visible' && !cursor) void load() }
    void load()
    schedule()
    document.addEventListener('visibilitychange', resume)
    return () => { disposed = true; controller.abort(); clearTimeout(timer); document.removeEventListener('visibilitychange', resume) }
  }, [roomId, cursor, refresh])

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canPost || sending || !body.trim()) return
    setSending(true)
    setStatus('')
    mutationVersion.current += 1
    try {
      const result = await postComment('dreamcatcher', roomId, body)
      if (result.error || !result.data) { setStatus(result.error || 'Could not send your message.'); return }
      mutationVersion.current += 1
      const sent = result.data
      setMessages((current) => prependChatMessage(cursor ? [] : current, sent))
      setCursor(null)
      setBody('')
      setStatus('Message sent.')
      setRefresh((value) => value + 1)
    } catch {
      setStatus('Could not send your message. Your text has been kept; please try again.')
    } finally { setSending(false) }
  }

  async function remove() {
    if (!deleteId || deleting) return
    setDeleting(true)
    mutationVersion.current += 1
    try {
      const result = await deleteComment(deleteId)
      if (result.error) { setStatus(result.error); return }
      mutationVersion.current += 1
      setMessages((current) => current.filter((message) => message.id !== deleteId))
      setDeleteId(null)
      setRefresh((value) => value + 1)
      setStatus('Message removed.')
    } catch { setStatus('Could not remove this message. Please try again.') }
    finally { setDeleting(false) }
  }

  function changePage(before: string | null) {
    setLoading(true)
    setCursor(before)
    setDeleteId(null)
  }

  return (
    <div className={styles.chat}>
      {canPost ? <form className={styles.composer} onSubmit={send}>
        <label htmlFor={`chat-${roomId}`}>MESSAGE {city.toUpperCase()}</label>
        <textarea id={`chat-${roomId}`} className="input-dark" rows={3} maxLength={CHAT_MAX_LENGTH}
          placeholder="Leave a message…" value={body} disabled={sending}
          onChange={(event) => setBody(event.target.value)} />
        <div className={styles.composerFooter}>
          <span>{body.length} / {CHAT_MAX_LENGTH}</span>
          <ArchiveButton type="submit" disabled={sending || !body.trim()}>{sending ? 'SENDING…' : 'SEND MESSAGE'}</ArchiveButton>
        </div>
      </form> : authLoading ? <p className={styles.chatNote}>Checking sign-in…</p> :
        <div className={styles.signIn}><p>Join the conversation with this Dreamcatcher.</p><ArchiveLinkButton href="/login?redirect=%2Fworlds%2Flive" variant="secondary">LOG IN TO CHAT</ArchiveLinkButton></div>}
      <p role="status" className={styles.chatNote}>{status}</p>
      <div className={styles.chatToolbar}><span>NEWEST FIRST</span><span>{cursor ? 'EARLIER MESSAGES' : 'AUTO-UPDATING'}</span></div>
      {readError ? <div className={styles.chatError} role="alert"><p>{readError}</p><ArchiveButton variant="secondary" onClick={() => setRefresh((value) => value + 1)}>RETRY</ArchiveButton></div> : null}
      {loading ? <p className={styles.chatNote}>Loading messages…</p> : !messages.length && !readError ? <p className={styles.chatNote}>No messages yet. Start the conversation.</p> : null}
      {!loading ? <ol className={styles.messages} aria-label="Messages, newest first">
        {messages.map((message) => <li key={message.id} className={styles.message}>
          <header className={styles.messageHeader}>
            <strong>{message.author_name}</strong>
            <time dateTime={message.created_at} title={`${city} local time`}>
              {new Intl.DateTimeFormat('en-GB', { timeZone, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(message.created_at))}
            </time>
          </header>
          <p>{message.body}</p>
          {user.id && (message.author_id === user.id || user.role === 'architect') ?
            deleteId === message.id ? <div className={styles.deletePrompt}>
              <span>Delete this message?</span>
              <ArchiveButton variant="secondary" disabled={deleting} onClick={() => setDeleteId(null)}>KEEP</ArchiveButton>
              <ArchiveButton variant="secondary" disabled={deleting} onClick={remove}>{deleting ? 'DELETING…' : 'DELETE'}</ArchiveButton>
            </div> : <ArchiveButton variant="ghost" onClick={() => setDeleteId(message.id)}>DELETE</ArchiveButton>
          : null}
        </li>)}
      </ol> : null}
      <div className={styles.chatPagination}>
        {cursor ? <ArchiveButton variant="secondary" disabled={loading} onClick={() => changePage(null)}>BACK TO LATEST</ArchiveButton> : null}
        {nextCursor && !readError ? <ArchiveButton variant="secondary" disabled={loading} onClick={() => changePage(nextCursor)}>OLDER MESSAGES</ArchiveButton> : null}
      </div>
    </div>
  )
}
