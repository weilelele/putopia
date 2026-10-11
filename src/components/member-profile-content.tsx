'use client'

import { useState } from 'react'
import type { VoyagerProfile } from '@/types/database'
import { memberInitials } from '@/lib/member-initials'
import { publicMemberBio } from '@/lib/public-member-bio'
import styles from './member-profile-sheet.module.css'

type PublicProfile = Pick<VoyagerProfile, 'display_name'> & Partial<Pick<VoyagerProfile,
  'role' | 'avatar_url' | 'location' | 'bio' | 'observation_days' | 'worlds_discovered' | 'batch_label' | 'joined_at' | 'social_x' | 'social_instagram' | 'social_linkedin' | 'account_kind'>>

function publicLink(value: string | null | undefined) {
  if (!value) return null
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null } catch { return null }
}

/** Presentation only: each caller retains its existing access-controlled data source. */
export function MemberProfileContent({ profile }: { profile: PublicProfile }) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null)
  const avatar = profile.role === 'voyager' || profile.role === 'architect' ? profile.avatar_url : null
  const links = [
    { label: 'X', href: publicLink(profile.social_x) },
    { label: 'Instagram', href: publicLink(profile.social_instagram) },
    { label: 'LinkedIn', href: publicLink(profile.social_linkedin) },
  ].filter(link => link.href)
  return <div className={styles.profile}>
    <div className={styles.identity}>
      {avatar && failedAvatar !== avatar
        // eslint-disable-next-line @next/next/no-img-element -- Existing user-uploaded public profile image.
        ? <img className={styles.avatar} src={avatar} alt="" onError={() => setFailedAvatar(avatar)} />
        : <span className={styles.avatar} aria-hidden>{memberInitials(profile.display_name)}</span>}
      <div><h3>{profile.display_name}</h3>{profile.role && <p className={styles.role}>{profile.role}</p>}{profile.batch_label && <p className={styles.meta}>{profile.batch_label}</p>}</div>
    </div>
    {profile.account_kind === 'npc' && <p className={styles.meta}>Official fictional NPC</p>}
    {profile.location && <p className={styles.meta}>{profile.location}</p>}
    {profile.bio && <p className={styles.bio}>{publicMemberBio(profile.bio)}</p>}
    <dl className={styles.stats}>
      <div><dt>Observation days</dt><dd>{profile.observation_days ?? '—'}</dd></div>
      <div><dt>Worlds discovered</dt><dd>{profile.worlds_discovered ?? '—'}</dd></div>
    </dl>
    {profile.joined_at && <p className={styles.meta}>Joined <time dateTime={profile.joined_at}>{new Date(profile.joined_at).toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'})}</time></p>}
    {links.length > 0 && <div className={styles.socials}>{links.map(link => <a key={link.label} href={link.href!} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div>}
  </div>
}
