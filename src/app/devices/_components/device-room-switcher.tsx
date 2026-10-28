'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { DeviceLiveRoom } from '../live/device-live-room'
import type { getDeviceRoom } from '@/lib/actions/device-room'
import type { DeviceBatch } from '@/lib/device-batches'
import { createKeyedClientDataCache } from '@/lib/client-data-cache'
import { useAuth } from '@/lib/auth-context'
import { ArchiveRouteError, ArchiveRouteLoading } from '@/components/archive-route-state'
import { ArchiveButton } from '@/components/archive-button'

type Snapshot = Awaited<ReturnType<typeof getDeviceRoom>>
const rooms = createKeyedClientDataCache<Snapshot>(30_000)

export function DeviceRoomSwitcher({ batches, initial, introduction }: { batches: DeviceBatch[]; initial: Snapshot; introduction: ReactNode }) {
  const pathname = usePathname()
  const { user, accessRole, loading } = useAuth()
  const slug = batches.find(batch => pathname === `/devices/batches/${batch.slug}`)?.slug ?? initial.room.batch.slug
  const scope = `${user.id ?? 'guest'}:${user.role}:${accessRole}:`
  const key = `${scope}${slug}`
  const cache = rooms.forKey(key)
  const [resolved, setResolved] = useState<{ key: string; snapshot: Snapshot } | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const initialViewerMatches = loading || (initial.viewerId === (user.id ?? null) && initial.viewerRole === user.role)
  const initialMatches = initial.room.batch.slug === slug && initialViewerMatches
  const selected = resolved?.key === key ? resolved.snapshot : cache.peek() ?? (initialMatches ? initial : null)
  // Keep the same scrolling surface and introduction while another batch loads.
  // A previous account or permission scope is never eligible for this fallback.
  const previous = resolved?.key.startsWith(scope) ? resolved.snapshot : initialViewerMatches ? initial : null
  const snapshot = selected ?? previous

  useEffect(() => {
    if (loading) return
    let cancelled = false
    // A fresh server snapshot already contains this exact viewer's room.
    if (!attempt && initialMatches && !cache.peek() && Date.now() - initial.fetchedAt < 30_000) cache.set(initial)
    cache.load(async () => {
      const response = await fetch(`/api/devices/rooms/${encodeURIComponent(slug)}`, { cache: 'no-store', credentials: 'same-origin' })
      if (!response.ok) throw new Error('Device status could not be loaded.')
      return response.json() as Promise<Snapshot>
    }).then(value => {
      if (!cancelled) { setResolved({ key, snapshot: value }); setFailedKey(null) }
    }).catch(() => { if (!cancelled) setFailedKey(key) })
    return () => { cancelled = true }
  }, [loading, initialMatches, initial, slug, key, cache, attempt])

  if (!snapshot) return failedKey === key
    ? <ArchiveRouteError onRetry={() => { cache.clear(); setAttempt(value => value + 1) }} returnHref="/devices" returnLabel="DEVICE LIBRARY" />
    : <ArchiveRouteLoading />
  return <>
    {failedKey === key && <div className="archive-inline-notice" role="status"><p>The latest device status could not be loaded.</p><ArchiveButton variant="secondary" onClick={() => { cache.clear(); setAttempt(value => value + 1) }}>Retry</ArchiveButton></div>}
    <DeviceLiveRoom {...snapshot.room} pendingSlug={!selected && failedKey !== key ? slug : undefined} introduction={introduction} batches={batches} onSelectBatch={selected => {
      if (selected !== slug) window.history.pushState(null, '', `/devices/batches/${selected}`)
    }} />
  </>
}
