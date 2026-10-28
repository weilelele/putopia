import type { FeedPage } from './voyager-feed'

/** Refresh the head without downloading every page just to restore scroll. */
export function mergeFeedPage(previous: FeedPage | undefined, fresh: FeedPage, append = false): FeedPage {
  if (!previous || fresh.locked || previous.viewer?.id !== fresh.viewer?.id) return fresh
  if (append) {
    const seen = new Set(previous.entries.map(entry => entry.id))
    return { ...fresh, entries: [...previous.entries, ...fresh.entries.filter(entry => !seen.has(entry.id))] }
  }
  if (!fresh.next) return fresh
  const anchor = previous.entries.findIndex(entry => entry.id === fresh.entries.at(-1)?.id)
  // No overlap means we cannot safely assume the old cursor still joins up.
  if (anchor < 0) return fresh
  const seen = new Set(fresh.entries.map(entry => entry.id))
  const tail = previous.entries.slice(anchor + 1).filter(entry => !seen.has(entry.id))
  return tail.length ? { ...fresh, entries: [...fresh.entries, ...tail], next: previous.next } : fresh
}

/** Apply confirmed writes to every loaded range before background revalidation. */
export function editCachedFeedEntry(page: FeedPage, id: string, body: string): FeedPage {
  const update = (entry: FeedPage['entries'][number]) => entry.id === id ? { ...entry, body } : entry
  return { ...page, entries: page.entries.map(update), post: page.post ? update(page.post) : page.post }
}

export function removeCachedFeedEntry(page: FeedPage, removed: FeedPage['entries'][number]): FeedPage {
  const update = (entry: FeedPage['entries'][number]) => entry.id === removed.parent_id ? { ...entry, reply_count: Math.max(0, entry.reply_count - 1) } : entry
  return { ...page, entries: page.entries.filter(entry => entry.id !== removed.id && entry.parent_id !== removed.id).map(update), post: page.post?.id === removed.id ? null : page.post ? update(page.post) : page.post }
}

export function addCachedFeedReply(page: FeedPage, parentId: string): FeedPage {
  const update = (entry: FeedPage['entries'][number]) => entry.id === parentId ? { ...entry, reply_count: entry.reply_count + 1 } : entry
  return { ...page, entries: page.entries.map(update), post: page.post ? update(page.post) : page.post }
}
