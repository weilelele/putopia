import { describe, expect, it } from 'vitest'
import { isDeletionConfirmed, planCommentCleanup, tombstoneEmail } from '@/lib/account-deletion-model'

describe('account deletion model', () => {
  it('needs the typed word', () => {
    expect(isDeletionConfirmed('DELETE')).toBe(true)
    expect(isDeletionConfirmed(' delete ')).toBe(true)
    expect(isDeletionConfirmed('delet')).toBe(false)
    expect(isDeletionConfirmed(undefined)).toBe(false)
  })
  it('builds an address that can never receive mail', () => {
    expect(tombstoneEmail('u1')).toBe('deleted-u1@deleted.invalid')
  })
  it('blanks only comments that others replied to', () => {
    const plan = planCommentCleanup(['a', 'b', 'c'], [null, 'a', 'x', 'a'])
    expect(plan).toEqual({ remove: ['b', 'c'], blank: ['a'] })
  })
})
