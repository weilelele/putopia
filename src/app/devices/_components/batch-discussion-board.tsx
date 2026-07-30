'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Paperclip, Send } from 'lucide-react'
import { ArchiveButton } from '@/components/archive-button'
import { getBatchDiscussionPosts, type DiscussionPost } from '@/lib/batch-discussions'
import type { DeviceBatch } from '@/lib/device-batches'
import styles from '../device-batches.module.css'

export function BatchDiscussionBoard({
  batch,
  onPost,
}: {
  batch: DeviceBatch
  onPost?: () => void
}) {
  const [attachmentName, setAttachmentName] = useState('')
  const [message, setMessage] = useState('')
  const [posts, setPosts] = useState<DiscussionPost[]>(() => getBatchDiscussionPosts(batch))
  const [statusMessage, setStatusMessage] = useState('')

  function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage && !attachmentName) {
      setStatusMessage('Write a message or attach an image before posting.')
      return
    }

    setPosts((currentPosts) => [
      {
        author: 'You',
        body: trimmedMessage || 'Shared an image with this batch.',
        id: `local-${Date.now()}`,
        imageLabel: attachmentName || undefined,
        initials: 'YOU',
        replyCount: 0,
        role: 'MEMBER',
        timestamp: 'Just now',
      },
      ...currentPosts,
    ])
    setMessage('')
    setAttachmentName('')
    setStatusMessage('Your message is now visible on this batch record.')
    onPost?.()
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
          id={`batch-message-${batch.slug}`}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write a public message…"
          rows={3}
          value={message}
        />
        <div className={styles.composerActions}>
          <label className={styles.attachmentButton}>
            <Paperclip aria-hidden size={16} />
            <span>{attachmentName || 'ADD IMAGE'}</span>
            <input
              accept="image/*"
              onChange={(event) => setAttachmentName(event.target.files?.[0]?.name ?? '')}
              type="file"
            />
          </label>
          <ArchiveButton type="submit">
            POST MESSAGE <Send aria-hidden size={15} />
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
                <time>{post.timestamp}</time>
              </header>
              <p>{post.body}</p>
              {post.imageSources ? (
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
              {post.imageLabel ? (
                <div className={styles.discussionAttachment}>
                  <ImageIcon aria-hidden size={16} />
                  {post.imageLabel}
                </div>
              ) : null}
              <span className={styles.discussionReplyCount}>
                {post.replyCount} REPLIES
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
