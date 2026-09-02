'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  Archive,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  MapPin,
  Radio,
} from 'lucide-react'
import { ArchiveBrandHeader } from '@/components/archive-brand-header'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveSectionLabel } from '@/components/archive-section-label'
import { ArchiveTabs } from '@/components/archive-tabs'
import {
  DEVICE_BATCH_STATUS,
  formatBatchPrice,
  getBatchAvailability,
  getBatchClaimHref,
  type BatchArchiveStage,
  type DeviceBatch,
  type DeviceBatchStatus,
  type DistributionStage,
} from '@/lib/device-batches'
import { ArchiveModal, FollowBatchButton } from './batch-actions'
import { BatchDiscussionPreview } from './batch-discussion-preview'
import { BatchHeroMedia } from './batch-hero-media'
import { BatchParticipation } from './batch-participation'
import type {
  DeviceBatchDecision,
  DeviceBatchDiscussionPost,
} from '@/lib/actions/device-batch-community'
import {
  BatchMediaGallery,
  type BatchMediaItem,
} from './batch-media-gallery'
import styles from '../device-batches.module.css'

type ModalState =
  | { type: 'dossier' }
  | { type: 'lead' }
  | { type: 'archive'; stage: BatchArchiveStage }
  | { type: 'distribution'; stage: DistributionStage }
  | null

const STATUS_CLASS: Record<DeviceBatchStatus, string> = {
  survey: styles.statusSurvey,
  claim_open: styles.statusClaim,
  distribution: styles.statusDistribution,
  active: styles.statusActive,
}

const STAGE_LABELS = {
  completed: 'COMPLETED',
  current: 'CURRENT',
  upcoming: 'UPCOMING',
}

type DetailTab = 'status' | 'distribution' | 'holders'

function getAlternateImages(batch: DeviceBatch) {
  return [
    '/assets/device.png',
    '/assets/device-desk.png',
    '/assets/device-console.jpg',
  ].filter((src) => src !== batch.image)
}

function getHeroMedia(batch: DeviceBatch): BatchMediaItem[] {
  if (batch.heroMedia?.length) return batch.heroMedia
  const alternateImages = getAlternateImages(batch)

  return [
    {
      alt: batch.imageAlt,
      caption: batch.heroCaption,
      kind: 'image',
      src: batch.image,
    },
    {
      alt: 'Console receiver photographed from the field workbench',
      caption: 'Field workbench · alternate frame',
      kind: 'image',
      src: alternateImages[0],
    },
    {
      alt: 'Short field reel of the Console during testing',
      caption: 'Power test reel · video',
      kind: 'video',
      poster: '/assets/device.png',
      src: '/assets/device-reel.mp4',
    },
  ]
}

function getFieldUpdateMedia(batch: DeviceBatch): BatchMediaItem[] {
  if (batch.latestUpdate.media?.length) return batch.latestUpdate.media
  const alternateImages = getAlternateImages(batch)

  return [
    {
      alt: 'Console receiver photographed during the latest inspection',
      caption: 'Latest inspection frame',
      kind: 'image',
      src: alternateImages[0],
    },
    {
      alt: 'Console components arranged on the field workbench',
      caption: 'Sorting bench · field station',
      kind: 'image',
      src: alternateImages[1],
    },
    {
      alt: 'Short field reel of the Console during testing',
      caption: 'Power test reel · video',
      kind: 'video',
      poster: '/assets/device.png',
      src: '/assets/device-reel.mp4',
    },
  ]
}

function getDistributionMedia(
  batch: DeviceBatch,
  stage: DistributionStage,
  index: number,
): BatchMediaItem[] {
  if (stage.media?.length) return stage.media
  const imageSources = ['/assets/device-desk.png', '/assets/device.png', batch.image]
  const imageItem: BatchMediaItem = {
    alt: `${stage.label} preparation`,
    caption: `${stage.label} · preparation view`,
    kind: 'image',
    src: imageSources[index % imageSources.length],
  }

  if (index === batch.distributionStages.length - 1) {
    return [
      imageItem,
      {
        alt: `${stage.label} test reel`,
        caption: `${stage.label} · test reel`,
        kind: 'video',
        poster: '/assets/device.png',
        src: '/assets/device-reel.mp4',
      },
    ]
  }

  return [imageItem]
}

