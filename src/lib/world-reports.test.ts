import { describe, expect, it } from 'vitest'
import { aggregateReportStats } from './world-reports'

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
