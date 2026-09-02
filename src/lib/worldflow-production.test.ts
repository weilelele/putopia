import { describe, expect, it } from 'vitest'
import type { WorldflowAsset, WorldflowState } from '@/lib/actions/worldflow'
import { buildWorldflowVideoSequence } from '@/lib/worldflow-production'

const state: WorldflowState = {
  worldBible: '',
  worldRules: '',
  coreConflict: '',
  visualDirection: '',
  characters: [],
  shots: [
    { id: 'shot-b', name: '镜头 B', description: '' },
    { id: 'shot-a', name: '镜头 A', description: '' },
  ],
  eventSystems: {
    'shot-b': {
      version: 1,
      timeSlots: [
        {
          id: 'night',
          name: '夜晚',
          events: [
            {
              id: 'parent',
              name: '散步',
              description: '',
              subEvents: [{ id: 'sub', name: '停下', description: '' }],
            },
          ],
        },
      ],
    },
    'shot-a': {
      version: 1,
      timeSlots: [
        {
          id: 'dawn',
          name: '清晨',
          events: [{ id: 'wake', name: '醒来', description: '', subEvents: [] }],
        },
      ],
    },
  },
  stepStatuses: {},
}

function asset(id: string, patch: Partial<WorldflowAsset>): WorldflowAsset {
  return {
    id,
    world_id: 'world',
    uploaded_by: 'user',
    step: 7,
    shot_id: 'shot-b',
    event_id: 'parent',
    character_id: null,
    media_type: 'video',
    file_name: id,
    public_url: `/asset/${id}`,
    file_size: null,
    mime_type: 'video/mp4',
    version: 1,
    source_type: 'cloud',
    source_provider: 'signal_task_assets',
    source_asset_id: id,
    source_url: `https://example.com/${id}.mp4`,
    created_at: '2026-08-17T00:00:00.000Z',
    ...patch,
  }
}

describe('buildWorldflowVideoSequence', () => {
  it('orders linked Step 7 videos by shot, time and event hierarchy', () => {
    const sequence = buildWorldflowVideoSequence(state, [
      asset('later-shot', { shot_id: 'shot-a', event_id: 'wake' }),
      asset('sub', { event_id: 'sub' }),
      asset('parent-v2', { version: 2 }),
      asset('parent-v1', {}),
    ])
    expect(sequence.map((item) => item.asset.id)).toEqual(['parent-v1', 'parent-v2', 'sub', 'later-shot'])
    expect(sequence[2]).toMatchObject({
      eventName: '停下',
      isSubEvent: true,
      parentEventName: '散步',
    })
  })

  it('excludes orphaned, non-video and non-Step-7 assets', () => {
    const sequence = buildWorldflowVideoSequence(state, [asset('orphan', { event_id: 'deleted' }), asset('image', { media_type: 'image' }), asset('step-six', { step: 6 })])
    expect(sequence).toEqual([])
  })
})
