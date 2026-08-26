import { describe, expect, it } from 'vitest'
import { matchesWorldflowCosmoChannel } from './worldflow-cosmo'

const channel = {
  channelId: '6a85654041b16262cb633ac7',
  name: 'Kyoto Night Walk',
  freq: 88.4,
}

describe('matchesWorldflowCosmoChannel', () => {
  it('matches channel names without case sensitivity', () => {
    expect(matchesWorldflowCosmoChannel('kyoto', channel)).toBe(true)
  })

  it('matches channel frequencies and ids', () => {
    expect(matchesWorldflowCosmoChannel('88.4', channel)).toBe(true)
    expect(matchesWorldflowCosmoChannel('6a8565', channel)).toBe(true)
  })

  it('rejects unrelated channel queries', () => {
    expect(matchesWorldflowCosmoChannel('Shanghai', channel)).toBe(false)
  })
})
