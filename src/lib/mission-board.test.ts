import { describe, expect, it } from 'vitest'
import { getCurrentMissionBriefing, getPublicMissionEdition } from './mission-board'

const sunday = Date.parse('2026-11-15T23:59:59.999+08:00')

describe('Mission Board editions', () => {
  it('publishes three or four weekly missions at the Shanghai Monday boundary', () => {
    const first = getPublicMissionEdition(sunday)
    const second = getPublicMissionEdition(sunday + 1)
    expect(first.missions.map(mission => mission.id)).toEqual(['REC-118', 'CNT-074', 'OBS-203'])
    expect(second.startsAt).toBe('2026-11-15T16:00:00.000Z')
    expect(second.missions).toHaveLength(4)
    expect(second.missions.some(mission => first.missions.some(old => old.id === mission.id))).toBe(false)
  })

  it('provides only public fields in the edition and closes old briefings', () => {
    const first = getPublicMissionEdition(sunday).missions[0]
    const briefing = getCurrentMissionBriefing(first.id, sunday)
    expect(briefing).toMatch(/Sweep 0\.2/)
    expect(first).not.toHaveProperty('briefing')
    expect(JSON.stringify(first)).not.toContain(briefing!)
    expect(getCurrentMissionBriefing(first.id, sunday + 1)).toBeNull()
    expect(getCurrentMissionBriefing('REC-999', sunday)).toBeNull()
  })

  it('keeps mission identifiers unique as the story library cycles', () => {
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const ids = Array.from({ length: 53 }, (_, week) => getPublicMissionEdition(sunday + week * weekMs).missions)
      .flat().map(mission => mission.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
