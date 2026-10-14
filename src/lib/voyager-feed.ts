import type { UserRole } from '@/types/database'

export type FeedViewer = { id: string; account_kind?: 'human' | 'npc'; role: UserRole; registered_at: string | null; display_name: string; avatar_url: string | null }
export type FeedEntry = {
  id: string; author_id: string; parent_id: string | null; body: string; image_path: string | null
  created_at: string; updated_at: string; display_name: string; avatar_url: string | null
  can_manage?: boolean; author_role: UserRole; like_count: number; reply_count: number; liked: boolean; down_count: number; downvoted: boolean
}
export type FeedCursor = { created_at: string; id: string }
export type FeedPage = { viewer: FeedViewer | null; entries: FeedEntry[]; next: FeedCursor | null; locked: boolean; post?: FeedEntry | null }
export const FEED_LIMIT = 20
export const FEED_TEXT_LIMIT = 500
export const validFeedId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
export function canReadVoyagerFeed(viewer: FeedViewer | null): boolean {
  return Boolean(viewer?.registered_at && ['applicant', 'voyager', 'architect'].includes(viewer.role))
}
export function canPublishVoyagerFeed(viewer: FeedViewer | null): boolean {
  return canReadVoyagerFeed(viewer) && (viewer?.role === 'voyager' || viewer?.role === 'architect')
}
export function canManageFeedEntry(viewer: FeedViewer | null, authorId: string): boolean {
  return canReadVoyagerFeed(viewer) && viewer?.id === authorId
}
export function validateFeedBody(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > FEED_TEXT_LIMIT || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('Enter between 1 and 500 characters.')
  return value.trim()
}
export function validateFeedCursor(cursor?: FeedCursor): FeedCursor | undefined {
  if (!cursor) return undefined
  if (!validFeedId(cursor.id) || !/^\d{4}-\d\d-\d\dT[\d:.]+(?:Z|[+-]\d\d:\d\d)$/.test(cursor.created_at) || !Number.isFinite(Date.parse(cursor.created_at))) throw new Error('Invalid page cursor.')
  return cursor
}

export function canPublishAsNpc(viewer: FeedViewer | null): boolean {
  return canReadVoyagerFeed(viewer) && viewer?.role === 'architect' && viewer.account_kind === 'human'
}

export type FeedVote = -1 | 0 | 1
export function withFeedVote(entry: FeedEntry, vote: FeedVote): FeedEntry {
  return { ...entry, liked: vote === 1, downvoted: vote === -1,
    like_count: Math.max(0, entry.like_count + Number(vote === 1) - Number(entry.liked)),
    down_count: Math.max(0, (entry.down_count ?? 0) + Number(vote === -1) - Number(entry.downvoted ?? false)) }
}
