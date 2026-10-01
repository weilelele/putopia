'use client'
import { useState } from 'react'
import SmartImage from '@/components/smart-image'
import { MemberProfileSheet } from '@/components/member-profile-sheet'
import type { WorldByline as Byline } from '@/lib/world-presentation'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** Round avatar + name; tapping either opens the discoverer's profile when one exists. */
export function WorldByline({ byline, avatar, label = 'BY' }: { byline: Byline; avatar?: string | null; label?: string }) {
  const [open, setOpen] = useState(false)
  const face = (
    <>
      <span className="world-byline__avatar" aria-hidden>
        {avatar
          ? <SmartImage src={avatar} alt="" sizes="32px" width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>{byline.pending ? '?' : initials(byline.name)}</span>}
      </span>
      <span className="world-byline__text">
        <span className="world-byline__label">{label}</span>
        <span className="world-byline__name">{byline.name}</span>
      </span>
    </>
  )
  return (
    <>
      {byline.profileId
        ? <button type="button" className="world-byline" onClick={() => setOpen(true)} aria-label={`View ${byline.name}'s profile`}>{face}</button>
        : <div className={`world-byline${byline.pending ? ' is-pending' : ''}`}>{face}</div>}
      {open && byline.profileId && <MemberProfileSheet profileId={byline.profileId} onClose={() => setOpen(false)} />}
    </>
  )
}
