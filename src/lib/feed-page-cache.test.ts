import { describe, expect, it } from 'vitest'
import { mergeFeedPage, editCachedFeedEntry, removeCachedFeedEntry, addCachedFeedReply } from './feed-page-cache'
import type { FeedEntry, FeedPage } from './voyager-feed'

const entry = (id: string): FeedEntry => ({ id, author_id:'author', parent_id:null, body:id, image_path:null, created_at:'2026-10-28T00:00:00Z', updated_at:'2026-10-28T00:00:00Z', display_name:'Author', avatar_url:null, author_role:'voyager', like_count:0, reply_count:0, liked:false, down_count:0, downvoted:false })
const page = (ids: string[], next: string | null = null, viewerId = 'alice'): FeedPage => ({ viewer:{id:viewerId,role:'voyager',registered_at:'2026-10-28',display_name:'Viewer',avatar_url:null}, locked:false, entries:ids.map(entry), next:next ? {id:next,created_at:'2026-10-28T00:00:00Z'} : null })

describe('feed return restoration', () => {
  it('refreshes the first page and retains the loaded tail and cursor', () => {
    const previous = page(['a','b','c','d'], 'd')
    const fresh = page(['new','a','c'], 'c')
    const merged = mergeFeedPage(previous, fresh)
    expect(merged.entries.map(value => value.id)).toEqual(['new','a','c','d'])
    expect(merged.next).toEqual(previous.next)
  })

  it('does not keep deleted items from the refreshed head', () => {
    const merged = mergeFeedPage(page(['a','deleted','c','d']), page(['a','c'], 'c'))
    expect(merged.entries.map(value => value.id)).toEqual(['a','c','d'])
  })

  it('drops a disconnected tail rather than creating a gap in pagination', () => {
    const fresh = page(['new','newer'], 'newer')
    expect(mergeFeedPage(page(['a','b','c']), fresh)).toBe(fresh)
  })

  it('accepts an exhausted refresh and removes the old tail', () => {
    const fresh = page(['a'])
    expect(mergeFeedPage(page(['a','b','c']), fresh)).toBe(fresh)
  })

  it('deduplicates page overlap on load more', () => {
    const merged = mergeFeedPage(page(['a','b'], 'b'), page(['b','c'], 'c'), true)
    expect(merged.entries.map(value => value.id)).toEqual(['a','b','c'])
    expect(merged.next?.id).toBe('c')
  })

  it('never restores old private entries across accounts or a locked response', () => {
    const previous = page(['private'], 'private')
    const other = page(['other'], 'other', 'bob')
    expect(mergeFeedPage(previous, other)).toBe(other)
    const locked = { ...page([]), locked:true }
    expect(mergeFeedPage(previous, locked)).toBe(locked)
  })
})

describe('confirmed writes outside the first page', () => {
  it('retains an edit in the cached tail after refreshing the head', () => {
    const edited = editCachedFeedEntry(page(['a','b','c','d']), 'd', 'edited body')
    const refreshed = mergeFeedPage(edited, page(['a','b'], 'b'))
    expect(refreshed.entries.at(-1)?.body).toBe('edited body')
  })
  it('does not resurrect a deleted tail entry during revalidation', () => {
    const previous = page(['a','b','c','d'])
    const removed = removeCachedFeedEntry(previous, previous.entries[3])
    expect(mergeFeedPage(removed, page(['a','b'], 'b')).entries.map(value => value.id)).toEqual(['a','b','c'])
  })
  it('updates the parent reply count in both list and detail snapshots', () => {
    const previous = { ...page(['a','b']), post:entry('b') }
    const added = addCachedFeedReply(previous, 'b')
    expect(added.entries[1].reply_count).toBe(1)
    expect(added.post?.reply_count).toBe(1)
    const removed = removeCachedFeedEntry(added, {...entry('reply'),parent_id:'b'})
    expect(removed.entries[1].reply_count).toBe(0)
    expect(removed.post?.reply_count).toBe(0)
  })
})
