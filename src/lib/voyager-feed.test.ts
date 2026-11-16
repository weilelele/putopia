import { describe, expect, it } from 'vitest'
import { canPublishAsNpc, canReadVoyagerFeed, canPublishVoyagerFeed, canManageFeedEntry, validateFeedBody, validateFeedCursor, validFeedId, splitFeedMissionLink, withFeedVote, type FeedEntry, type FeedViewer } from './voyager-feed'
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

describe('feed votes', () => {
  const entry: FeedEntry = { id, author_id:id, parent_id:null, body:'Hello', image_path:null,
    created_at:'2026-10-14T00:00:00Z', updated_at:'2026-10-14T00:00:00Z',
    display_name:'Test', avatar_url:null, author_role:'voyager',
    like_count:5, down_count:2, reply_count:0, liked:false, downvoted:false }
  it('switches and cancels without changing other users votes', () => {
    const up = withFeedVote(entry, 1)
    expect(up).toMatchObject({like_count:6,down_count:2,liked:true,downvoted:false})
    const down = withFeedVote(up, -1)
    expect(down).toMatchObject({like_count:5,down_count:3,liked:false,downvoted:true})
    expect(withFeedVote(down, 0)).toEqual(entry)
  })
  it.each([-1,0,1] as const)('does not count repeated absolute vote %s twice', vote => {
    const once = withFeedVote(entry, vote)
    expect(withFeedVote(once, vote)).toEqual(once)
  })
})

describe('mission links in Feed posts', () => {
  it('separates the briefing action from the plain-text post body', () => {
    expect(splitFeedMissionLink('Check the middle clock.\n\nhttps://www.multiverseco.org/console?mission=REC-120#mission-board')).toEqual({
      text: 'Check the middle clock.',
      mission: { id: 'REC-120', href: '/console?mission=REC-120#mission-board' },
    })
  })

  it.each([
    'https://elsewhere.example/console?mission=REC-120#mission-board',
    'https://www.multiverseco.org/console?mission=REC-120&highlights=1#mission-board',
    'See https://www.multiverseco.org/console?mission=REC-120#mission-board.',
  ])('keeps nonmatching links as plain text', body => {
    expect(splitFeedMissionLink(body)).toEqual({ text: body, mission: null })
  })
})
