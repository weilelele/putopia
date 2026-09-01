import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { BatchDiscussionBoard } from '../../../_components/batch-discussion-board'
import { getPublicDeviceBatch } from '@/lib/device-batch-repository'
import { getDeviceBatchDiscussion } from '@/lib/actions/device-batch-community'
import styles from '../../../device-batches.module.css'

export const dynamic = 'force-dynamic'

type DiscussionPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: DiscussionPageProps): Promise<Metadata> {
  const { slug } = await params
  const batch = await getPublicDeviceBatch(slug)
  return {
    title: batch ? `Discussion · ${batch.name}` : 'Discussion not found',
  }
}

export default async function DiscussionPage({ params }: DiscussionPageProps) {
  const { slug } = await params
  const batch = await getPublicDeviceBatch(slug)
  if (!batch) notFound()
  const discussion = await getDeviceBatchDiscussion(slug)

  return (
    <main className={`main pilot-archive-page archive-detail-page ${styles.detailPage}`}>
      <ArchiveBrandHeader />
      <div className={styles.discussionPageShell}>
        <ArchiveLinkButton href={`/devices/batches/${batch.slug}`} variant="ghost">
          ← {batch.code}
        </ArchiveLinkButton>
        <header className={styles.discussionPageHeader}>
          <span>PUBLIC BATCH BOARD</span>
          <h1>Discussion</h1>
          <p>{batch.name}</p>
        </header>
        <BatchDiscussionBoard
          batch={batch}
          canPost={discussion.canPost}
          initialPosts={discussion.posts}
        />
      </div>
    </main>
  )
}
