import { describe, expect, it } from 'vitest'
import { CHAT_PAGE_SIZE, isChatRoomId, makeChatPage, parseChatCursor, prependChatMessage, validateChatMessage } from './dreamcatcher-chat-model'
import type { Comment } from '@/types/database'

const ROOM = '002f5fd6-3cb4-450f-a43c-26decdc9fa97'
function message(index: number): Comment {
  return {
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    created_at: '2026-09-03T00:00:00.123456+00:00',
    subject_type: 'dreamcatcher', subject_id: ROOM, author_id: ROOM,
    author_name: 'Test user', author_avatar_url: null, body: `Message ${index}`,
    is_visible: true, parent_id: null, image_paths: [],
  }
}

describe('chat validation', () => {
  it('accepts only UUID device identifiers, never world IDs or query syntax', () => {
    expect(isChatRoomId(ROOM)).toBe(true)
    for (const id of ['london-01', 'PROP-EXAMPLE', 'id.eq.any', '', null, 123]) expect(isChatRoomId(id)).toBe(false)
  })
  it('rejects blank and non-text input', () => {
    for (const value of ['', ' \n ', null, {}, 2]) expect(validateChatMessage(value)).toBeTruthy()
  })
  it('accepts text without rewriting user content', () => {
    expect(validateChatMessage('  Hello, London! 梦  ')).toBeNull()
    expect(validateChatMessage('a'.repeat(2000))).toBeNull()
    expect(validateChatMessage('a'.repeat(2001))).toBeTruthy()
  })
})

describe('newest-first pagination', () => {
  it('keeps database descending order and excludes the lookahead row', () => {
    const rows = Array.from({ length: 51 }, (_, index) => message(51 - index))
    const page = makeChatPage(rows)
    expect(page.messages.map((row) => row.id)).toEqual(rows.slice(0, CHAT_PAGE_SIZE).map((row) => row.id))
    expect(parseChatCursor(page.nextCursor)).toEqual({ createdAt: rows[49].created_at, id: rows[49].id })
  })
  it('has no older page when all rows fit', () => {
    expect(makeChatPage([])).toEqual({ messages: [], nextCursor: null })
    expect(makeChatPage([message(1)]).nextCursor).toBeNull()
    expect(makeChatPage(Array.from({ length: 50 }, (_, i) => message(i))).nextCursor).toBeNull()
  })
  it('preserves microseconds so same-millisecond messages are not skipped', () => {
    const raw = `2026-09-03T00:00:00.123456+00:00|${ROOM}`
    expect(parseChatCursor(raw)?.createdAt).toBe('2026-09-03T00:00:00.123456+00:00')
    expect(parseChatCursor(null)).toBeNull()
  })
  it.each(['', `not-a-date|${ROOM}`, `2026-09-03T00:00:00Z|${ROOM}|extra`, `2026-09-03T00:00:00Z|x),id.gt.0`, `2026-09-03T99:00:00Z|${ROOM}`])('rejects malformed cursor %s', (value) => {
    expect(() => parseChatCursor(value)).toThrow('Invalid message cursor.')
  })
  it('deduplicates confirmed sends and bounds the live window', () => {
    const rows = Array.from({ length: 50 }, (_, i) => message(50 - i))
    expect(prependChatMessage(rows, rows[0])).toEqual(rows)
    const updated = prependChatMessage(rows, message(51))
    expect(updated).toHaveLength(50)
    expect(updated[0].id).toBe(message(51).id)
    expect(rows[0].id).toBe(message(50).id)
  })
})
