import { describe, expect, it } from 'vitest'
import { accessRole, normalizeVoteScope, voteSubmissionError, validAnonymousVoteToken } from './digital-access'
const vote = { is_active: true, ends_at: null, scope: ['voyager'], type: 'single', options: [{ id: 'a' }, { id: 'b' }] }
describe('effective digital access and vote validation', () => {
  it('fails closed on absent or malformed access results', () => {
    expect(accessRole(null, true)).toBe('applicant')
    expect(accessRole('owner', false)).toBe('guest')
    expect(accessRole('voyager', true)).toBe('voyager')
  })
  it('does not broaden malformed scopes but keeps explicit guest/public access', () => {
    expect(normalizeVoteScope(null)).toEqual([])
    expect(normalizeVoteScope(['invalid'])).toEqual([])
    expect(normalizeVoteScope('public')).toContain('guest')
    expect(normalizeVoteScope(['guest'])).toEqual(['guest'])
    expect(normalizeVoteScope(['applicant'])).not.toContain('guest')
  })
  it('checks access rather than a displayed identity role', () => {
    expect(voteSubmissionError(vote, 'applicant', ['a'], 0)).toMatch(/membership/)
    expect(voteSubmissionError(vote, 'voyager', ['a'], 0)).toBeNull()
    expect(voteSubmissionError({ ...vote, scope: ['guest'] }, 'guest', ['a'], 0)).toBeNull()
  })
  it('rejects inactive votes, expiration including the exact boundary, and invalid dates', () => {
    expect(voteSubmissionError({ ...vote, is_active: false }, 'voyager', ['a'], 0)).toMatch(/closed/)
    for (const ends_at of ['1970-01-01T00:00:00Z', 'invalid']) expect(voteSubmissionError({ ...vote, ends_at }, 'voyager', ['a'], 0)).toMatch(/closed/)
  })
  it.each([[], ['a', 'b'], ['a', 'a'], ['missing'], [null], 'a'])('rejects invalid selection %j', selected => {
    expect(voteSubmissionError(vote, 'voyager', selected, 0)).not.toBeNull()
  })
  it('permits distinct multi options and rejects malformed option catalogs', () => {
    expect(voteSubmissionError({ ...vote, type: 'multi' }, 'voyager', ['b', 'a'], 0)).toBeNull()
    expect(voteSubmissionError({ ...vote, options: [{ id: 'a' }, { id: 'a' }] }, 'voyager', ['a'], 0)).not.toBeNull()
  })
  it('requires a bounded anonymous token', () => {
    expect(validAnonymousVoteToken('12345678-1234-1234-1234-123456789abc')).toBe(true)
    for (const token of [null, '', 'x', 'a'.repeat(129), '<script>'.repeat(4)]) expect(validAnonymousVoteToken(token)).toBe(false)
  })
})
