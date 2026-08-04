import { describe, expect, it } from 'vitest'
import { STORY_BLUEPRINTS } from './story-blueprints'

describe('Story Lab language', () => {
  it('keeps every user-visible blueprint string in English', () => {
    const serializedBlueprints = JSON.stringify(STORY_BLUEPRINTS)

    expect(serializedBlueprints).not.toMatch(/[\u3400-\u9fff]/u)
  })
})
