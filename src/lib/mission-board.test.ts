import { describe, expect, it } from 'vitest'
import { canAccessMissionBoard } from './mission-board'

describe('Mission Board access', () => {
  it('opens only for Voyager and Architect membership', () => {
    expect(canAccessMissionBoard('voyager')).toBe(true)
    expect(canAccessMissionBoard('architect')).toBe(true)
    for (const role of ['applicant', 'guest', 'admin', '', null, undefined]) {
      expect(canAccessMissionBoard(role)).toBe(false)
    }
  })
})
