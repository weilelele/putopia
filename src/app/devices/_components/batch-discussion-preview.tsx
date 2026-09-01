import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import type { DeviceBatchDiscussionPost } from '@/lib/actions/device-batch-community'
import type { DeviceBatch } from '@/lib/device-batches'
import styles from '../device-batches.module.css'

export function BatchDiscussionPreview({
  batch,
  posts,
}: {
  batch: DeviceBatch
  posts: DeviceBatchDiscussionPost[]
}) {
  const previewPosts = posts.slice(0, 3)

  return (
    <section className={styles.discussionPreview}>
      <div className={styles.discussionPreviewHeader}>
        <ArchiveSectionLabel>DISCUSSION</ArchiveSectionLabel>
        <Link href={`/devices/batches/${batch.slug}/discussion`}>
          SEE ALL DISCUSSION <ArrowRight aria-hidden size={14} />
        </Link>
      </div>
      <div className={styles.discussionPreviewRail}>
        {previewPosts.map((post) => (
          <article
            className={styles.discussionPreviewPost}
            key={post.id}
          >
            <div className={styles.discussionPreviewIdentity}>
              <span className={styles.discussionAvatar}>{post.initials}</span>
              <span>
                <strong>{post.author}</strong>
                <small>{post.role}</small>
              </span>
              <time>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(post.timestamp))}</time>
            </div>
            <div
              className={
                post.imageSources?.[0]
                  ? `${styles.discussionPreviewBody} ${styles.discussionPreviewBodyWithMedia}`
                  : styles.discussionPreviewBody
              }
            >
              <p>{post.body}</p>
              {post.imageSources?.[0] ? (
                <div className={styles.discussionPreviewMedia}>
                  <Image
                    alt={`${post.author} discussion attachment`}
                    fill
                    sizes="(max-width: 639px) 100vw, 10rem"
                    src={post.imageSources[0]}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ) : null}
            </div>
            <span className={styles.discussionReplyCount}>
              <MessageCircle aria-hidden size={14} />
              {post.replyCount}
            </span>
          </article>
        ))}
      </div>
      {previewPosts.length === 0 ? (
        <div className={styles.emptyArchive}>No holder messages have been added yet.</div>
      ) : null}
    </section>
  )
}
