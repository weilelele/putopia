import { describe, expect, it } from 'vitest'
import { canPublishAsNpc, canReadVoyagerFeed, canPublishVoyagerFeed, canManageFeedEntry, validateFeedBody, validateFeedCursor, validFeedId, type FeedViewer } from './voyager-feed'
const id = '10000000-0000-4000-8000-000000000001'
const viewer = (role: FeedViewer['role'], registered = true): FeedViewer => ({ id, role, registered_at: registered ? '2026-10-13T00:00:00Z' : null, display_name: 'Test', avatar_url: null })
describe('Voyager feed authorization', () => {
  it.each(['guest','applicant','voyager','architect'] as const)('denies unregistered %s', role => {
    expect(canReadVoyagerFeed(viewer(role,false))).toBe(false)
    expect(canPublishVoyagerFeed(viewer(role,false))).toBe(false)
    expect(canManageFeedEntry(viewer(role,false),id)).toBe(false)
  })
  it('never admits anonymous or guest viewers', () => { expect(canReadVoyagerFeed(null)).toBe(false); expect(canReadVoyagerFeed(viewer('guest'))).toBe(false) })
  it('lets applicants interact but not publish', () => { expect(canReadVoyagerFeed(viewer('applicant'))).toBe(true); expect(canPublishVoyagerFeed(viewer('applicant'))).toBe(false) })
  it.each(['voyager','architect'] as const)('lets %s publish without ownership override', role => {
    expect(canPublishVoyagerFeed(viewer(role))).toBe(true)
    expect(canManageFeedEntry(viewer(role),id)).toBe(true)
    expect(canManageFeedEntry(viewer(role),'other')).toBe(false)
  })
  it('lets applicants manage their own replies', () => { expect(canManageFeedEntry(viewer('applicant'),id)).toBe(true) })
})
describe('untrusted feed input', () => {
  it.each(['', '   ', 'a'.repeat(501), null, {}, 'bad\u0000text'])('rejects invalid body %s', value => expect(() => validateFeedBody(value)).toThrow())
  it('preserves multiline content and trims boundaries', () => expect(validateFeedBody('  first\nsecond  ')).toBe('first\nsecond'))
  it('accepts the limit', () => expect(validateFeedBody('x'.repeat(500))).toHaveLength(500))
  it('rejects query injection through IDs and cursors', () => {
    expect(validFeedId('x),id.neq.null')).toBe(false)
    expect(() => validateFeedCursor({ id, created_at: '2026-10-13),id.neq.null' })).toThrow()
    expect(() => validateFeedCursor({ id:'wrong', created_at:'2026-10-13T00:00:00Z' })).toThrow()
  })
  it('preserves microsecond cursor precision', () => {
    const cursor = { id, created_at:'2026-10-13T00:00:00.123456+00:00' }
    expect(validateFeedCursor(cursor)).toEqual(cursor)
  })
})

describe('NPC publishing eligibility', () => {
  it('requires a registered human Architect', () => {
    expect(canPublishAsNpc({...viewer('architect'), account_kind:'human'})).toBe(true)
    expect(canPublishAsNpc({...viewer('architect',false), account_kind:'human'})).toBe(false)
    expect(canPublishAsNpc({...viewer('architect'), account_kind:'npc'})).toBe(false)
    expect(canPublishAsNpc(viewer('architect'))).toBe(false)
    expect(canPublishAsNpc(null)).toBe(false)
  })
  it.each(['guest','applicant','voyager'] as const)('rejects %s even when human', role => {
    expect(canPublishAsNpc({...viewer(role), account_kind:'human'})).toBe(false)
  })
})
