import type { IntelTag } from '@/types/database'

export type NoticeTiming = {
  tag: IntelTag
  timestamp: string
  expires_at?: string | null
}

export function noticeStatus(entry: NoticeTiming, now: number): 'active' | 'expired' | 'scheduled' | 'legacy' | null {
  if (entry.tag !== 'NOTICE') return null
  if (!entry.expires_at) return 'legacy'
  const start = Date.parse(entry.timestamp)
  const end = Date.parse(entry.expires_at)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'legacy'
  if (now >= end) return 'expired'
  return now < start ? 'scheduled' : 'active'
}

export function validateNoticeTiming(entry: NoticeTiming): string | null {
  const start = Date.parse(entry.timestamp)
  if (!Number.isFinite(start)) return 'A valid publication time is required.'
  if (entry.tag !== 'NOTICE') return null
  const end = entry.expires_at ? Date.parse(entry.expires_at) : NaN
  if (!Number.isFinite(end)) return 'NOTICE tasks require an expiry date and time.'
  if (end <= start) return 'The task expiry must be after its publication time.'
  return null
}

/** datetime-local inputs represent the editor's local time, not UTC. */
export function toLocalDateTime(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}
