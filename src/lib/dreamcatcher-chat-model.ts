import type { Comment } from '@/types/database'

export const CHAT_PAGE_SIZE = 50
export const CHAT_MAX_LENGTH = 2000
export const CHAT_POLL_MS = 10_000
export const CHAT_COOLDOWN_MS = 5_000

export type ChatCursor = { createdAt: string; id: string }
export type ChatPage = { messages: Comment[]; nextCursor: string | null }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isChatRoomId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

export function validateChatMessage(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return 'Write a message first.'
  if (value.trim().length > CHAT_MAX_LENGTH) return `Keep your message within ${CHAT_MAX_LENGTH} characters.`
  return null
}

export function parseChatCursor(value: string | null): ChatCursor | null {
  if (value === null) return null
  const [createdAt, id, extra] = value.split('|')
  // Keep Postgres microseconds intact; never interpolate arbitrary filter syntax.
  if (extra !== undefined || !isChatRoomId(id)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(createdAt)
    || !Number.isFinite(Date.parse(createdAt))) throw new Error('Invalid message cursor.')
  return { createdAt, id }
}

export function makeChatPage(rows: Comment[]): ChatPage {
  const messages = rows.slice(0, CHAT_PAGE_SIZE)
  const last = messages.at(-1)
  return { messages, nextCursor: rows.length > CHAT_PAGE_SIZE && last ? `${last.created_at}|${last.id}` : null }
}

/** A confirmed send appears immediately; repeated refresh/send results dedupe. */
export function prependChatMessage(messages: Comment[], message: Comment): Comment[] {
  return [message, ...messages.filter((item) => item.id !== message.id)].slice(0, CHAT_PAGE_SIZE)
}
