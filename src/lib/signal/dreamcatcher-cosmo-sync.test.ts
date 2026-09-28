import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { CosmoExpansion } from '@/lib/cosmo'
const state = vi.hoisted(() => ({ client: null as unknown, bootstrap: vi.fn(), expansions: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => state.client }))
vi.mock('@/lib/cosmo', () => ({ getWorldBootstraps: state.bootstrap, getWorldExpansions: state.expansions }))
import { syncDreamcatcherCosmo } from './dreamcatcher-cosmo-sync'
import { selectRoundBatch } from './dreamcatcher-cosmo-model'
const expansion = (id: string, sessionId: string, ready = true): CosmoExpansion => ({
  expansionId: id, sessionId, direction: '', pickedOn: null, createdAt: null,
  videos: ready ? [{ assetId: id, media: 'video', url: `https://example.com/${id}.mp4`, posterUrl: `https://example.com/${id}.webp` }] : [],
})
function mockClient(commandId: number | null) {
  const calls: { path: string; body: Record<string, unknown> }[] = []
  state.client = createClient('https://database.invalid', 'test-only', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input))
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      calls.push({ path: url.pathname, body })
      let result: unknown = null
      if (url.pathname.endsWith('/dreamcatcher_generation_requests') && (init?.method ?? 'GET') === 'GET') result = [{
        id: 'request', status: commandId === null ? 'pending' : 'running', cosmo_request_id: commandId,
        baseline_sessions: ['old'], created_at: '2026-01-01T00:00:00Z', dreamcatcher_rounds: { world_id: 'world', status: 'queued' },
      }]
      else if (url.pathname.endsWith('/dispatch_dreamcatcher_generation')) result = 17
      else if (url.pathname.includes('/rpc/')) result = true
      else if (url.pathname.includes('/storage/')) result = [{ name: 'one.mp4' }, { name: 'one.webp' }]
      return new Response(JSON.stringify(result), { status: 200, headers: { 'content-type': 'application/json' } })
    } },
  })
  return calls
}
beforeEach(() => {
  state.bootstrap.mockClear()
  state.bootstrap.mockResolvedValue(new Map([['world', 'bootstrapped']]))
  state.expansions.mockResolvedValue([expansion('one', 'new'), expansion('two', 'new')])
})
describe('existing Cosmo integration for rounds', () => {
  it('submits a new world through the command inbox without waiting for onboarding', async () => {
    const calls = mockClient(null)
    state.bootstrap.mockResolvedValue(new Map())
    state.expansions.mockResolvedValue([])
    expect((await syncDreamcatcherCosmo())[0].status).toBe('requested')
    expect(state.bootstrap).not.toHaveBeenCalled()
    expect(calls.find(c => c.path.endsWith('/dispatch_dreamcatcher_generation'))?.body).toEqual({ p_request: 'request', p_sessions: [] })
    expect(calls.some(c => c.path.endsWith('/complete_dreamcatcher_generation'))).toBe(false)
  })
  it('does not resend an existing command while its world has no returned assets', async () => {
    const calls = mockClient(17)
    state.expansions.mockResolvedValue([])
    expect((await syncDreamcatcherCosmo())[0].status).toBe('awaiting-assets')
    expect(calls.some(c => c.path.includes('/rpc/'))).toBe(false)
  })
  it('records even incomplete pre-existing sessions before atomic command emission', async () => {
    const calls = mockClient(null)
    state.expansions.mockResolvedValue([expansion('incomplete', 'old', false)])
    await syncDreamcatcherCosmo()
    expect(calls.find(c => c.path.endsWith('/dispatch_dreamcatcher_generation'))?.body).toEqual({ p_request: 'request', p_sessions: ['old'] })
    expect(calls.some(c => c.path.endsWith('/complete_dreamcatcher_generation'))).toBe(false)
  })
  it('reads new results with the original storage paths and does not reissue a command', async () => {
    const calls = mockClient(17)
    expect((await syncDreamcatcherCosmo())[0].status).toBe('ready')
    expect(calls.some(c => c.path.endsWith('/dispatch_dreamcatcher_generation'))).toBe(false)
    const result = calls.find(c => c.path.endsWith('/complete_dreamcatcher_generation'))?.body.p_result as { sessionId: string; assets: Record<string, unknown>[] }
    expect(result.sessionId).toBe('new')
    expect(result.assets[0].processedPath).toBe('cosmo/one.mp4')
    expect(result.assets[0].posterUrl).toContain('/signal-assets/cosmo/one.webp')
    expect(result.assets[1].processedUrl).toBe('https://example.com/two.mp4')
    expect(result.assets[1].posterUrl).toBe('https://example.com/two.webp')
  })
  it('retries failed reads without emitting another generation', async () => {
    const calls = mockClient(17)
    state.expansions.mockRejectedValue(new Error('Read temporarily unavailable'))
    expect((await syncDreamcatcherCosmo())[0].status).toBe('retry-sync')
    expect(calls.some(c => c.path.includes('/rpc/'))).toBe(false)
    expect(calls.some(c => c.body.last_error === 'Read temporarily unavailable')).toBe(true)
  })
  it('never mixes sessions, reuses old batches or publishes a one-option partial batch', () => {
    expect(selectRoundBatch([expansion('a', 'old'), expansion('b', 'old')], ['old'])).toBeNull()
    expect(selectRoundBatch([expansion('a', 'new'), expansion('b', 'another')], [])).toBeNull()
    expect(selectRoundBatch([expansion('a', 'new'), expansion('a', 'new')], [])).toBeNull()
    expect(selectRoundBatch([expansion('a', 'new'), expansion('b', 'new')], ['old'])?.clips).toHaveLength(2)
  })
})
