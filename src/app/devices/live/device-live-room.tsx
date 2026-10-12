'use client'
import { deviceBatchIntroduction, deviceBatchMilestone } from '@/lib/device-membership-copy'
import { RootBrandHeader } from '@/components/root-brand-header'
import consoleStyles from '@/components/mc-console-panel.module.css'
import { ArchiveTabs } from '@/components/archive-tabs'
import { ArchiveButton } from '@/components/archive-button'
import { DeviceClaimPanel, type DeviceClaimAccess } from '../_components/device-claim-panel'
import { useSessionPreference } from '@/lib/use-session-preference'

import { ArchiveSheet } from '@/components/archive-sheet'
import { BackLink } from '@/components/back-link'
import { usePathname } from 'next/navigation'
import { DeviceGallery, UpdateMedia, DeviceMediaImage as Image } from '../_components/device-gallery'
import { DeviceFieldLead } from '../_components/device-field-lead'
import mediaStyles from '../_components/device-gallery.module.css'
import { getDeviceBatchMedia, getDeviceBatchUpdates, getDeviceBatchProgress } from '@/lib/device-batch-content'
import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { trackDevice } from '@/lib/device-analytics'
import { SeenFigure } from '../_components/seen-figure'
import { useDeviceDwell } from '../_components/use-device-dwell'
import {
  ChevronRight,
  ListFilter,
} from 'lucide-react'
import styles from '../../live-observation-room.module.css'
import { FollowBatchButton } from '../_components/batch-actions'
import { useFollowedBatchSlugs } from '../_components/use-followed-batches'
import { CosmoCameraEmbed } from '@/components/cosmo-camera-embed'
import type { DeviceCameraSource } from '@/lib/device-camera'
import {
  DEVICE_BATCH_STATUS,
  DEVICE_BATCH_PHASES,
  type DeviceBatch,
  type DeviceBatchStatus,
} from '@/lib/device-batches'
import type { DeviceConsoleRecord } from '@/lib/actions/orders'

type ContentTab = 'info' | 'updates'
type BatchFilter = 'all' | 'following' | DeviceBatchStatus

