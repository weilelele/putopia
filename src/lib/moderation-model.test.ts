import { describe, expect, it } from 'vitest'
import { NOTHING_HIDDEN, dropHiddenComments, dropHiddenWorldReports, validateReport } from '@/lib/moderation-model'

const c = (id: string, author_id: string | null, parent_id: string | null = null) => ({ id, author_id, parent_id })

describe('validateReport', () => {
  it('requires a known reason', () => {
    expect(validateReport(undefined, null)).toMatch(/reason/)
    expect(validateReport('nope', null)).toMatch(/reason/)
    expect(validateReport('spam', null)).toBeNull()
  })
  it('caps the details length', () => {
    expect(validateReport('other', 'x'.repeat(500))).toBeNull()
    expect(validateReport('other', 'x'.repeat(501))).toMatch(/500/)
    expect(validateReport('other', 42)).toMatch(/text/)
  })
})

describe('dropHiddenComments', () => {
  const list = [c('1', 'a'), c('2', 'b'), c('3', 'c', '1'), c('4', 'b', '3'), c('5', null)]
  it('returns everything when nothing is hidden', () => {
    expect(dropHiddenComments(list, NOTHING_HIDDEN)).toHaveLength(5)
  })
  it('drops blocked authors', () => {
    const ids = dropHiddenComments(list, { ...NOTHING_HIDDEN, authorIds: new Set(['b']) }).map((x) => x.id)
    expect(ids).toEqual(['1', '3', '5'])
  })
  it('drops a reported comment together with its replies', () => {
    const ids = dropHiddenComments(list, { ...NOTHING_HIDDEN, commentIds: new Set(['1']) }).map((x) => x.id)
    expect(ids).toEqual(['2', '5'])
  })
})

describe('dropHiddenWorldReports', () => {
  const reports = [{ id: 'r1', author_id: 'a' }, { id: 'r2', author_id: 'b' }, { id: 'r3', author_id: 'c' }]
  it('drops blocked authors and reported reports', () => {
    const hidden = { ...NOTHING_HIDDEN, authorIds: new Set(['a']), worldReportIds: new Set(['r3']) }
    expect(dropHiddenWorldReports(reports, hidden).map((r) => r.id)).toEqual(['r2'])
    expect(dropHiddenWorldReports(reports, NOTHING_HIDDEN)).toHaveLength(3)
  })
})
