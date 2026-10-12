'use client'

import { useEffect, useState } from 'react'
import { ArchiveSheet } from './archive-sheet'
import { ArchiveButton } from './archive-button'
import { getMemberProfile } from '@/lib/actions/profile'
import { MemberProfileContent } from './member-profile-content'

type Profile = NonNullable<Awaited<ReturnType<typeof getMemberProfile>>>

export function MemberProfileSheet({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    getMemberProfile(profileId).then(data => {
      if (active) setProfile(data)
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [profileId, retry])

  return <ArchiveSheet open title="Member profile" onClose={onClose}>
    {failed ? <div role="alert"><p>Profile could not be loaded.</p><ArchiveButton variant="secondary" onClick={() => { setFailed(false); setProfile(undefined); setRetry(value => value + 1) }}>Retry</ArchiveButton></div>
      : profile === undefined ? <p role="status">Loading profile…</p>
      : profile === null ? <p>This member profile is no longer available.</p>
      : <MemberProfileContent profile={profile} />}
  </ArchiveSheet>
}
