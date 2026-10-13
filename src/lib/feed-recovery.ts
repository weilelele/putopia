import { validFeedId } from './voyager-feed'
export const FEED_DRAFT_PREFIX = 'mc:feed-draft:v1:'
const OWNER = 'mc:feed-draft-owner:v1'
const TTL = 24 * 60 * 60 * 1000
export type FeedDraft = { id: string; body: string; authorId: string; updated: number; pending: boolean; attachment?: { name: string; size: number; hash: string }; original?: string }
export function parseFeedDraft(raw: string | null, now = Date.now()): FeedDraft | null {
  try {
    const value = JSON.parse(raw ?? 'null') as FeedDraft | null
    if (!value || !validFeedId(value.id) || !validFeedId(value.authorId) || typeof value.body !== 'string' || value.body.length > 500 || typeof value.pending !== 'boolean' || !Number.isFinite(value.updated) || value.updated > now + 60000) return null
    // An unresolved operation never silently becomes an unsubmitted/expired draft.
    if (!value.pending && now - value.updated > TTL) return null
    if (value.attachment && (typeof value.attachment.name !== 'string' || !Number.isFinite(value.attachment.size) || !/^[a-f0-9]{64}$/.test(value.attachment.hash))) return null
    if (value.original !== undefined && typeof value.original !== 'string') return null
    return value
  } catch { return null }
}
export function draftStorage() { try { return window.sessionStorage } catch { return null } }
export function syncFeedDraftAccount(storage: Storage | null, account: string | null) {
  if (!storage) return
  try {
    if (storage.getItem(OWNER) !== account) {
      for (let i = storage.length - 1; i >= 0; i--) { const key = storage.key(i); if (key?.startsWith(FEED_DRAFT_PREFIX)) storage.removeItem(key) }
    }
    if (account) storage.setItem(OWNER, account); else storage.removeItem(OWNER)
  } catch { /* Forms report unavailable storage when attempting to save. */ }
}
export function readFeedDraft(key: string): FeedDraft | null {
  try { const storage = draftStorage(); const draft = parseFeedDraft(storage?.getItem(FEED_DRAFT_PREFIX + key) ?? null); if (!draft) storage?.removeItem(FEED_DRAFT_PREFIX + key); return draft } catch { return null }
}
export function writeFeedDraft(key: string, value: FeedDraft | null): boolean {
  try { const storage = draftStorage(); if (!storage) return false; if (value) storage.setItem(FEED_DRAFT_PREFIX + key, JSON.stringify(value)); else storage.removeItem(FEED_DRAFT_PREFIX + key); return true } catch { return false }
}
export class FeedRequestTimeout extends Error { constructor() { super('The request took too long. Its result is not yet confirmed.'); } }
/** Ignore late responses without claiming to cancel a server-side mutation. */
export function boundedFeedRequest<T>(work: Promise<T>, milliseconds = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new FeedRequestTimeout()), milliseconds)
    work.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
  })
}
