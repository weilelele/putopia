import type { WorldflowState } from '@/lib/actions/worldflow'

export type WorldflowMaterialTarget = {
  characterId?: string | null
  eventId?: string | null
  shotId?: string | null
}

export function isWorldflowMaterialTargetPersisted(
  state: WorldflowState | null,
  target: WorldflowMaterialTarget,
): boolean {
  if (!state) return false

  if (target.shotId && !state.shots.some((shot) => shot.id === target.shotId)) {
    return false
  }

  if (
    target.characterId &&
    !state.characters.some((character) => character.id === target.characterId)
  ) {
    return false
  }

  if (target.eventId) {
    if (!target.shotId) return false
    const eventExists = state.eventSystems[target.shotId]?.timeSlots.some((slot) =>
      slot.events.some(
        (event) =>
          event.id === target.eventId ||
          event.subEvents.some((subEvent) => subEvent.id === target.eventId),
      ),
    )
    if (!eventExists) return false
  }

  return true
}
