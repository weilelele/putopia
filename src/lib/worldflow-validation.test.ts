import { describe, expect, it } from 'vitest'
import type { WorldflowState } from '@/lib/actions/worldflow'
import { validateWorldflowSubmission } from './worldflow-validation'

const state: WorldflowState = {
  worldBible: '', worldRules: '', coreConflict: '', visualDirection: '',
  characters: [{ id: 'character-a', name: '阿澈', description: '记录城市梦境的观察者', environment: '', motivation: '' }],
  shots: [{ id: 'shot-a', name: '镜头 A', description: '' }],
  eventSystems: {},
  stepStatuses: { '3': 'draft', '4': 'draft' },
}

describe('validateWorldflowSubmission', () => {
  it('requires an image for every shot in step 3', () => {
    expect(validateWorldflowSubmission(3, state, [])).toContain('镜头 A')
    expect(validateWorldflowSubmission(3, state, [{ character_id: null, media_type: 'image', shot_id: 'shot-a' }])).toBeNull()
  })

  it('requires a description and image for every configured character', () => {
    expect(validateWorldflowSubmission(4, state, [])).toContain('阿澈')
    expect(validateWorldflowSubmission(4, state, [{ character_id: 'character-a', media_type: 'image', shot_id: null }])).toBeNull()
    expect(validateWorldflowSubmission(4, {
      ...state,
      characters: [{ ...state.characters[0], description: '' }],
    }, [{ character_id: 'character-a', media_type: 'image', shot_id: null }])).toContain('角色描述')
  })

  it('keeps the character step optional', () => {
    expect(validateWorldflowSubmission(4, {
      ...state,
      stepStatuses: { ...state.stepStatuses, '4': 'skipped' },
    }, [])).toBeNull()
  })
})
