'use client'

import { useEffect, useRef, useState } from 'react'
import SmartImage from '@/components/smart-image'
import { MemberProfileSheet } from '@/components/member-profile-sheet'
import { memberInitials } from '@/lib/member-initials'
import type { InitiationPublicMember } from '@/lib/initiation-types'
import styles from './member-strip.module.css'

function MemberAvatar({ member }: { member: InitiationPublicMember }) {
  const [failed, setFailed] = useState(false)
  return <span className={styles.avatar} aria-hidden>
    {memberInitials(member.displayName)}
    {member.avatarUrl && !failed && <SmartImage src={member.avatarUrl} alt="" sizes="48px" width={48} height={48} onError={() => setFailed(true)} />}
  </span>
}

/** A selection from a loaded roster, never a live registration feed. */
export function MemberStrip({ members }: { members: InitiationPublicMember[] }) {
  return <MemberRotation key={JSON.stringify(members)} members={members} />
}

function MemberRotation({ members }: { members: InitiationPublicMember[] }) {
  const [rotation, setRotation] = useState(() => ({ cursor: Math.min(members.length, 4) - 1, progress: 0 }))
  const [focused, setFocused] = useState(false)
  const [selected, setSelected] = useState<InitiationPublicMember | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const elapsed = useRef(0)
  const canRotate = members.length > 4
  useEffect(() => {
    if (!canRotate || focused || selected) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame: number
    let previous: number | null = null
    function tick(now: number) {
      if (document.hidden || motion.matches) {
        previous = null
      } else {
        if (previous !== null) elapsed.current += Math.min(now - previous, 64)
        previous = now
        if (elapsed.current >= 4560) {
          elapsed.current = 0
          setRotation(current => ({ cursor: (current.cursor + 1) % members.length, progress: 0 }))
        } else if (elapsed.current > 4000) {
          const t = (elapsed.current - 4000) / 560
          const progress = t * t * (3 - 2 * t)
          setRotation(current => ({ ...current, progress }))
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [canRotate, members.length, focused, selected])

  const cards = members.length ? Array.from({ length: Math.min(4, members.length) + (canRotate ? 1 : 0) }, (_, index) => {
    const position = index - (canRotate ? 1 : 0)
    return { position, member: members[(rotation.cursor - position + members.length) % members.length] }
  }) : []

  return <section className={styles.members} aria-label="S26 member selection">
    <div className={styles.viewport} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
      <ul className={styles.row} aria-live="off">
        {cards.map(({ member, position }) => <li key={member.id} className={styles.item} style={{ left: `${position * (88 / 3.64)}%`, transform: `translateX(${rotation.progress * 88}%)`, opacity: memberOpacity(position + rotation.progress) }}>
          <button type="button" tabIndex={position < 0 ? -1 : 0} aria-hidden={position < 0 && rotation.progress === 0 ? true : undefined} aria-label={`View ${member.displayName}'s profile`} aria-haspopup="dialog" onClick={event => { trigger.current = event.currentTarget; setSelected(member) }}>
            <MemberAvatar key={`${member.id}:${member.avatarUrl}`} member={member} />
          </button>
        </li>)}
      </ul>
      {!members.length && <p className={styles.empty}>Profiles unavailable</p>}
    </div>
    {selected && <MemberProfileSheet key={selected.id} profileId={selected.id} onClose={() => { setSelected(null); requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true })) }} />}
  </section>
}

/** Fade by screen position: translucent ends and two clear center portraits. */
function memberOpacity(position: number): number {
  const stops = [0, 0.4, 1, 1, 0.4, 0]
  const index = Math.min(4, Math.max(0, Math.floor(position + 1)))
  const fraction = Math.max(0, Math.min(1, position + 1 - index))
  return stops[index] + (stops[index + 1] - stops[index]) * fraction
}
