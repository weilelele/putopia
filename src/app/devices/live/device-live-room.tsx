'use client'
import { ConsolePackages } from './console-packages'
import { RootBrandHeader } from '@/components/root-brand-header'
import { ArchiveTabs } from '@/components/archive-tabs'
import { ArchiveButton } from '@/components/archive-button'
import { useSessionPreference } from '@/lib/use-session-preference'

import { ArchiveSheet } from '@/components/archive-sheet'
import { BackLink } from '@/components/back-link'
import { usePathname } from 'next/navigation'
import { DeviceGallery, UpdateMedia, DeviceMediaImage as Image } from '../_components/device-gallery'
import { DeviceFieldLead } from '../_components/device-field-lead'
import mediaStyles from '../_components/device-gallery.module.css'
import { getDeviceBatchMedia, getDeviceBatchUpdates, getDeviceBatchProgress } from '@/lib/device-batch-content'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ChevronRight,
  CirclePlay,
  ListFilter,
  MessageSquare,
  Radio,
} from 'lucide-react'
import styles from '../../live-observation-room.module.css'
import { BatchDiscussionBoard } from '../_components/batch-discussion-board'
import { FollowBatchButton } from '../_components/batch-actions'
import { useFollowedBatchSlugs } from '../_components/use-followed-batches'
import { LiveFeedPlaceholder } from '@/components/live-feed-placeholder'
import { CosmoCameraEmbed } from '@/components/cosmo-camera-embed'
import type { DeviceCameraSource } from '@/lib/device-camera'
import {
  DEVICE_BATCH_STATUS,
  formatBatchPrice,
  getBatchClaimHref,
  getBatchRemainingQuantity,
  type DeviceBatch,
  type DeviceBatchStatus,
} from '@/lib/device-batches'
import type { DeviceBatchDiscussionPost } from '@/lib/actions/device-batch-community'
import type { DeviceConsoleRecord } from '@/lib/actions/orders'

type ContentTab = 'info' | 'updates' | 'discussion'
type BatchFilter = 'all' | 'following' | 'survey' | 'claim' | 'distributing' | 'active'

function statusDotColor(status: DeviceBatchStatus) {
  if (status === 'claim_open') return 'var(--color-fault)'
  if (status === 'survey') return 'var(--color-warn)'
  return 'var(--color-ok)'
}

