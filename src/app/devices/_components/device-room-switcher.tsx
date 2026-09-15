'use client'

import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'
import { DeviceLiveRoom } from '../live/device-live-room'

export type DeviceRoomData = Omit<ComponentProps<typeof DeviceLiveRoom>, 'batches' | 'onSelectBatch'>

export function DeviceRoomSwitcher({ rooms, initialSlug }: {
  rooms: DeviceRoomData[]
  initialSlug: string
}) {
  const pathname = usePathname()
  const selected = rooms.find((room) => pathname === `/devices/batches/${room.batch.slug}`)
    ?? rooms.find((room) => room.batch.slug === initialSlug)
    ?? rooms[0]

  if (!selected) return null

  return <DeviceLiveRoom
    {...selected}
    batches={rooms.map((room) => room.batch)}
    onSelectBatch={(slug) => {
      if (slug === selected.batch.slug) return
      // Native history keeps deep links and Back/Forward without fetching a route.
      window.history.pushState(null, '', `/devices/batches/${slug}`)
    }}
  />
}
