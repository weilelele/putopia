'use client'

import { useEffect, useState } from 'react'
import { noticeStatus, noticeUtcOffset, type NoticeTiming } from '@/lib/intel-notice'

const LABELS = { active: 'TASK ACTIVE', expired: 'TASK ENDED', scheduled: 'TASK NOT STARTED', legacy: 'ARCHIVED NOTICE' }

/** Re-evaluate at each boundary, including when a sleeping tab is reopened. */
export function NoticeStatus({ entry }: { entry: NoticeTiming }) {
  const [now, setNow] = useState<number | null>(null)
  const { tag, timestamp, expires_at } = entry
  useEffect(() => {
    if (tag !== 'NOTICE') return
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      const time = Date.now()
      setNow(time)
      const next = [Date.parse(timestamp), Date.parse(expires_at ?? '')]
        .filter(boundary => boundary > time)
      if (next.length) timer = setTimeout(refresh, Math.min(Math.min(...next) - time, 3_600_000))
    }
    timer = setTimeout(refresh, 0)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [tag, timestamp, expires_at])

  if (tag !== 'NOTICE' || now === null) return null
  const status = noticeStatus(entry, now)
  if (!status) return null
  return <div className="my-2 text-[length:var(--fs-caption)] text-[var(--color-star-dim)]" role="status">
    <span>{LABELS[status]}</span>
    {expires_at && status !== 'legacy' && <> · {status === 'expired' ? 'Ended' : 'Ends'} <time dateTime={expires_at}>{new Date(expires_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} ({noticeUtcOffset(expires_at)})</time></>}
  </div>
}
