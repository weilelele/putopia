import { describe, expect, it } from 'vitest'
import { contentDepth, createEngagementMeter, sectionVisible } from './initiation-engagement'

describe('initiation content measurement', () => {
  it('measures content against the clipped viewport, not the shell height', () => {
    expect(contentDepth(-1000, 4000, 600)).toBeCloseTo(40.05)
    expect(contentDepth(-3400, 4000, 600)).toBe(100)
    expect(contentDepth(0, 0, 600)).toBe(0)
    expect(sectionVisible(0, 1600, 0, 600)).toBe(true)
    expect(sectionVisible(500, 1600, 0, 600)).toBe(false)
    expect(sectionVisible(0, 0, 0, 600)).toBe(false)
  })
  it('requires continuous visibility, excludes interruptions, and flushes only deltas', () => {
    const events: [string, Record<string, unknown>][] = []
    const meter = createEngagementMeter((event, props) => events.push([event, props]))
    meter.sample(0, ['pack_3'], 40, true)
    meter.sample(500, ['pack_3'], 40, true)
    meter.sample(750, ['pack_3'], 90, false)
    meter.sample(10000, ['pack_3'], 40, true)
    meter.sample(10500, ['pack_3'], 40, true)
    expect(events.filter(([e]) => e === 'initiation_section_viewed')).toHaveLength(0)
    meter.sample(11000, ['pack_3'], 55, true)
    expect(events.filter(([e]) => e === 'initiation_section_viewed')).toHaveLength(1)
    meter.flush(); meter.flush()
    expect(events.filter(([e]) => e === 'initiation_section_dwell')).toEqual([
      ['initiation_section_dwell', { section: 'pack_3', active_ms: 1500, total_active_ms: 1500, max_depth_percent: 55 }],
    ])
    expect(events.filter(([e]) => e === 'initiation_scroll_depth').map(([,p]) => p.depth_percent)).toEqual([25, 50])
    meter.sample(11500, ['pack_3'], 100, true)
    meter.sample(12000, ['pack_3'], 100, true)
    meter.flush()
    expect(events.at(-1)?.[1].active_ms).toBe(1000)
    expect(events.filter(([e]) => e === 'initiation_scroll_depth')).toHaveLength(5)
  })
  it('does not count time before a section becomes visible or a long stalled timer', () => {
    const events: [string, Record<string, unknown>][] = []
    const meter = createEngagementMeter((event, props) => events.push([event, props]))
    meter.sample(0, ['intro'], 10, true)
    meter.sample(10000, ['payment'], 90, true)
    meter.flush()
    expect(events.some(([e]) => e === 'initiation_section_dwell')).toBe(false)
    meter.sample(20000, ['payment'], 90, true)
    meter.flush()
    expect(events.at(-1)?.[1].active_ms).toBe(1000)
  })
})