export function DeviceLiveRoom({
  batch,
  batches,
  ownedConsole,
  claimAccess,
  camera,
  onSelectBatch,
  introduction,
}: {
  introduction?: ReactNode
  onSelectBatch: (slug: string) => void
  batch: DeviceBatch
  batches: DeviceBatch[]
  ownedConsole: DeviceConsoleRecord | null
  claimAccess: DeviceClaimAccess
  camera?: DeviceCameraSource | null
}) {
  const pathname = usePathname()
  const [isRoot] = useState(pathname === '/devices')
  const followedBatchSlugs = useFollowedBatchSlugs()
  const [savedTab, setActiveTab] = useSessionPreference<ContentTab>(`mc:view:devices:${batch.slug}:tab`, 'info')
  const activeTab = savedTab === 'updates' ? 'updates' : 'info'
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useSessionPreference<BatchFilter>('mc:view:devices:filter:v2', 'all')
  const [progressOpen, setProgressOpen] = useState(false)
  const progress = getDeviceBatchProgress(batch)
  const currentStage = progress.find((stage) => stage.status === 'current')?.label ?? (progress.every((stage) => stage.status === 'completed') ? 'COMPLETE' : 'AWAITING NEXT STAGE')
  const materialRecords = getDeviceBatchMedia(batch)
  const updates = getDeviceBatchUpdates(batch)
  const nextMilestone = deviceBatchMilestone(batch)
  const [gallerySelection, setGallerySelection] = useState({ slug: batch.slug, index: 0 })
  const selectedMedia = gallerySelection.slug === batch.slug ? gallerySelection.index : 0
  const selectMedia = (index: number) => setGallerySelection({ slug: batch.slug, index })

  const filteredBatches = useMemo(() => {
    if (filter === 'all') return batches
    if (filter === 'following') return batches.filter((item) => followedBatchSlugs.includes(item.slug))
    return batches.filter((item) => item.status === filter)
  }, [batches, filter, followedBatchSlugs])

  const claimState = ownedConsole ? 'owned' : 'check_entitlement'
  useEffect(() => {
    trackDevice('device_room_viewed', {
      batch_slug: batch.slug, batch_status: batch.status, claim_state: claimState, active_tab: activeTab,
      surface: isRoot ? 'devices_index' : 'batch_detail',
    })
    // One view per batch; claim state changes alone are not a new view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.slug])

  useDeviceDwell(batch.slug)

  // mediaIndex < 0 is the live camera thumbnail; otherwise it indexes materialRecords.
  function trackMedia(event: string, mediaIndex: number, extra: Record<string, unknown> = {}) {
    const item = mediaIndex >= 0 ? materialRecords[mediaIndex] : null
    trackDevice(event, {
      batch_slug: batch.slug, media_index: mediaIndex,
      media_kind: item ? item.kind : 'live_camera',
      media_caption: item ? item.caption : camera?.binding.title ?? null,
      media_src: item ? item.src : null,
      ...extra,
    })
  }

  function chooseBatch(slug: string, via: 'tab' | 'sheet' = 'tab') {
    trackDevice('device_batch_selected', { from_batch_slug: batch.slug, batch_slug: slug, via })
    setSheetOpen(false)
    setProgressOpen(false)
    onSelectBatch(slug)
  }

  return (
    <main className={`main ${styles.page}`} data-route-scroll>{!isRoot && <BackLink href="/devices" label="Devices" />}
      {isRoot ? <><h1 className="sr-only">Devices</h1><RootBrandHeader /></> : (<header className={`${styles.roomHeader}${isRoot ? ` ${styles.rootActions}` : ''}`}>
        <h1 className="sr-only">DEVICES</h1>

      </header>)}

      {introduction}
      <section className={styles.discoveryIntro} aria-label="Device discoveries">
        <h2 className={consoleStyles.sectionTitle}>Found Devices Around The World</h2>
      </section>

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
        <ArchiveButton variant="ghost" aria-label="Open all device batches" className={styles.listButton} onClick={() => { trackDevice('device_batch_list_opened', { batch_slug: batch.slug }); setSheetOpen(true) }} type="button">
          <ListFilter aria-hidden size={20} />
        </ArchiveButton>
      </nav>

      <div className={styles.workspace}><div className={styles.workspaceMedia}>
      <DeviceGallery
        media={materialRecords}
        onSelect={(index) => { trackMedia('device_gallery_item_selected', index - (camera ? 1 : 0), { from_index: selectedMedia, position: index }); selectMedia(index) }}
        onVideoPlay={(mediaIndex) => trackMedia('device_video_played', mediaIndex, { surface: 'gallery' })}
        primary={camera ? <CosmoCameraEmbed source={camera} location={batch.location} timeZone={batch.timeZone} /> : undefined}
        primaryLabel={camera?.binding.title}
        selected={selectedMedia}
      />

      </div><div className={styles.workspaceDetails}>
      <DeviceClaimPanel key={batch.slug} batch={batch} access={claimAccess} ownedProgress={ownedConsole ? (
        <ArchiveButton variant="primary" fullWidth className={`${styles.primaryButton} ${styles.claimButton}`} onClick={() => { trackDevice('device_progress_opened', { batch_slug: batch.slug }); setProgressOpen(true) }}><span>CHECK MY PROGRESS</span><strong>{ownedConsole.unitCode}</strong></ArchiveButton>
      ) : undefined} />

      <section className={styles.sectionPanel}>
        <ArchiveTabs ariaLabel="Device room content" activeId={activeTab}
          items={[{id:'info',label:'INFO'},{id:'updates',label:'UPDATES'}].map(item=>({...item,panelId:`device-room-${item.id}`}))}
          onChange={id => {
            // Re-clicking the open tab is not a change; only record real switches.
            if (id !== activeTab) trackDevice('device_tab_changed', { batch_slug: batch.slug, tab: id, from_tab: activeTab })
            setActiveTab(id as typeof activeTab)
          }} />

        {activeTab === 'info' ? (
          <div className={styles.panelBody} role="tabpanel" id={`device-room-${activeTab}`} aria-labelledby={`device-room-${activeTab}-tab`}>
            <h2 className={styles.infoTitle}>{batch.name}</h2>
            <p className={styles.intro}>{deviceBatchIntroduction(batch)}</p>
            <div className={styles.infoActions}>
              <FollowBatchButton batchName={batch.name} compact prominence="secondary" slug={batch.slug} />
            </div>

            <div className={styles.progressBlock}>
              <div className={styles.progressLabel}><span>BATCH PROGRESS</span><span>{currentStage}</span></div>
              <div className={mediaStyles.progress}>
                {progress.map((step) => (
                  <div className={`${styles.progressStep} ${mediaStyles.progressStep}`} aria-current={step.status === 'current' ? 'step' : undefined} data-status={step.status} key={step.label}>
                    <span className={styles.progressBar} />
                    <strong aria-label={step.fullLabel} title={step.fullLabel}>{step.label}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.facts}>
              <div className={styles.fact}><span>LOCATION</span><strong>{batch.location}</strong></div>
              <div className={styles.fact}><span>CONFIRMED UNITS</span><strong>{batch.inventory?.listingQuantity ?? 'NOT CONFIRMED'}</strong></div>
              <div className={styles.fact}><span>FIELD LEAD</span><DeviceFieldLead key={batch.slug} lead={batch.lead} /></div>
              <div className={styles.fact}><span>NEXT MILESTONE</span><strong>{nextMilestone}</strong></div>
            </div>


            <div className={styles.mediaSection}>
              <div className={styles.mediaSectionHeader}><h3>MATERIAL RECORDS</h3></div>
              <div className={styles.mediaList}>
                {materialRecords.map((item) => {
                  const [title, ...descriptionParts] = item.caption.split(' · ')
                  const description = descriptionParts.join(' · ')
                  return <SeenFigure className={styles.mediaRecord} key={`${item.src}-${item.caption}`} onSeen={() => trackMedia('device_media_record_seen', materialRecords.indexOf(item))}>
                    <div className={styles.mediaRecordVisual}>
                      {item.kind === 'video'
                        ? <video controls playsInline poster={item.poster} preload="metadata" src={item.src} onPlay={() => trackMedia('device_video_played', materialRecords.indexOf(item), { surface: 'material_records' })} />
                        : <Image alt={item.alt} height={1200} sizes="(max-width: 767px) calc(100vw - 64px), 34rem" src={item.src} style={{ height: 'auto', width: '100%' }} unoptimized width={1600} />}
                    </div>
                    <figcaption className={styles.mediaRecordCopy}>
                      <strong>{title || item.alt}</strong>
                      <p>{description || item.alt}</p>
                    </figcaption>
                  </SeenFigure>
                })}
              </div>
            </div>

          </div>
        ) : null}

        {activeTab === 'updates' ? (
          <div className={styles.panelBody} role="tabpanel" id={`device-room-${activeTab}`} aria-labelledby={`device-room-${activeTab}-tab`}>
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
              {(['all', 'following', ...DEVICE_BATCH_PHASES] as BatchFilter[]).map((item) => (
                <ArchiveButton variant="secondary" aria-pressed={filter === item} className={styles.filterButton} key={item} onClick={() => { trackDevice('device_batch_filter_changed', { filter: item }); setFilter(item) }} type="button">{item === 'all' || item === 'following' ? item.toUpperCase() : DEVICE_BATCH_STATUS[item].label}</ArchiveButton>
              ))}
            </div>
            <div className={styles.sheetList}>
              {filteredBatches.map((item) => (
                <ArchiveButton variant="secondary" className={styles.sheetRow} key={item.code} onClick={() => chooseBatch(item.slug, 'sheet')} type="button">
                  <span className={styles.dot} style={{ background: 'var(--color-nucleus)' }} />
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
              <Link className={styles.primaryButton} href="/devices/my-consoles" onClick={() => trackDevice('device_unit_record_opened', { batch_slug: batch.slug })}>OPEN FULL UNIT RECORD</Link>
            </div>
          </ArchiveSheet>
      ) : null}
    </main>
  )
}
