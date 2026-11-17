import { describe, expect, it } from 'vitest'
import { getArchivedMissionPreview, getCurrentMissionBriefing, getPublicMissionEdition } from './mission-board'

const sunday = Date.parse('2026-11-15T23:59:59.999+08:00')

describe('Mission Board editions', () => {
  it('publishes three or four weekly missions at the Shanghai Monday boundary', () => {
    const first = getPublicMissionEdition(sunday)
    const second = getPublicMissionEdition(sunday + 1)
    expect(first.missions.map(mission => mission.id)).toEqual(['REC-118', 'CNT-074', 'OBS-203'])
    expect(second.startsAt).toBe('2026-11-15T16:00:00.000Z')
    expect(second.missions.map(mission => mission.id)).toEqual(['REC-120', 'CNT-076', 'OBS-205'])
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

  it('resolves archived links to the original public previews only', () => {
    const thirdEdition = sunday + 1 + 7 * 24 * 60 * 60 * 1000
    const launchMissions = getPublicMissionEdition(sunday + 1).missions
    for (const mission of launchMissions) {
      expect(getArchivedMissionPreview(mission.id, thirdEdition)).toEqual(mission)
      expect(getArchivedMissionPreview(mission.id, thirdEdition - 1)).toBeUndefined()
    }
    expect(getArchivedMissionPreview('OBS-204', thirdEdition)).toBeUndefined()
    expect(getArchivedMissionPreview('REC-99999', thirdEdition)).toBeUndefined()
  })

  it('keeps the withdrawn mission unavailable both during and after the edition', () => {
    const startsAt = sunday + 1
    expect(getCurrentMissionBriefing('OBS-206', startsAt)).toBeNull()
    expect(getArchivedMissionPreview('OBS-206', startsAt + 7 * 24 * 60 * 60 * 1000)).toBeUndefined()
  })

  it('keeps all three types and can select any type for the optional fourth slot', () => {
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const sizes = new Set<number>()
    const extras = new Set<string>()
    for (let week = 0; week < 53; week++) {
      const now = sunday + week * weekMs
      const { missions } = getPublicMissionEdition(now)
      expect(getPublicMissionEdition(now - 1_000).missions).toEqual(missions)
      expect(missions.slice(0, 3).map(mission => mission.series)).toEqual(['REC', 'CNT', 'OBS'])
      sizes.add(missions.length)
      if (missions[3]) extras.add(missions[3].series)
    }
    expect(sizes).toEqual(new Set([3, 4]))
    expect(extras).toEqual(new Set(['REC', 'CNT', 'OBS']))
  })

  it('puts every frequency in its teaser and shows two images in the launch week', () => {
    const edition = getPublicMissionEdition(sunday + 1)
    expect(edition.missions.map(mission => [mission.id, mission.teaser.frequency])).toEqual([
      ['REC-120', '97.3'], ['CNT-076', '112.3–112.5'], ['OBS-205', '93.6'],
    ])
    expect(edition.missions.filter(mission => mission.image).map(mission => mission.id)).toEqual(['CNT-076', 'OBS-205'])
    expect(getPublicMissionEdition(Date.parse('2026-12-07T00:00:00+08:00')).missions.some(mission => mission.image)).toBe(false)
  })
})
