import { describe, expect, it } from 'vitest'
import type { WorldflowState } from '@/lib/actions/worldflow'
import { isWorldflowMaterialTargetPersisted } from '@/lib/worldflow-material-target'

const state = {
  characters: [
    {
      description: '',
      environment: '',
      id: 'character-1',
      motivation: '',
      name: '角色一',
    },
  ],
  coreConflict: '',
  eventSystems: {
    'shot-1': {
      version: 1,
      timeSlots: [
        {
          id: 'slot-1',
          name: '清晨',
          events: [
            {
              description: '',
              id: 'event-1',
              name: '事件一',
              subEvents: [
                { description: '', id: 'sub-event-1', name: '子事件一' },
              ],
            },
          ],
        },
      ],
    },
  },
  shots: [{ description: '', id: 'shot-1', name: '镜头一' }],
  stepStatuses: {},
  visualDirection: '',
  worldBible: '',
  worldRules: '',
} satisfies WorldflowState

describe('isWorldflowMaterialTargetPersisted', () => {
  it('does not require a save when the material has no structural target', () => {
    expect(isWorldflowMaterialTargetPersisted(state, {})).toBe(true)
  })

  it('recognizes persisted shots, characters, parent events, and sub-events', () => {
    expect(
      isWorldflowMaterialTargetPersisted(state, { shotId: 'shot-1' }),
    ).toBe(true)
    expect(
      isWorldflowMaterialTargetPersisted(state, { characterId: 'character-1' }),
    ).toBe(true)
    expect(
      isWorldflowMaterialTargetPersisted(state, {
        eventId: 'event-1',
        shotId: 'shot-1',
      }),
    ).toBe(true)
    expect(
      isWorldflowMaterialTargetPersisted(state, {
        eventId: 'sub-event-1',
        shotId: 'shot-1',
      }),
    ).toBe(true)
  })

  it('requires a save for newly created structural targets', () => {
    expect(
      isWorldflowMaterialTargetPersisted(state, { shotId: 'shot-new' }),
    ).toBe(false)
    expect(
      isWorldflowMaterialTargetPersisted(state, { characterId: 'character-new' }),
    ).toBe(false)
    expect(
      isWorldflowMaterialTargetPersisted(state, {
        eventId: 'event-new',
        shotId: 'shot-1',
      }),
    ).toBe(false)
  })
})
