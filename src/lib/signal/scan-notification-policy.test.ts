import { afterEach, describe, expect, it, vi } from 'vitest'

// Hard-stop external boundaries: these regression tests never use real services.
const external = vi.hoisted(() => {
  const forbidden = () => { throw new Error('Paused Scan must not access external services') }
  return {
    createAdminClient: vi.fn(forbidden),
    sendEmail: vi.fn(forbidden),
    sendPushToUser: vi.fn(forbidden),
    anthropic: vi.fn(forbidden),
  }
})

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: external.createAdminClient }))
vi.mock('@/lib/email', () => ({ sendEmail: external.sendEmail }))
vi.mock('@/lib/push/apns', () => ({ sendPushToUser: external.sendPushToUser }))
vi.mock('@anthropic-ai/sdk', () => ({ default: external.anthropic }))

import { SCAN_NOTIFICATIONS_ENABLED } from './scan-notification-policy'
import { resolveCompletedScans, resolveWorldScan } from './scan-resolve'
import { sendScanFailedEmail } from './scan-failed-email'
import { maybeSendWorldConfirmedEmail } from './world-confirmed-email'

afterEach(() => {
  for (const boundary of Object.values(external)) {
    expect(boundary).not.toHaveBeenCalled()
  }
  vi.clearAllMocks()
})

describe('legacy Scan notifications are paused during the redesign', () => {
  it('keeps the shared notification switch off', () => {
    expect(SCAN_NOTIFICATIONS_ENABLED).toBe(false)
  })

  it('does not resolve or claim a scan when the world page calls it', async () => {
    await expect(resolveWorldScan('test-world')).resolves.toEqual({ resolved: false })
  })

  it('does not query or process the backlog when either cron calls it', async () => {
    await expect(resolveCompletedScans()).resolves.toEqual({
      checked: 0, resolved: 0, ready: 0, failed: 0,
    })
  })

  it('blocks direct failure emails and push notifications', async () => {
    await expect(sendScanFailedEmail('test-world')).resolves.toBeUndefined()
  })

  it('blocks direct publish-time success emails, pushes, and AI generation', async () => {
    await expect(maybeSendWorldConfirmedEmail('test-world')).resolves.toBeUndefined()
  })
})
