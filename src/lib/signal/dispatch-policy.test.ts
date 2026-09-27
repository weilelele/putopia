import { afterEach, describe, expect, it, vi } from 'vitest'
const external = vi.hoisted(() => ({ call: vi.fn(() => { throw new Error('Retired automation reached an external service') }) }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: external.call }))
vi.mock('@/lib/cosmo', () => ({ getWorldExpansions: external.call, getWorldBootstraps: external.call }))
vi.mock('@/lib/email', () => ({ sendEmail: external.call }))
vi.mock('@/lib/push/apns', () => ({ sendPushToUser: external.call }))
vi.mock('@/lib/actions/signal-tasks', () => ({ setTaskPublished: external.call }))
vi.mock('@anthropic-ai/sdk', () => ({ default: external.call }))
import { runCosmoSync, buildCosmoSignalDay, maybeEmitColdRequest, emitClosedResults } from './cosmo-sync'
import { runSignalRecall } from './recall'
import { runEngagementEmails } from './engagement'
afterEach(() => { expect(external.call).not.toHaveBeenCalled(); vi.clearAllMocks() })
describe('retired Dispatch automation', () => {
  it('cannot generate, recover, import or emit even when called directly', async () => {
    expect(await runCosmoSync()).toEqual({ threads: 0, results: [] })
    expect(await maybeEmitColdRequest('world')).toEqual({ emitted: false })
    expect(await emitClosedResults('thread')).toEqual({ emitted: 0 })
    expect((await buildCosmoSignalDay({ threadId: 'thread', worldId: 'world', type: 'visual_match' })).skipped).toBe(true)
  })
  it('cannot send recalls, absence/churn emails, push or AI-copy alerts', async () => {
    expect((await runSignalRecall()).emailsSent).toBe(0)
    expect(await runEngagementEmails()).toEqual({ ownerAbsentSent: 0, voterChurnSent: 0, errors: [], emailedUserIds: [] })
  })
})
