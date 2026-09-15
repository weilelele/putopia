'use client'

import Image from 'next/image'
import { useState } from 'react'
import { getVoyagerById } from '@/lib/actions/profile'
import { VoyagerQuickView } from '@/components/activity-feed'
import type { DeviceBatchLead } from '@/lib/device-batches'
import type { VoyagerProfile } from '@/types/database'
import styles from './device-gallery.module.css'

export function DeviceFieldLead({ lead }: { lead: DeviceBatchLead }) {
  const [profile, setProfile] = useState<VoyagerProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  if (!lead.profileId) return <strong>{lead.name}</strong>
  return <>
    <button className={styles.lead} type="button" disabled={loading} onClick={async () => {
      setLoading(true)
      setError('')
      try {
        const result = await getVoyagerById(lead.profileId!)
        if (!result) throw new Error('This profile is unavailable.')
        setProfile(result)
      } catch { setError('Could not load this profile. Select the name to try again.') }
      finally { setLoading(false) }
    }}>
      {lead.avatarUrl ? <Image src={lead.avatarUrl} alt="" width={44} height={44} unoptimized /> : <span aria-hidden>{lead.initials}</span>}
      <strong>{loading ? 'Loading…' : lead.name}</strong>
    </button>
    {error ? <p role="alert">{error}</p> : null}
    {profile ? <VoyagerQuickView profile={profile} onClose={() => setProfile(null)} /> : null}
  </>
}
