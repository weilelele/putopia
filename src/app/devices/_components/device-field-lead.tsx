'use client'

import Image from 'next/image'
import { useState } from 'react'
import { UserRound } from 'lucide-react'
import { ArchiveSheet } from '@/components/archive-sheet'
import type { DeviceBatchLead } from '@/lib/device-batches'
import styles from './device-gallery.module.css'

export function DeviceFieldLead({ lead }: { lead: DeviceBatchLead }) {
  const [open, setOpen] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const avatar = lead.avatarUrl && !avatarFailed
    ? <Image src={lead.avatarUrl} alt="" width={44} height={44} unoptimized onError={() => setAvatarFailed(true)} />
    : <span className={styles.leadAvatar} aria-label={`${lead.name} avatar unavailable`}><UserRound aria-hidden size={24} /></span>
  return <>
    <button className={styles.lead} type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      {avatar}
      <strong>{lead.name}</strong>
    </button>
    {open ? <ArchiveSheet open title={lead.name} onClose={() => setOpen(false)}>
      <div className={styles.lead}>{avatar}<strong>{lead.name}</strong></div>
      <p>{lead.role}{lead.location ? ` · ${lead.location}` : ''}</p>
      <p className={styles.updateBody}>{lead.bio || 'Biography not yet available.'}</p>
      {lead.latestNote ? <section><h3>FIELD LEAD LATEST NOTE</h3><p className={styles.updateBody}>{lead.latestNote}</p></section> : null}
    </ArchiveSheet> : null}
  </>
}
