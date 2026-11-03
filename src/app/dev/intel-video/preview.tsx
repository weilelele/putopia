'use client'
import { useState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { IntelVideo } from '@/components/intel-video'
import { NewsMedia, PublisherIdentity } from '@/components/news-content'
import { CreateIntelModal } from '@/app/intel/CreateIntelModal'

const VIDEO = '/assets/device-reel-v2-20261016.mp4'
const POSTER = '/assets/device-reel-v2-20261016-poster.jpg'

/** Local-only fixture for the Intel video states; rendering it reads and writes no data. */
export function IntelVideoPreview() {
  const [publishing, setPublishing] = useState(false)
  return (
    <div className="main pilot-archive-page archive-collection-page archive-intel-page">
      <div className="intel-editorial-feed">
        <article className="intel-lead">
          <span className="intel-entry-meta">ORG · <time>November 3, 2026</time></span>
          <h2>Lead post with a video</h2>
          <PublisherIdentity name="Multiverse Collective" />
          <p className="intel-summary">The video plays in place with native controls.</p>
          <IntelVideo src={VIDEO} poster={POSTER} title="Lead post with a video" />
        </article>
        <article className="intel-recent-story intel-recent-story--media">
          <div className="intel-recent-row"><div><span className="intel-entry-meta">ORG</span><h3>Recent post shown by its video cover</h3></div></div>
          <PublisherIdentity name="Multiverse Collective" />
          <span className="intel-story-media"><NewsMedia images={[POSTER]} title="Recent post" /></span>
        </article>
        <ArchiveCard className="archive-detail-card archive-intel-dispatch"><h1>Detail view</h1></ArchiveCard>
        <div style={{ marginBottom: '2rem' }}>
          <ArchiveSectionLabel>VIDEO</ArchiveSectionLabel>
          <IntelVideo src={VIDEO} poster={POSTER} title="Detail view" />
        </div>
        <ArchiveButton variant="secondary" onClick={() => setPublishing(true)}>Open publish dialog</ArchiveButton>
      </div>
      {publishing && <CreateIntelModal existingItems={[]} onClose={() => setPublishing(false)} onCreated={() => setPublishing(false)} />}
    </div>
  )
}
