import { describe, expect, it } from 'vitest'
import { aggregateReportStats, validateDesignation } from './world-reports'

describe('aggregateReportStats', () => {
  it('counts distinct observers and every anomaly per world', () => {
    const stats = aggregateReportStats([
      { world_id: 'A', kind: 'observation', author_id: 'u1' },
      { world_id: 'A', kind: 'observation', author_id: 'u1' },
      { world_id: 'A', kind: 'observation', author_id: 'u2' },
      { world_id: 'A', kind: 'anomaly', author_id: 'u1' },
      { world_id: 'A', kind: 'anomaly', author_id: 'u1' },
      { world_id: 'B', kind: 'anomaly', author_id: 'u3' },
    ])
    expect(stats.A).toEqual({ seen: 2, anomalies: 2 })
    expect(stats.B).toEqual({ seen: 0, anomalies: 1 })
  })
})

describe('validateDesignation', () => {
  const world = { id: 'WLD-1', lifecycle_state: 'stable' }
  const ok = { world_id: 'WLD-1', kind: 'observation', is_visible: true }
  it('accepts a visible observation of an official world', () => {
    expect(validateDesignation(world, ok)).toBeNull()
  })
  it('rejects user worlds, other worlds, anomalies, hidden and missing reports', () => {
    expect(validateDesignation({ id: 'PROP-1', lifecycle_state: 'stable' }, { ...ok, world_id: 'PROP-1' })).toMatch(/official/)
    expect(validateDesignation(world, { ...ok, world_id: 'WLD-2' })).toMatch(/belong/)
    expect(validateDesignation(world, { ...ok, kind: 'anomaly' })).toMatch(/observation/)
    expect(validateDesignation(world, { ...ok, is_visible: false })).toMatch(/hidden/)
    expect(validateDesignation(world, null)).toMatch(/belong/)
  })
})
