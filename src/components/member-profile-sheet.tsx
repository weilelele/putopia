'use client'

import { useEffect, useState } from 'react'
import { ArchiveSheet } from './archive-sheet'
import { ArchiveButton } from './archive-button'
import { getMemberProfile } from '@/lib/actions/profile'
import styles from './member-profile-sheet.module.css'

type Profile = NonNullable<Awaited<ReturnType<typeof getMemberProfile>>>

function publicLink(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

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

  const socials = profile ? [
    { label: 'X', href: publicLink(profile.social_x) },
    { label: 'Instagram', href: publicLink(profile.social_instagram) },
    { label: 'LinkedIn', href: publicLink(profile.social_linkedin) },
  ].filter(link => link.href) : []
  const avatar = profile && (profile.role === 'voyager' || profile.role === 'architect') ? profile.avatar_url : null

  return <ArchiveSheet open title="Member profile" onClose={onClose}>
    {failed ? <div role="alert"><p>Profile could not be loaded.</p><ArchiveButton variant="secondary" onClick={() => { setFailed(false); setProfile(undefined); setRetry(value => value + 1) }}>Retry</ArchiveButton></div>
      : profile === undefined ? <p role="status">Loading profile…</p>
      : profile === null ? <p>This member profile is no longer available.</p>
      : <div className={styles.profile}>
        <div className={styles.identity}>
          {avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img className={styles.avatar} src={avatar} alt="" />
            : <span className={styles.avatar} aria-hidden>{profile.display_name.slice(0, 2).toUpperCase()}</span>}
          <div><h3>{profile.display_name}</h3><p className={styles.role}>{profile.role}</p>{profile.batch_label && <p className={styles.meta}>{profile.batch_label}</p>}</div>
        </div>
        {profile.location && <p className={styles.meta}>{profile.location}</p>}
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        <dl className={styles.stats}>
          <div><dt>Observation days</dt><dd>{profile.observation_days}</dd></div>
          <div><dt>Worlds discovered</dt><dd>{profile.worlds_discovered}</dd></div>
        </dl>
        <p className={styles.meta}>Joined <time dateTime={profile.joined_at}>{new Date(profile.joined_at).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'})}</time></p>
        {socials.length > 0 && <div className={styles.socials}>{socials.map(link => <a key={link.label} href={link.href!} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div>}
      </div>}
  </ArchiveSheet>
}
