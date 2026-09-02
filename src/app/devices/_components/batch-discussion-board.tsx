'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Paperclip, Send } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import {
  postDeviceBatchDiscussion,
  type DeviceBatchDiscussionPost,
} from '@/lib/actions/device-batch-community'
import type { DeviceBatch } from '@/lib/device-batches'
import styles from '../device-batches.module.css'

export function BatchDiscussionBoard({
  batch,
  canPost,
  initialPosts,
}: {
  batch: DeviceBatch
  canPost: boolean
  initialPosts: DeviceBatchDiscussionPost[]
}) {
  const [attachment, setAttachment] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [posts, setPosts] = useState<DeviceBatchDiscussionPost[]>(initialPosts)
  const [statusMessage, setStatusMessage] = useState('')
  const [posting, setPosting] = useState(false)

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canPost || posting) return
    const trimmedMessage = message.trim()
    if (!trimmedMessage && !attachment) {
      setStatusMessage('Write a message or attach an image before posting.')
      return
    }

    setPosting(true)
    setStatusMessage('')
    const imagePaths: string[] = []
    if (attachment) {
      const form = new FormData()
      form.set('file', attachment)
      const upload = await fetch(`/api/device-batches/${encodeURIComponent(batch.slug)}/upload-image`, {
        method: 'POST',
        body: form,
      })
      const result = await upload.json() as { error?: string; path?: string }
      if (!upload.ok || !result.path) {
        setPosting(false)
        setStatusMessage(result.error ?? 'Could not upload the image.')
        return
      }
      imagePaths.push(result.path)
    }

    const result = await postDeviceBatchDiscussion(batch.slug, trimmedMessage, imagePaths)
    setPosting(false)
    if (result.error || !result.post) {
      setStatusMessage(result.error ?? 'Could not post the message.')
      return
    }

    setPosts((currentPosts) => [result.post!, ...currentPosts])
    setMessage('')
    setAttachment(null)
    setStatusMessage('Your message is now visible on this batch record.')
  }

  return (
    <section className={styles.discussionBoard}>
      <div className={styles.discussionHeader}>
        <span>PUBLIC BATCH BOARD</span>
        <strong>{posts.length} MESSAGES</strong>
      </div>

      <form className={styles.discussionComposer} onSubmit={submitPost}>
        <label htmlFor={`batch-message-${batch.slug}`}>ADD TO THE RECORD</label>
        <textarea
          disabled={!canPost || posting}
          id={`batch-message-${batch.slug}`}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={canPost ? 'Write a public message…' : 'Payment-confirmed holders can post here.'}
          rows={3}
          value={message}
        />
        <div className={styles.composerActions}>
          <label className={styles.attachmentButton}>
            <Paperclip aria-hidden size={16} />
            <span>{attachment?.name || 'ADD IMAGE'}</span>
            <input
              accept="image/jpeg,image/png,image/webp"
              disabled={!canPost || posting}
              onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <ArchiveButton disabled={!canPost || posting} type="submit">
            {posting ? 'POSTING…' : 'POST MESSAGE'} <Send aria-hidden size={15} />
          </ArchiveButton>
        </div>
        <p aria-live="polite" className={styles.composerStatus}>
          {statusMessage}
        </p>
      </form>

      <div className={styles.discussionList}>
        {posts.map((post) => (
          <article className={styles.discussionPost} key={post.id}>
            <span className={styles.discussionAvatar}>{post.initials}</span>
            <div className={styles.discussionContent}>
              <header>
                <div>
                  <strong>{post.author}</strong>
                  <span>{post.role}</span>
                </div>
                <time>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(post.timestamp))}</time>
              </header>
              <p>{post.body}</p>
              {post.imageSources.length ? (
                <div className={styles.postMedia}>
                  {post.imageSources.map((src, index) => (
                    <div key={`${post.id}-${src}`} style={{ position: 'relative' }}>
                      <Image
                        alt={`${post.author} attachment ${index + 1}`}
                        fill
                        sizes="(max-width: 639px) 28vw, 11rem"
                        src={src}
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              {post.imageSources.length ? (
                <div className={styles.discussionAttachment}>
                  <ImageIcon aria-hidden size={16} />
                  {post.imageSources.length} IMAGE{post.imageSources.length === 1 ? '' : 'S'}
                </div>
              ) : null}
              <span className={styles.discussionReplyCount}>
                {post.replyCount} REPLIES
              </span>
            </div>
          </article>
        ))}
      </div>
      {posts.length === 0 ? (
        <div className={styles.emptyArchive}>No messages yet. Confirmed holders can start the record.</div>
      ) : null}
    </section>
  )
}