export function BatchDetailClient({
  batch,
  decision,
  discussionPosts,
}: {
  batch: DeviceBatch
  decision: DeviceBatchDecision | null
  discussionPosts: DeviceBatchDiscussionPost[]
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>('status')
  const [modal, setModal] = useState<ModalState>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const currentStageIndex = batch.distributionStages.findIndex((stage) => stage.status === 'current')
  const compactFacts = batch.facts.slice(0, 3)
  const visibleHolders = batch.holders.slice(0, 8)
  const nextDistributionStage = batch.distributionStages.find(
    (stage) => stage.status !== 'completed',
  )
  const statusQuantityMatch = batch.statusLine.match(/^(\d+)\s+(.+)$/)
  const securedQuantity = batch.inventory
    ? `${batch.inventory.claimedQuantity} / ${batch.inventory.listingQuantity}`
    : getBatchAvailability(batch)
  const claimHref = getBatchClaimHref(batch)
  const tabItems = [
    { id: 'status', label: 'STATUS' },
    { id: 'distribution', label: 'DISTRIBUTION', count: batch.distributionStages.length },
    { id: 'holders', label: 'HOLDERS', count: batch.holders.length },
  ]

  function changeTab(id: string) {
    setActiveTab(id as DetailTab)
    window.requestAnimationFrame(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <main className={`main pilot-archive-page archive-detail-page ${styles.detailPage}`}>
      <ArchiveBrandHeader />

      <div className="top-bar">
        <div className="crumbs">
          DEVICE ARCHIVE <span>/</span> BATCH RECORD
        </div>
        <div className="right">
          <div className="item">
            STATUS <span className="val">{DEVICE_BATCH_STATUS[batch.status].shortLabel}</span>
          </div>
        </div>
      </div>

      <div className={styles.detailShell}>
        <ArchiveLinkButton href="/devices" variant="ghost">
          ← DEVICE ARCHIVE
        </ArchiveLinkButton>

        <header className={styles.detailHero}>
          <BatchHeroMedia items={getHeroMedia(batch)} />

          <div className={styles.detailHeroContent}>
            <div className={styles.cardTopline}>
              <span className={`${styles.statusPill} ${STATUS_CLASS[batch.status]}`}>
                {DEVICE_BATCH_STATUS[batch.status].label}
              </span>
              <span className={styles.updatedAt}>UPDATED {batch.updatedAt.toUpperCase()}</span>
            </div>

            <div className={styles.heroTitleRow}>
              <div>
                <div className={styles.eyebrow}>{batch.code}</div>
                <h1>{batch.name}</h1>
                <div className={styles.location}>
                  <MapPin aria-hidden size={15} />
                  {batch.location}
                </div>
              </div>
              <FollowBatchButton
                batchName={batch.name}
                compact
                label="FOLLOW"
                prominence="secondary"
                slug={batch.slug}
              />
            </div>

            {statusQuantityMatch ? (
              <div className={styles.detailStatusTag}>
                <strong>{statusQuantityMatch[1]}</strong>
                <span>{statusQuantityMatch[2]}</span>
              </div>
            ) : (
              <p className={styles.detailStatus}>{batch.statusLine}</p>
            )}

            <div className={styles.heroNext}>
              <span>NEXT MILESTONE</span>
              <strong>{batch.nextMilestone}</strong>
            </div>

            {batch.status === 'claim_open' && batch.claimPrice && claimHref ? (
              <div className={styles.claimOffer}>
                <div className={styles.claimOfferHeading}>
                  <span>ONE CLAIM INCLUDES</span>
                  <strong>{batch.distributionStages.length} PACKS</strong>
                </div>
                <ol className={styles.claimPackList}>
                  {batch.distributionStages.map((stage, index) => (
                    <li key={stage.id}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{stage.label}</strong>
                      <small>{stage.window}</small>
                    </li>
                  ))}
                </ol>
                <div className={styles.claimOfferFooter}>
                  <div className={styles.claimOfferStats}>
                    <div>
                      <span>CLAIM</span>
                      <strong>{formatBatchPrice(batch.claimPrice)}</strong>
                    </div>
                    <div>
                      <span>UNITS SECURED</span>
                      <strong>{securedQuantity}</strong>
                    </div>
                  </div>
                  <Link className="archive-button archive-button--primary" href={claimHref}>
                    CLAIM THIS BATCH <ArrowRight aria-hidden size={15} />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <BatchDiscussionPreview batch={batch} posts={discussionPosts} />

        <div className={styles.detailTabs} ref={tabsRef}>
          <ArchiveTabs
            activeId={activeTab}
            ariaLabel="Batch record sections"
            items={tabItems}
            onChange={changeTab}
          />
        </div>

        <div className={styles.tabPanel} role="tabpanel">
          {activeTab === 'status' ? (
            <div className={styles.tabStack}>
              <section className={styles.detailOverview}>
                <div className={styles.overviewCopy}>
                  <ArchiveSectionLabel>CURRENT STATUS</ArchiveSectionLabel>
                  <p>{batch.summary}</p>

                  <div className={styles.compactFacts}>
                    {compactFacts.map((fact) => (
                      <div key={fact.label}>
                        <span>{fact.label}</span>
                        <strong>{fact.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className={styles.statusActions}>
                    <button
                      aria-label={`View field lead ${batch.lead.name}`}
                      className={styles.statusLead}
                      onClick={() => setModal({ type: 'lead' })}
                      type="button"
                    >
                      <span className={styles.leadAvatar}>{batch.lead.initials}</span>
                      <span>
                        <small>FIELD LEAD</small>
                        <strong>{batch.lead.name.split(' ')[0]}</strong>
                      </span>
                    </button>
                    <button
                      className={styles.moreButton}
                      onClick={() => setModal({ type: 'dossier' })}
                      type="button"
                    >
                      MORE <ArrowRight aria-hidden size={14} />
                    </button>
                  </div>
                </div>

                <div className={styles.latestUpdate}>
                  <div className={styles.updateMeta}>
                    <Radio aria-hidden size={16} />
                    LATEST FIELD UPDATE · {batch.latestUpdate.date.toUpperCase()}
                  </div>
                  <h2>{batch.latestUpdate.title}</h2>
                  <BatchMediaGallery items={getFieldUpdateMedia(batch)} />
                  <p>{batch.latestUpdate.body}</p>
                </div>
              </section>

              <section className={styles.sectionBlock}>
                <div className={styles.sectionHeadingRow}>
                  <ArchiveSectionLabel>LIFECYCLE ARCHIVE</ArchiveSectionLabel>
                  <span>PAST STAGES</span>
                </div>
                {batch.archiveStages.length > 0 ? (
                  <div className={styles.archiveStageList}>
                    {batch.archiveStages.map((stage) => (
                      <button
                        className={styles.archiveStage}
                        key={stage.id}
                        onClick={() => setModal({ type: 'archive', stage })}
                        type="button"
                      >
                        <Archive aria-hidden size={17} />
                        <span>
                          <strong>{stage.label}</strong>
                          <small>{stage.period}</small>
                        </span>
                        <p>{stage.summary}</p>
                        <ArrowRight aria-hidden size={15} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyArchive}>
                    This is the first active stage. Its survey record will remain here after the
                    batch advances.
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {activeTab === 'distribution' ? (
            <div className={styles.tabStack}>
              <section className={styles.tabSummary}>
                <div>
                  <span>NEXT DELIVERY</span>
                  <strong>{nextDistributionStage?.label ?? 'Distribution complete'}</strong>
                </div>
                <div>
                  <span>WINDOW</span>
                  <strong>{nextDistributionStage?.window ?? batch.estimatedCompletion}</strong>
                </div>
                <div>
                  <span>FINAL DISPATCH</span>
                  <strong>
                    {batch.estimatedCompletion.replace('Estimated final dispatch: ', '')}
                  </strong>
                </div>
              </section>

              <section className={styles.sectionBlock}>
                <div className={styles.sectionHeadingRow}>
                  <ArchiveSectionLabel>DISTRIBUTION PLAN</ArchiveSectionLabel>
                  <span>{batch.distributionStages.length} STAGES</span>
                </div>
                <div className={styles.distributionList}>
                  {batch.distributionStages.map((stage, index) => {
                    const isNextAfterCurrent =
                      currentStageIndex >= 0 && index === currentStageIndex + 1
                    const shouldOpen =
                      stage.status === 'current' ||
                      isNextAfterCurrent ||
                      (currentStageIndex === -1 && index === 0 && batch.status !== 'active')

                    return (
                      <details
                        className={styles.distributionStage}
                        key={stage.id}
                        open={shouldOpen || undefined}
                      >
                        <summary>
                          <span
                            className={`${styles.stageMarker} ${styles[`stage${stage.status}`]}`}
                          >
                            {stage.status === 'completed' ? (
                              <Check aria-hidden size={15} />
                            ) : (
                              String(index + 1).padStart(2, '0')
                            )}
                          </span>
                          <span className={styles.stageTitle}>
                            <strong>{stage.label}</strong>
                            <small>{stage.window}</small>
                          </span>
                          <span className={styles.stageState}>
                            {STAGE_LABELS[stage.status]}
                          </span>
                          <ChevronDown
                            aria-hidden
                            className={styles.stageChevron}
                            size={17}
                          />
                        </summary>

                        <div className={styles.stageBody}>
                          <BatchMediaGallery
                            items={getDistributionMedia(batch, stage, index)}
                            variant="compact"
                          />
                          <p>{stage.summary}</p>
                          <ul>
                            {stage.contents.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                          {stage.status === 'completed' ? (
                            <ArchiveButton
                              onClick={() => setModal({ type: 'distribution', stage })}
                              variant="ghost"
                            >
                              OPEN STAGE ARCHIVE <ArrowRight aria-hidden size={14} />
                            </ArchiveButton>
                          ) : null}
                        </div>
                      </details>
                    )
                  })}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'holders' ? (
            <div className={styles.participationStack}>
              <section className={styles.sectionBlock}>
                <div className={styles.sectionHeadingRow}>
                  <ArchiveSectionLabel>HOLDERS</ArchiveSectionLabel>
                  <span>NO DIRECT MESSAGING</span>
                </div>
                {batch.status !== 'survey' ? (
                  <>
                    <div className={styles.holderGrid}>
                      {visibleHolders.map((holder) => (
                        <div className={styles.holderCard} key={`${holder.name}-${holder.unit}`}>
                          <span className={styles.holderAvatar}>
                            {holder.name
                              .split(' ')
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2)}
                          </span>
                          <span>
                            <strong>{holder.name}</strong>
                            <small>{holder.location}</small>
                          </span>
                          <em>{holder.unit}</em>
                        </div>
                      ))}
                    </div>
                    <p className={styles.holderNote}>
                      Holders can meet in the public discussion and take part in batch
                      decisions. This directory does not provide private messaging.
                    </p>
                  </>
                ) : (
                  <div className={styles.emptyArchive}>
                    The holder directory opens when claims begin. Follow this batch to be
                    notified when its status changes.
                  </div>
                )}
              </section>

              <BatchParticipation batch={batch} decision={decision} />
            </div>
          ) : null}
        </div>
      </div>

      {modal?.type === 'dossier' && (
        <ArchiveModal eyebrow={batch.code} onClose={() => setModal(null)} title="Full dossier">
          <p className={styles.modalLead}>{batch.summary}</p>
          <div className={styles.modalFacts}>
            {batch.facts.map((fact) => (
              <div key={fact.label}>
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>
        </ArchiveModal>
      )}

      {modal?.type === 'lead' && (
        <ArchiveModal eyebrow="BATCH LEAD" onClose={() => setModal(null)} title={batch.lead.name}>
          <div className={styles.modalLeadIdentity}>
            <span className={styles.leadAvatar}>{batch.lead.initials}</span>
            <div>
              <strong>{batch.lead.role}</strong>
              <span>{batch.lead.location}</span>
            </div>
          </div>
          <p className={styles.modalLead}>{batch.lead.bio}</p>
          <blockquote>{batch.lead.latestNote}</blockquote>
        </ArchiveModal>
      )}

      {modal?.type === 'archive' && (
        <ArchiveModal
          eyebrow={modal.stage.period}
          onClose={() => setModal(null)}
          title={modal.stage.label}
        >
          <p className={styles.modalLead}>{modal.stage.summary}</p>
          <ul className={styles.evidenceList}>
            {modal.stage.evidence.map((item) => (
              <li key={item}>
                <Check aria-hidden size={15} />
                {item}
              </li>
            ))}
          </ul>
        </ArchiveModal>
      )}

      {modal?.type === 'distribution' && (
        <ArchiveModal
          eyebrow={modal.stage.window}
          onClose={() => setModal(null)}
          title={modal.stage.label}
        >
          <p className={styles.modalLead}>{modal.stage.summary}</p>
          <div className={styles.archiveCallout}>
            <CalendarDays aria-hidden size={18} />
            <span>{modal.stage.archiveNote ?? 'This stage is complete and remains on record.'}</span>
          </div>
          <ul className={styles.evidenceList}>
            {modal.stage.contents.map((item) => (
              <li key={item}>
                <Check aria-hidden size={15} />
                {item}
              </li>
            ))}
          </ul>
        </ArchiveModal>
      )}
    </main>
  )
}