export function DeviceLiveRoom({
  batch,
  batches,
  canPost,
  discussionPosts,
  ownedConsole,
  camera,
  onSelectBatch,
}: {
  onSelectBatch: (slug: string) => void
  batch: DeviceBatch
  batches: DeviceBatch[]
  canPost: boolean
  discussionPosts: DeviceBatchDiscussionPost[]
  ownedConsole: DeviceConsoleRecord | null
  camera?: DeviceCameraSource | null
}) {
  const pathname = usePathname()
  const [isRoot] = useState(pathname === '/devices')
  const followedBatchSlugs = useFollowedBatchSlugs()
  const [activeTab, setActiveTab] = useSessionPreference<ContentTab>(`mc:view:devices:${batch.slug}:tab`, 'info')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useSessionPreference<BatchFilter>('mc:view:devices:filter', 'all')
  const [progressOpen, setProgressOpen] = useState(false)
  const formattedPrice = batch.claimPrice ? formatBatchPrice(batch.claimPrice) : ''
  const priceAmount = formattedPrice.slice(0, formattedPrice.lastIndexOf(' '))
  const progress = getDeviceBatchProgress(batch)
  const remaining = getBatchRemainingQuantity(batch)
  const claimHref = getBatchClaimHref(batch)
  const currentStage = progress.find((stage) => stage.status === 'current')?.label ?? (progress.every((stage) => stage.status === 'completed') ? 'COMPLETE' : 'AWAITING NEXT STAGE')
  const materialRecords = getDeviceBatchMedia(batch)
  const updates = getDeviceBatchUpdates(batch)
  const [gallerySelection, setGallerySelection] = useState({ slug: batch.slug, index: 0 })
  const selectedMedia = gallerySelection.slug === batch.slug ? gallerySelection.index : 0
  const selectMedia = (index: number) => setGallerySelection({ slug: batch.slug, index })

  const filteredBatches = useMemo(() => {
    if (filter === 'all') return batches
    if (filter === 'following') return batches.filter((item) => followedBatchSlugs.includes(item.slug))
    const status: DeviceBatchStatus = filter === 'claim' ? 'claim_open' : filter === 'distributing' ? 'distribution' : filter
    return batches.filter((item) => item.status === status)
  }, [batches, filter, followedBatchSlugs])

  function chooseBatch(slug: string) {
    setSheetOpen(false)
    setProgressOpen(false)
    onSelectBatch(slug)
  }

  return (
    <main className={`main ${styles.page}`} data-route-scroll>{!isRoot && <BackLink href="/devices" label="Devices" />}
      {isRoot ? <><h1 className="sr-only">Devices</h1><RootBrandHeader><ArchiveButton variant="ghost" className={styles.archiveLink} onClick={() => setSheetOpen(true)}>ARCHIVE <ChevronRight aria-hidden size={16} /></ArchiveButton></RootBrandHeader></> : (<header className={`${styles.roomHeader}${isRoot ? ` ${styles.rootActions}` : ''}`}>
        <h1 className={isRoot ? 'sr-only' : undefined}>DEVICES</h1>
        <ArchiveButton variant="ghost" className={styles.archiveLink} onClick={() => setSheetOpen(true)}>ARCHIVE <ChevronRight aria-hidden size={16} /></ArchiveButton>
      </header>)}

      <nav className={styles.objectNav} aria-label="Device batches">
        <div className={styles.objectTabs} role="tablist">
          {batches.map((item, index) => (
            <button
              role="tab"
              aria-selected={batch.slug === item.slug}
              className={styles.objectTab}
              type="button"
              tabIndex={batch.slug === item.slug ? 0 : -1}
              onClick={() => chooseBatch(item.slug)}
              onKeyDown={(event) => {
                const nextIndex = event.key === 'ArrowRight' ? (index + 1) % batches.length
                  : event.key === 'ArrowLeft' ? (index - 1 + batches.length) % batches.length
                    : event.key === 'Home' ? 0 : event.key === 'End' ? batches.length - 1 : null
                if (nextIndex === null) return
                event.preventDefault()
                chooseBatch(batches[nextIndex].slug)
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
              }}
              key={item.slug}
            >
              {item.name}
            </button>
          ))}
        </div>
        <ArchiveButton variant="ghost" aria-label="Open all device batches" className={styles.listButton} onClick={() => setSheetOpen(true)} type="button">
          <ListFilter aria-hidden size={20} />
        </ArchiveButton>
      </nav>

      <div className={styles.workspace}><div className={styles.workspaceMedia}>
      <DeviceGallery primaryLabel={camera ? 'LIVE' : 'COVER'} media={materialRecords} selected={selectedMedia} onSelect={selectMedia} primary={
        camera ? <CosmoCameraEmbed source={camera} location={batch.location} />
          : batch.image ? <div className={mediaStyles.frame}><Image src={batch.image} alt={batch.imageAlt} fill sizes="(max-width: 767px) 100vw, 1000px" unoptimized /></div>
            : <LiveFeedPlaceholder label={`${batch.name} live feed — not connected`}><span>{batch.name}</span></LiveFeedPlaceholder>
      } />

      </div><div className={styles.workspaceDetails}>
      {(batch.status === 'claim_open' && batch.claimPrice) || ownedConsole ? <section className={`${styles.sectionPanel} ${styles.compactClaimPanel}`} aria-labelledby="claim-heading">
        <div className={styles.paymentHeader}>
          <h2 id="claim-heading">CONSOLE CLAIM</h2>
          {batch.claimPrice ? <div className={styles.paymentPrice}><strong>{priceAmount}</strong><span>{batch.claimPrice.currency.toUpperCase()} / CONSOLE</span></div> : null}
        </div>
        <div className={styles.claimCounts}>
          <div><span>BATCH TOTAL</span><strong>{batch.inventory?.listingQuantity ?? batch.holders.length}</strong></div>
          <div><span>REMAINING</span><strong>{remaining ?? 0}</strong></div>
        </div>
        <div className={styles.claimRow}>
          {ownedConsole ? (
            <ArchiveButton variant="primary" className={`${styles.primaryButton} ${styles.claimButton}`} onClick={() => setProgressOpen(true)} type="button"><span>CHECK MY PROGRESS</span><strong>{ownedConsole.unitCode}</strong></ArchiveButton>
          ) : claimHref && remaining !== 0 ? (
            <Link className={`${styles.primaryButton} ${styles.claimButton}`} href={claimHref}><span>CLAIM A CONSOLE</span></Link>
          ) : (
            <ArchiveButton variant="primary" className={`${styles.primaryButton} ${styles.claimButton}`} disabled type="button"><span>CLAIMS CLOSED</span></ArchiveButton>
          )}
        </div>
        <ConsolePackages batch={batch} />
      </section> : null}

      <section className={styles.sectionPanel}>
        <ArchiveTabs ariaLabel="Device room content" activeId={activeTab}
          items={[{id:'info',label:'INFO'},{id:'updates',label:'UPDATES'},{id:'discussion',label:'DISCUSSION'}].map(item=>({...item,panelId:`device-room-${item.id}`}))}
          onChange={id => setActiveTab(id as typeof activeTab)} />

        {activeTab === 'info' ? (
          <div className={styles.panelBody} role="tabpanel" id={`device-room-${activeTab}`} aria-labelledby={`device-room-${activeTab}-tab`}>
            <div className={styles.eyebrow}>{batch.code} · BATCH DOSSIER</div>
            <h2 className={styles.infoTitle}>{batch.name}</h2>
            <p className={styles.intro}>{batch.summary}</p>
            <div className={styles.infoActions}>
              <FollowBatchButton batchName={batch.name} compact prominence="secondary" slug={batch.slug} />
            </div>

            <div className={styles.progressBlock}>
              <div className={styles.progressLabel}><span>CURRENT BATCH PROGRESS</span><span>{currentStage}</span></div>
              <div className={mediaStyles.progress}>
                {progress.map((step) => (
                  <div className={styles.progressStep} data-status={step.status} key={step.label}>
                    <span className={styles.progressBar} />
                    <strong aria-label={step.fullLabel} title={step.fullLabel}>{step.label}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.facts}>
              <div className={styles.fact}><span>LOCATION</span><strong>{batch.location}</strong></div>
              <div className={styles.fact}><span>CONFIRMED UNITS</span><strong>{(batch.inventory?.listingQuantity ?? batch.holders.length) || 'PENDING'}</strong></div>
              <div className={styles.fact}><span>FIELD LEAD</span><DeviceFieldLead key={batch.slug} lead={batch.lead} /></div>
              <div className={styles.fact}><span>NEXT MILESTONE</span><strong>{batch.nextMilestone}</strong></div>
            </div>

            <div className={styles.mediaSection}>
              <div className={styles.mediaSectionHeader}><h3>MATERIAL RECORDS</h3><span>{materialRecords.length} ITEM{materialRecords.length === 1 ? '' : 'S'}</span></div>
              <div className={styles.mediaList}>
                {materialRecords.map((item, index) => (
                  <button className={styles.mediaRow} key={`${item.src}-${item.caption}`} type="button" onClick={() => { selectMedia(index + 1); document.getElementById('device-gallery')?.scrollIntoView({ behavior: 'auto', block: 'start' }) }}>
                    <span className={styles.mediaThumb}>
                      {item.kind === 'image' || item.poster ? <Image alt="" fill sizes="100px" src={item.poster ?? item.src} unoptimized /> : null}
                      {item.kind === 'video' ? <span className={styles.videoBadge}><CirclePlay aria-hidden size={16} /></span> : null}
                    </span>
                    <span className={styles.mediaCopy}>
                      <strong>{item.caption || item.alt}</strong>
                    </span>
                    <ChevronRight aria-hidden size={18} />
                  </button>
                ))}
              </div>
            </div>

            {batch.faq?.length ? (
              <section className={styles.progressBlock} aria-label="Batch FAQ">
                <div className={styles.eyebrow}>BEFORE YOU CLAIM</div>
                {batch.faq.map((item) => (
                  <details key={item.question} className="mt-4 text-sm">
                    <summary>{item.question}</summary>
                    <p className="mt-2 leading-relaxed">{item.answer}</p>
                  </details>
                ))}
              </section>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'discussion' ? (
          <div className={styles.panelBody} role="tabpanel" id={`device-room-${activeTab}`} aria-labelledby={`device-room-${activeTab}-tab`}>
            <div className={styles.eyebrow}><MessageSquare aria-hidden size={14} /> BATCH DISCUSSION</div>
            <BatchDiscussionBoard key={batch.slug} batch={batch} canPost={canPost} initialPosts={discussionPosts} />
          </div>
        ) : null}

        {activeTab === 'updates' ? (
          <div className={styles.panelBody} role="tabpanel" id={`device-room-${activeTab}`} aria-labelledby={`device-room-${activeTab}-tab`}>
            <div className={styles.eyebrow}><Radio aria-hidden size={14} /> VERIFIED FIELD EVENTS</div>
            <div className={styles.updateList}>
              {updates.length === 0 ? <p>No updates published yet.</p> : null}
              {updates.map((update) => (
                <article className={styles.updateRow} key={update.id}>
                  <span className={styles.updateTime}>{update.date}</span>
                  <div><strong>{update.title}</strong><p className={mediaStyles.updateBody}>{update.body}</p>
                    <UpdateMedia media={update.media ?? []} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      </div></div>
      {sheetOpen ? (
        <ArchiveSheet open onClose={() => setSheetOpen(false)} title="All device batches" dirty={false} busy={false}>

            <div className={styles.filterRow}>
              {(['all', 'following', 'survey', 'claim', 'distributing', 'active'] as BatchFilter[]).map((item) => (
                <ArchiveButton variant="secondary" aria-pressed={filter === item} className={styles.filterButton} key={item} onClick={() => setFilter(item)} type="button">{item.toUpperCase()}</ArchiveButton>
              ))}
            </div>
            <div className={styles.sheetList}>
              {filteredBatches.map((item) => (
                <ArchiveButton variant="secondary" className={styles.sheetRow} key={item.code} onClick={() => chooseBatch(item.slug)} type="button">
                  <span className={styles.dot} style={{ background: statusDotColor(item.status) }} />
                  <span><strong>{item.name.toUpperCase()}</strong><small>{item.location}</small></span>
                  <span className={styles.sheetStatus}>{item.slug === batch.slug ? 'CURRENT · ' : ''}{DEVICE_BATCH_STATUS[item.status].shortLabel}</span>
                  <ChevronRight aria-hidden size={18} />
                </ArchiveButton>
              ))}
            </div>
          </ArchiveSheet>
      ) : null}

      {progressOpen && ownedConsole ? (
        <ArchiveSheet open onClose={() => setProgressOpen(false)} title="My Console progress" dirty={false} busy={false}>

            <div className={styles.dialogBody}>
              <div className={styles.facts}>
                <div className={styles.fact}><span>UNIT STATUS</span><strong>{ownedConsole.unitStatus.toUpperCase()}</strong></div>
                <div className={styles.fact}><span>ORDER STATUS</span><strong>{ownedConsole.order.status.toUpperCase()}</strong></div>
              </div>
              <div className={styles.shipments}>
                {ownedConsole.packs.map((pack, index) => (
                  <div className={styles.shipment} key={pack.stage_id}>
                    <span className={styles.shipmentIndex}>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{pack.label}</strong>
                    <span className={styles.stageState}>{pack.status.toUpperCase()}</span>
                    <span />
                  </div>
                ))}
              </div>
              <Link className={styles.primaryButton} href="/devices/my-consoles">OPEN FULL UNIT RECORD</Link>
            </div>
          </ArchiveSheet>
      ) : null}
    </main>
  )
}
