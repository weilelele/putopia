import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import type { DistributionStage } from '@/lib/device-batches'
import {
  getAdminDeviceBatch,
  getPublicDeviceBatch,
} from '@/lib/device-batch-repository'
import {
  buildBatchMajorUpdateEmail,
  buildDeviceOrderStatusEmail,
  buildDistributionStageEmail,
  type DeviceOrderEmailStatus,
} from '@/lib/device-batch-emails'
import { sendTrackedEmail, type TrackedEmailResult } from '@/lib/tracked-email'

type AudienceResult = {
  attempted: number
  sent: number
  skipped: number
  failed: number
}

type DeviceOrderNotification = {
  id: string
  user_id: string | null
  email: string | null
  device_batch_slug: string | null
  pack_count: number
  amount?: number | null
  currency?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
}

function eventDigest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)
}

function summarize(results: TrackedEmailResult[]): AudienceResult {
  return {
    attempted: results.length,
    sent: results.filter((result) => result.sent).length,
    skipped: results.filter((result) => result.skipped).length,
    failed: results.filter((result) => result.error).length,
  }
}

async function sendInChunks(
  tasks: (() => Promise<TrackedEmailResult>)[],
): Promise<TrackedEmailResult[]> {
  const results: TrackedEmailResult[] = []
  // Stay below Resend's default five-requests-per-second limit.
  for (let index = 0; index < tasks.length; index += 4) {
    const chunk = tasks.slice(index, index + 4)
    results.push(...await Promise.all(chunk.map((task) => task())))
    if (index + 4 < tasks.length) {
      await new Promise((resolve) => setTimeout(resolve, 1_050))
    }
  }
  return results
}

export async function sendDeviceOrderStatusNotification(
  order: DeviceOrderNotification,
  status: DeviceOrderEmailStatus,
) {
  if (!order.email || !order.device_batch_slug) {
    return { error: 'Order email or Batch is missing', sent: false, skipped: false }
  }
  const batch = await getPublicDeviceBatch(order.device_batch_slug)
  if (!batch) return { error: 'Batch not found', sent: false, skipped: false }

  const admin = createAdminClient()
  // Unit lookup happens after the payment status transition, so the paid email
  // contains the same immutable assignment shown in My Consoles.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: unit } = await (admin.from('device_batch_units') as any)
    .select('unit_code')
    .eq('order_id', order.id)
    .maybeSingle()

  const email = buildDeviceOrderStatusEmail({
    batch,
    status,
    packCount: order.pack_count,
    paidAmount: order.amount,
    currency: order.currency,
    trackingNumber: order.tracking_number,
    trackingUrl: order.tracking_url,
    unitCode: unit?.unit_code ?? null,
  })
  const trackingSuffix = status === 'shipped'
    ? `/${eventDigest([order.tracking_number, order.tracking_url])}`
    : ''

  return sendTrackedEmail({
    eventKey: `device-order/${order.id}/${status}${trackingSuffix}`,
    userId: order.user_id,
    recipient: order.email,
    category: `device_order_${status}`,
    batchSlug: batch.slug,
    orderId: order.id,
    ...email,
  })
}

export async function sendBatchMajorUpdateNotifications(opts: {
  batchSlug: string
  date: string
  title: string
  body: string
}): Promise<AudienceResult> {
  const batch = await getAdminDeviceBatch(opts.batchSlug)
  if (!batch) return { attempted: 0, sent: 0, skipped: 0, failed: 1 }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: follows } = await (admin.from('device_batch_follows') as any)
    .select('user_id')
    .eq('batch_slug', batch.slug)
    .eq('email_enabled', true)
  const userIds = [...new Set((follows ?? []).map((row: { user_id: string }) => row.user_id))]
  if (!userIds.length) return { attempted: 0, sent: 0, skipped: 0, failed: 0 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (admin.from('voyager_profiles') as any)
    .select('id, email')
    .in('id', userIds)
  const email = buildBatchMajorUpdateEmail(batch, opts)
  const updateId = eventDigest([opts.date, opts.title, opts.body])
  const tasks = (profiles ?? [])
    .filter((profile: { id: string; email: string | null }) => !!profile.email)
    .map((profile: { id: string; email: string }) => () => sendTrackedEmail({
      eventKey: `batch-update/${batch.slug}/${updateId}/${profile.id}`,
      userId: profile.id,
      recipient: profile.email,
      category: 'device_batch_major_update',
      batchSlug: batch.slug,
      ...email,
    }))

  return summarize(await sendInChunks(tasks))
}

export async function sendDistributionStageNotifications(opts: {
  batchSlug: string
  stage: Pick<DistributionStage, 'id' | 'label' | 'status' | 'summary' | 'window'>
}): Promise<AudienceResult> {
  const batch = await getAdminDeviceBatch(opts.batchSlug)
  if (!batch) return { attempted: 0, sent: 0, skipped: 0, failed: 1 }
  if (opts.stage.status !== 'current' && opts.stage.status !== 'completed') {
    return { attempted: 0, sent: 0, skipped: 0, failed: 1 }
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orders } = await (admin.from('voyager_orders') as any)
    .select('id, user_id, email')
    .eq('product_type', 'device_batch_claim')
    .eq('device_batch_slug', batch.slug)
    .in('status', ['paid', 'preparing', 'shipped', 'delivered'])

  const email = buildDistributionStageEmail(batch, opts.stage)
  const tasks = (orders ?? [])
    .filter((order: { email: string | null }) => !!order.email)
    .map((order: { id: string; user_id: string | null; email: string }) => () => sendTrackedEmail({
      eventKey: `distribution/${batch.slug}/${opts.stage.id}/${opts.stage.status}/${order.id}`,
      userId: order.user_id,
      recipient: order.email,
      category: `device_distribution_${opts.stage.status}`,
      batchSlug: batch.slug,
      orderId: order.id,
      ...email,
    }))

  return summarize(await sendInChunks(tasks))
}
