import { describe, expect, it } from 'vitest'
import { isDeviceQueueEntry } from './dreamcatcher-queue-policy'
describe('public device queue', () => {
  it('keeps device work, including subsequent rounds', () => {
    for (const roundStatus of ['queued', 'processing']) expect(isDeviceQueueEntry({status: 'queued', roundStatus})).toBe(true)
  })
  it('removes finished device work even when generation is delayed or votes are pending', () => {
    for (const roundStatus of ['awaiting_assets', 'voting_open', 'awaiting_initiator_feedback', 'settled', 'cancelled', 'waiting_capacity']) expect(isDeviceQueueEntry({status: 'processing', roundStatus})).toBe(false)
  })
  it('keeps legacy waiting work but excludes legacy result and voting waits', () => {
    expect(isDeviceQueueEntry({status:'returning'})).toBe(true)
    expect(isDeviceQueueEntry({status:'awaiting_dispatch'})).toBe(false)
    expect(isDeviceQueueEntry({status:'awaiting_vote'})).toBe(false)
  })
})
