import { describe, expect, it } from 'vitest'
import { webhookErrorMessage } from './webhook-error'

describe('webhook failure message', () => {
  it('keeps the reason from a PostgREST error object', () => {
    expect(webhookErrorMessage({ code: '42501', message: 'permission denied for sequence voyager_member_no_seq', details: null, hint: null }))
      .toBe('42501: permission denied for sequence voyager_member_no_seq')
    expect(webhookErrorMessage({ message: 'Capacity requires reconciliation' })).toBe('Capacity requires reconciliation')
  })
  it('uses Error messages and falls back for anything else', () => {
    expect(webhookErrorMessage(new Error('Initiation intent binding mismatch'))).toBe('Initiation intent binding mismatch')
    for (const value of [null, undefined, 'text', 42, {}, { message: '' }]) expect(webhookErrorMessage(value)).toBe('Unknown webhook failure')
  })
})
