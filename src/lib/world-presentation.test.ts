import { describe, expect, it } from 'vitest'
import { FUZZY_TAG, WORLD_TAGS, isFuzzyWorld, isOfficialWorld, orderedFilterTags, publicName, worldByline, worldTags } from './world-presentation'

describe('world presentation', () => {
  it('only an unobserved official world is fuzzy', () => {
    expect(isOfficialWorld('WLD-111')).toBe(true)
    expect(isFuzzyWorld('WLD-111', null)).toBe(true)
    expect(isFuzzyWorld('WLD-111', { id: 'u' })).toBe(false)
    expect(isFuzzyWorld('PROP-ABC', null)).toBe(false)
  })
  it('credits the discoverer for user worlds and the first observer for official ones', () => {
    const user = { id: 'PROP-1', discoverer_id: 'u1', discoverer_name: 'zj0ker20' }
    expect(worldByline(user, { id: 'o1', name: 'Mako' })).toEqual({ name: 'zj0ker20', profileId: 'u1', pending: false })
    const official = { id: 'WLD-1', discoverer_id: null, discoverer_name: 'x' }
    expect(worldByline(official, { id: 'o1', name: 'Mako' })).toEqual({ name: 'Mako', profileId: 'o1', pending: false })
    expect(worldByline(official, null).pending).toBe(true)
  })
  it('reads what a world contains, never a genre, and adds FUZZY SIGNAL when asked', () => {
    const world = { id: 'PROP-1', name: 'The Lost Lake', description: 'Rocks, sand, the crashing of waves on an abandoned shore.' }
    expect(worldTags(world)).toEqual(expect.arrayContaining(['WILD', 'WATERS', 'RUINS']))
    expect(worldTags(world, true)[0]).toBe(FUZZY_TAG)
    expect(worldTags({ id: 'PROP-2', name: 'zzz', description: 'qqq' })).toEqual([])
    expect(WORLD_TAGS).toHaveLength(7)
    expect(WORLD_TAGS.join(' ')).not.toMatch(/SCI|FANTASY/)
  })
  it('puts FUZZY SIGNAL right after ALL in the filter order', () => {
    expect(orderedFilterTags(['WATERS', FUZZY_TAG, 'RUINS'])).toEqual([FUZZY_TAG, 'RUINS', 'WATERS'])
  })
  it('never exposes an email', () => {
    expect(publicName('a@b.com')).toBe('a')
  })
})
