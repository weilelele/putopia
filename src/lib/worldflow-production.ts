import type { WorldflowAsset, WorldflowState } from '@/lib/actions/worldflow'

export type WorldflowVideoSequenceItem = {
  asset: WorldflowAsset
  eventName: string
  isSubEvent: boolean
  parentEventName: string
  shotName: string
  timeSlotName: string
}

export function buildWorldflowVideoSequence(state: WorldflowState, assets: WorldflowAsset[]): WorldflowVideoSequenceItem[] {
  const positions = new Map<string, Omit<WorldflowVideoSequenceItem, 'asset'> & { order: number[] }>()

  state.shots.forEach((shot, shotIndex) => {
    const slots = state.eventSystems[shot.id]?.timeSlots ?? []
    slots.forEach((slot, slotIndex) => {
      slot.events.forEach((event, eventIndex) => {
        positions.set(`${shot.id}:${event.id}`, {
          eventName: event.name,
          isSubEvent: false,
          order: [shotIndex, slotIndex, eventIndex, 0],
          parentEventName: event.name,
          shotName: shot.name,
          timeSlotName: slot.name,
        })
        event.subEvents.forEach((subEvent, subEventIndex) => {
          positions.set(`${shot.id}:${subEvent.id}`, {
            eventName: subEvent.name,
            isSubEvent: true,
            order: [shotIndex, slotIndex, eventIndex, subEventIndex + 1],
            parentEventName: event.name,
            shotName: shot.name,
            timeSlotName: slot.name,
          })
        })
      })
    })
  })

  return assets
    .filter((asset) => asset.step === 7 && asset.media_type === 'video' && asset.shot_id && asset.event_id)
    .flatMap((asset) => {
      const position = positions.get(`${asset.shot_id}:${asset.event_id}`)
      return position ? [{ asset, ...position }] : []
    })
    .sort((left, right) => {
      for (let index = 0; index < left.order.length; index += 1) {
        const difference = left.order[index] - right.order[index]
        if (difference) return difference
      }
      const versionDifference = left.asset.version - right.asset.version
      return versionDifference || left.asset.created_at.localeCompare(right.asset.created_at)
    })
    .map((item) => ({
      asset: item.asset,
      eventName: item.eventName,
      isSubEvent: item.isSubEvent,
      parentEventName: item.parentEventName,
      shotName: item.shotName,
      timeSlotName: item.timeSlotName,
    }))
}
