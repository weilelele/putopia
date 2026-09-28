import { describe, expect, it } from 'vitest'
import { deviceQueueOrder, isDeviceQueueEntry } from './dreamcatcher-queue-policy'
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


describe('queue overview order', () => {
  const jobs = [
    { id: 'new', status: 'queued', queuedAt: '2026-09-29T03:00:00Z' },
    { id: 'old', status: 'queued', queuedAt: '2026-09-29T01:00:00Z' },
    { id: 'middle', status: 'returning', roundStatus: 'queued', queuedAt: '2026-09-29T02:00:00Z' },
    { id: 'active', status: 'processing', roundStatus: 'processing', queuedAt: '2026-09-29T04:00:00Z' },
    { id: 'done', status: 'processing', roundStatus: 'awaiting_assets', queuedAt: '2026-09-29T00:00:00Z' },
  ]
  it('shows the current round and next two, excluding delayed signals', () => {
    expect(deviceQueueOrder(jobs).slice(0, 3).map(job => job.id)).toEqual(['active', 'old', 'middle'])
    expect(jobs[0].id).toBe('new')
  })
  it('shows the first three in actual queue order when idle', () => {
    expect(deviceQueueOrder(jobs.filter(job => job.id !== 'active')).slice(0, 3).map(job => job.id)).toEqual(['old', 'middle', 'new'])
  })
  it('preserves database timestamp precision within a millisecond', () => {
    expect(deviceQueueOrder([{id:'a', status:'queued', queuedAt:'2026-09-29T01:00:00.000200+00:00'}, {id:'b', status:'queued', queuedAt:'2026-09-29T01:00:00.000100+00:00'}]).map(job => job.id)).toEqual(['b', 'a'])
  })
  it('uses round id to break timestamp ties like the scheduler', () => {
    expect(deviceQueueOrder([{ id: 'a', status: 'queued', queuedAt: jobs[0].queuedAt, queueOrderId: 'z' }, { id: 'b', status: 'queued', queuedAt: jobs[0].queuedAt, queueOrderId: 'a' }]).map(job => job.id)).toEqual(['b', 'a'])
  })
})
