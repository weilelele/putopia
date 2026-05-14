'use client'

import { useAuth, UserRole } from '@/lib/auth-context'
import clsx from 'clsx'

const ROLE_LABELS: Record<UserRole, string> = {
  guest: 'GUEST',
  applicant: 'APPLICANT',
  voyager: 'VOYAGER',
  architect: 'ARCHITECT',
}

const ROLE_STYLES: Record<UserRole, { color: string; border: string; bg: string }> = {
  guest: { color: '#7A6A40', border: '#3D3010', bg: 'transparent' },
  applicant: { color: '#E8A020', border: '#E8A02066', bg: 'rgba(232,160,32,0.08)' },
  voyager: { color: '#C4A96A', border: '#C4A96A66', bg: 'rgba(196,169,106,0.08)' },
  architect: { color: '#D4601A', border: '#D4601A66', bg: 'rgba(212,96,26,0.08)' },
}

export function RoleBadge({ role }: { role?: UserRole }) {
  const { user } = useAuth()
  const r = role ?? user.role
  const s = ROLE_STYLES[r]
  return (
    <span
      className={clsx('inline-block px-2 py-0.5 text-xs border rounded font-mono tracking-widest')}
      style={{ color: s.color, borderColor: s.border, background: s.bg }}
    >
      {ROLE_LABELS[r]}
    </span>
  )
}
