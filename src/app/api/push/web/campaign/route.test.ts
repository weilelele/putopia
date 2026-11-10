import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), config: vi.fn(), db: vi.fn(), send: vi.fn() }))
vi.mock('@/lib/push/web-server', () => ({ authorizeWebCampaign: mocks.authorize, webPushConfig: mocks.config, webPushDb: mocks.db }))
vi.mock('web-push', () => ({ default: { sendNotification: mocks.send } }))

import { POST } from './route'

const user = '12345678-1234-1234-1234-123456789abc'
const spec = { campaignKey: 'offline-regression', title: 'Preview', body: 'No real notifications', route: '/console', userIds: [user] }
const rows = Array.from({ length: 6 }, (_, index) => ({ id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`, user_id: user, endpoint: `https://fcm.googleapis.com/mock/${index}`, p256dh: 'A'.repeat(87), auth: 'A'.repeat(22) }))

function database(devices = rows) {
  let cursor = ''
  let size = 0
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    limit: vi.fn((value: number) => { size = value; return query }),
    gt: vi.fn((_column: string, value: string) => { cursor = value; return query }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { enabled: true }, error: null }),
    then(resolve: (value: { data: typeof rows; error: null }) => unknown) {
      return Promise.resolve({ data: devices.filter(row => row.id > cursor).slice(0, size), error: null }).then(resolve)
    },
  }
  const from = vi.fn(() => query)
  mocks.db.mockReturnValue({ from })
  return { query, from }
}

async function request(extra: Record<string, unknown> = {}) {
  const response = await POST(new Request('https://console.example/api/push/web/campaign', { method: 'POST', body: JSON.stringify({ action: 'preview', spec, ...extra }) }))
  return { status: response.status, body: await response.json() }
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.authorize.mockResolvedValue(undefined)
  mocks.config.mockResolvedValue({ sending_enabled: false })
})

describe('Web Push bounded device batches', () => {
  it('previews every device for a single user with more than five subscriptions', async () => {
    const db = database()
    const first = await request()
    expect(first.status).toBe(200)
    expect(first.body).toMatchObject({ dryRun: true, sendingEnabled: false, eligibleUsers: 1, eligibleDevices: 5, nextCursor: rows[4].id })
    expect(db.query.in).toHaveBeenCalledWith('user_id', [user])
    expect(db.query.order).toHaveBeenCalledWith('id')
    expect(db.query.limit).toHaveBeenCalledWith(6)
    const second = await request({ cursor: first.body.nextCursor })
    expect(second.status).toBe(200)
    expect(second.body).toMatchObject({ eligibleUsers: 1, eligibleDevices: 1, nextCursor: null })
    expect(db.query.gt).toHaveBeenCalledWith('id', rows[4].id)
    expect(second.body.specHash).toBe(first.body.specHash)
    expect(first.body.eligibleDevices + second.body.eligibleDevices).toBe(6)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('ends at exactly five devices and accepts an empty final page', async () => {
    database(rows.slice(0, 5))
    expect((await request()).body).toMatchObject({ eligibleDevices: 5, nextCursor: null })
    expect((await request({ cursor: rows[4].id })).body).toMatchObject({ eligibleDevices: 0, nextCursor: null })
  })

  it('bounds mocked transport calls to five per batch and preserves deduplication on retry', async () => {
    const db = database()
    const claimed = new Set<string>()
    const deliveries = {
      insert: vi.fn((record: { subscription_id: string }) => ({ select: () => ({ single: async () => {
        if (claimed.has(record.subscription_id)) return { error: { code: '23505' } }
        claimed.add(record.subscription_id)
        return { data: { id: record.subscription_id, event_token: record.subscription_id }, error: null }
      } }) })),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    }
    mocks.db.mockReturnValue({ from: (table: string) => table === 'web_push_deliveries' ? deliveries : db.query })
    // This is an in-memory configuration and a mocked transport; no env, DB or
    // push provider is accessed, and the real server flag stays untouched.
    mocks.config.mockResolvedValue({ sending_enabled: true })
    mocks.send.mockResolvedValue({ statusCode: 201 })
    const first = await request({ action: 'send', confirm: spec.campaignKey })
    expect(first.status).toBe(200)
    expect(first.body.results).toHaveLength(5)
    expect(mocks.send).toHaveBeenCalledTimes(5)
    const second = await request({ action: 'send', confirm: spec.campaignKey, cursor: first.body.nextCursor })
    expect(second.body.results).toHaveLength(1)
    expect(second.body.nextCursor).toBeNull()
    expect(mocks.send).toHaveBeenCalledTimes(6)
    const retry = await request({ action: 'send', confirm: spec.campaignKey })
    expect(retry.body.results.every((row: { status: string }) => row.status === 'duplicate_skipped')).toBe(true)
    expect(mocks.send).toHaveBeenCalledTimes(6)
  })

  it('rejects malformed cursors before a subscription query', async () => {
    for (const cursor of ['', 12, 'id.gt.anything']) expect((await request({ cursor })).status).toBe(400)
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('keeps real sending locked on both the first and subsequent batch', async () => {
    for (const cursor of [undefined, rows[4].id]) {
      const result = await request({ action: 'send', confirm: spec.campaignKey, cursor })
      expect(result.status).toBe(423)
    }
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('does not bypass authorization when continuing a batch', async () => {
    mocks.authorize.mockRejectedValue(new Error('Unauthorized'))
    expect((await request({ cursor: rows[4].id })).status).toBe(401)
    expect(mocks.config).not.toHaveBeenCalled()
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
