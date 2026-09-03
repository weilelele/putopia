import { describe, expect, it } from 'vitest'
import { isPublicationInput, publicDreamcatchers } from './dreamcatcher-publication'

const id = 'dd62c171-740b-4625-90a9-239338401a87'

describe('Dreamcatcher publication', () => {
  it('accepts publishing and unpublishing an exact device', () => {
    expect(isPublicationInput({ id, isPublic: true, expectedIsPublic: false })).toBe(true)
    expect(isPublicationInput({ id, isPublic: false, expectedIsPublic: true })).toBe(true)
  })
  it.each([null, undefined, {}, { id: 'kyoto-02', isPublic: true, expectedIsPublic: false },
    { id, isPublic: 'false', expectedIsPublic: true }, { id, isPublic: true },
    { id, isPublic: true, expectedIsPublic: true }])('rejects malformed or no-op change: %j', (input) => {
    expect(isPublicationInput(input)).toBe(false)
  })
  it('never recreates example devices when all devices are unpublished', () => {
    expect(publicDreamcatchers([])).toEqual([])
    expect(publicDreamcatchers([{ is_public: false }])).toEqual([])
  })
  it('filters by publication without changing paused or offline runtime state', () => {
    const paused = { id: 'a', is_public: true, status: 'paused' }
    const offline = { id: 'b', is_public: true, status: 'offline' }
    const hidden = { id: 'c', is_public: false, status: 'processing' }
    expect(publicDreamcatchers([hidden, paused, offline])).toEqual([paused, offline])
    expect(hidden.status).toBe('processing')
  })
})
