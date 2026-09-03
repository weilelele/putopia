'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  CirclePlay,
  ListFilter,
  MessageSquare,
  Radio,
  X,
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

function cityLabel(batch: DeviceBatch) {
  return batch.location.split(',')[0]?.trim().toUpperCase() || batch.code
}

function batchProgress(batch: DeviceBatch) {
  const stages = batch.distributionStages
  const stageStatus = (index: number) => stages[index]?.status ?? 'upcoming'
  return [
    { label: 'PREPARING', status: batch.status === 'survey' ? 'current' : 'completed' },
    { label: 'PACK ONE', status: stageStatus(0) },
    { label: 'PACK TWO', status: stageStatus(Math.min(1, stages.length - 1)) },
    { label: 'CONSOLE', status: stageStatus(stages.length - 1) },
  ]
}

export function DeviceLiveRoom({
  batch,
  batches,
  canPost,
  discussionPosts,
  ownedConsole,
  camera,
}: {
  batch: DeviceBatch
  batches: DeviceBatch[]
  canPost: boolean
  discussionPosts: DeviceBatchDiscussionPost[]
  ownedConsole: DeviceConsoleRecord | null
  camera?: DeviceCameraSource | null
}) {
  const router = useRouter()
  const followedBatchSlugs = useFollowedBatchSlugs()
  const [activeTab, setActiveTab] = useState<ContentTab>('info')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState<BatchFilter>('all')
  const [openShipment, setOpenShipment] = useState<string | null>(null)
  const [progressOpen, setProgressOpen] = useState(false)
  const progress = batchProgress(batch)
  const remaining = getBatchRemainingQuantity(batch)
  const claimHref = getBatchClaimHref(batch)
  const currentStage = progress.find((stage) => stage.status === 'current')?.label ?? 'COMPLETE'
  const materialRecords = batch.heroMedia?.length
    ? batch.heroMedia
    : [{ alt: batch.imageAlt, caption: batch.heroCaption, kind: 'image' as const, src: batch.image }]
  const topBatches = useMemo(
    () => [batch, ...batches.filter((item) => item.slug !== batch.slug)].slice(0, 3),
    [batch, batches],
  )

  const filteredBatches = useMemo(() => {
    if (filter === 'all') return batches
    if (filter === 'following') return batches.filter((item) => followedBatchSlugs.includes(item.slug))
    const status: DeviceBatchStatus = filter === 'claim' ? 'claim_open' : filter === 'distributing' ? 'distribution' : filter
    return batches.filter((item) => item.status === status)
  }, [batches, filter, followedBatchSlugs])

  function chooseBatch(slug: string) {
    setSheetOpen(false)
    router.push(`/devices/batches/${slug}`)
  }

  return (
    <main className={`main ${styles.page}`}>
      <header className={styles.roomHeader}>
        <h1>DEVICE</h1>
        <Link className={styles.archiveLink} href="/devices">
          LIBRARY <ChevronRight aria-hidden size={16} />
        </Link>
      </header>

      <nav className={styles.objectNav} aria-label="Device batches">
        <div className={styles.objectTabs} role="tablist">
          {topBatches.map((item) => (
            <Link
              aria-selected={batch.slug === item.slug}
              className={styles.objectTab}
              href={`/devices/batches/${item.slug}`}
              key={item.slug}
              role="tab"
            >
              {cityLabel(item)}
            </Link>
          ))}
        </div>
        <button aria-label="Open all device batches" className={styles.listButton} onClick={() => setSheetOpen(true)} type="button">
          <ListFilter aria-hidden size={20} />
        </button>
      </nav>

      {camera ? <CosmoCameraEmbed source={camera}>
        <span>{batch.name.toUpperCase()}</span>
        <span>{DEVICE_BATCH_STATUS[batch.status].label}</span>
      </CosmoCameraEmbed> : <LiveFeedPlaceholder label={`${batch.name} live feed — not connected`}>
        <span>{batch.name.toUpperCase()}</span>
        <span className={styles.liveMetaItem}><span className={styles.dot} style={{ background: statusDotColor(batch.status) }} />{DEVICE_BATCH_STATUS[batch.status].label}</span>
      </LiveFeedPlaceholder>}

      {(batch.status === 'claim_open' && batch.claimPrice) || ownedConsole ? <section className={`${styles.sectionPanel} ${styles.compactClaimPanel}`} aria-labelledby="claim-heading">
        <div className={styles.paymentHeader}>
          <div>
            <div className={styles.eyebrow}>CLAIM DISPATCH</div>
            <h2 id="claim-heading">{batch.inventory?.listingQuantity ?? batch.holders.length} CONSOLES</h2>
          </div>
          {batch.claimPrice ? <div className={styles.paymentPrice}>{formatBatchPrice(batch.claimPrice)} / CLAIM</div> : null}
        </div>
        <div className={styles.claimCounts}>
          <div><span>TOTAL</span><strong>{batch.inventory?.listingQuantity ?? batch.holders.length}</strong></div>
          <div><span>REMAINING</span><strong>{remaining ?? 0}</strong></div>
        </div>
        <div className={styles.shipments}>
          {batch.distributionStages.map((shipment, index) => (
            <div className={styles.shipmentGroup} key={shipment.id}>
              <button aria-expanded={openShipment === shipment.id} className={styles.shipment} onClick={() => setOpenShipment((current) => current === shipment.id ? null : shipment.id)} type="button">
                <span className={styles.shipmentIndex}>{String(index + 1).padStart(2, '0')}</span>
                <strong>{shipment.label}</strong>
                <span className={`${styles.stageState} ${shipment.status === 'current' ? styles.stageCurrent : shipment.status === 'completed' ? styles.stageCompleted : ''}`}>{shipment.status.toUpperCase()}</span>
                <ChevronDown aria-hidden className={styles.shipmentChevron} size={18} />
              </button>
              {openShipment === shipment.id ? <p className={styles.shipmentDetail}>{shipment.summary}</p> : null}
            </div>
          ))}
        </div>
        <div className={styles.claimRow}>
          {ownedConsole ? (
            <button className={`${styles.primaryButton} ${styles.claimButton}`} onClick={() => setProgressOpen(true)} type="button"><span>CHECK MY PROGRESS</span><strong>{ownedConsole.unitCode}</strong></button>
          ) : claimHref && remaining !== 0 ? (
            <Link className={`${styles.primaryButton} ${styles.claimButton}`} href={claimHref}><span>CLAIM A CONSOLE</span><strong>{remaining} REMAIN</strong></Link>
          ) : (
            <button className={`${styles.primaryButton} ${styles.claimButton}`} disabled type="button"><span>CLAIMS CLOSED</span><strong>{remaining ?? 0} REMAIN</strong></button>
          )}
        </div>
      </section> : null}

      <section className={styles.sectionPanel}>
        <div className={styles.contentTabs} role="tablist" aria-label="Device room content">
          {([
            ['info', 'INFO'],
            ['updates', 'UPDATES'],
            ['discussion', 'DISCUSSION'],
          ] as const).map(([id, label]) => (
            <button
              aria-selected={activeTab === id}
              className={styles.contentTab}
              key={id}
              onClick={() => setActiveTab(id)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'info' ? (
          <div className={styles.panelBody} role="tabpanel">
            <div className={styles.eyebrow}>{batch.code} · BATCH DOSSIER</div>
            <h2 className={styles.infoTitle}>{batch.name}</h2>
            <p className={styles.intro}>{batch.summary}</p>
            <div className={styles.infoActions}>
              <FollowBatchButton batchName={batch.name} compact prominence="secondary" slug={batch.slug} />
            </div>

            <div className={styles.progressBlock}>
              <div className={styles.progressLabel}><span>CURRENT BATCH PROGRESS</span><span>{currentStage}</span></div>
              <div className={styles.progressGrid}>
                {progress.map((step) => (
                  <div className={styles.progressStep} data-status={step.status} key={step.label}>
                    <span className={styles.progressBar} />
                    <strong>{step.label}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.facts}>
              <div className={styles.fact}><span>LOCATION</span><strong>{batch.location}</strong></div>
              <div className={styles.fact}><span>CONFIRMED UNITS</span><strong>{(batch.inventory?.listingQuantity ?? batch.holders.length) || 'PENDING'}</strong></div>
              <div className={styles.fact}><span>FIELD LEAD</span><strong>{batch.lead.name}</strong></div>
              <div className={styles.fact}><span>NEXT MILESTONE</span><strong>{batch.nextMilestone}</strong></div>
            </div>

            <div className={styles.mediaSection}>
              <div className={styles.mediaSectionHeader}><h3>MATERIAL RECORDS</h3><span>{materialRecords.length} ITEM{materialRecords.length === 1 ? '' : 'S'}</span></div>
              <div className={styles.mediaList}>
                {materialRecords.map((item) => (
                  <button className={styles.mediaRow} key={`${item.src}-${item.caption}`} type="button">
                    <span className={styles.mediaThumb}>
                      <Image alt="" fill sizes="100px" src={item.poster ?? item.src} />
                      {item.kind === 'video' ? <span className={styles.videoBadge}><CirclePlay aria-hidden size={16} /></span> : null}
                    </span>
                    <span className={styles.mediaCopy}>
                      <strong>{item.caption}</strong>
                    </span>
                    <ChevronRight aria-hidden size={18} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'discussion' ? (
          <div className={styles.panelBody} role="tabpanel">
            <div className={styles.eyebrow}><MessageSquare aria-hidden size={14} /> BATCH DISCUSSION</div>
            <BatchDiscussionBoard batch={batch} canPost={canPost} initialPosts={discussionPosts} />
          </div>
        ) : null}

        {activeTab === 'updates' ? (
          <div className={styles.panelBody} role="tabpanel">
            <div className={styles.eyebrow}><Radio aria-hidden size={14} /> VERIFIED FIELD EVENTS</div>
            <div className={styles.updateList}>
              <div className={styles.updateRow}>
                <span className={styles.updateTime}>{batch.latestUpdate.date}</span>
                <span><strong>{batch.latestUpdate.title}</strong><p>{batch.latestUpdate.body}</p></span>
              </div>
              {batch.archiveStages.toReversed().map((update) => (
                <div className={styles.updateRow} key={update.id}>
                  <span className={styles.updateTime}>{update.period}</span>
                  <span><strong>{update.label}</strong><p>{update.summary}</p></span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {sheetOpen ? (
        <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSheetOpen(false) }}>
          <section aria-label="All device batches" aria-modal="true" className={styles.sheet} role="dialog">
            <header className={styles.sheetHeader}>
              <h2>ALL DEVICE BATCHES</h2>
              <button aria-label="Close batch list" className={styles.iconButton} onClick={() => setSheetOpen(false)} type="button"><X aria-hidden size={22} /></button>
            </header>
            <div className={styles.filterRow}>
              {(['all', 'following', 'survey', 'claim', 'distributing', 'active'] as BatchFilter[]).map((item) => (
                <button aria-pressed={filter === item} className={styles.filterButton} key={item} onClick={() => setFilter(item)} type="button">{item.toUpperCase()}</button>
              ))}
            </div>
            <div className={styles.sheetList}>
              {filteredBatches.map((item) => (
                <button className={styles.sheetRow} key={item.code} onClick={() => chooseBatch(item.slug)} type="button">
                  <span className={styles.dot} style={{ background: statusDotColor(item.status) }} />
                  <span><strong>{item.name.toUpperCase()}</strong><small>{item.location}</small></span>
                  <span className={styles.sheetStatus}>{item.slug === batch.slug ? 'CURRENT · ' : ''}{DEVICE_BATCH_STATUS[item.status].shortLabel}</span>
                  <ChevronRight aria-hidden size={18} />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {progressOpen && ownedConsole ? (
        <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProgressOpen(false) }}>
          <section aria-label="My Console progress" aria-modal="true" className={styles.sheet} role="dialog">
            <header className={styles.sheetHeader}>
              <div><div className={styles.eyebrow}>MY ASSIGNED UNIT</div><h2>{ownedConsole.unitCode}</h2></div>
              <button aria-label="Close my progress" className={styles.iconButton} onClick={() => setProgressOpen(false)} type="button"><X aria-hidden size={22} /></button>
            </header>
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
          </section>
        </div>
      ) : null}
    </main>
  )
}
