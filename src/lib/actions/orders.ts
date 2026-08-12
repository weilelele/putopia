'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  sendDeviceOrderStatusNotification,
} from '@/lib/device-batch-notifications'
import type { DeviceOrderEmailStatus } from '@/lib/device-batch-emails'
import {
  validateDeviceOrderFulfillmentUpdate,
} from '@/lib/device-order-status'

export interface VoyagerOrder {
  id: string
  status: string
  amount: number | null
  currency: string
  batch_label: string | null
  product_type: string
  device_batch_slug: string | null
  device_batch_code: string | null
  pack_count: number
  recipient_name: string | null
  city: string | null
  state: string | null
  carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  shipped_at: string | null
  delivered_at: string | null
  paid_at: string | null
  created_at: string
  device_unit_code?: string | null
  device_unit_status?: string | null
}

export interface DeviceOrderPack {
  expected_window: string | null
  is_console_pack: boolean
  label: string
  stage_id: string
  stage_position: number
  status: string
  tracking_number: string | null
  tracking_url: string | null
}

export interface DeviceConsoleRecord {
  order: VoyagerOrder
  packs: DeviceOrderPack[]
  unitCode: string
  unitStatus: string
}

/** One signed-in user's device order, addressed by its unguessable Stripe Session. */
export async function getMyDeviceOrderBySession(
  sessionId: string,
): Promise<VoyagerOrder | null> {
  if (!sessionId.startsWith('cs_')) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // RLS and the explicit user filter both restrict this to the buyer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('voyager_orders') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('stripe_session_id', sessionId)
    .eq('product_type', 'device_batch_claim')
    .maybeSingle()

  const order = (data as VoyagerOrder | null) ?? null
  if (!order) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: unit } = await (supabase.from('device_batch_units') as any)
    .select('unit_code, status')
    .eq('order_id', order.id)
    .maybeSingle()
  return {
    ...order,
    device_unit_code: unit?.unit_code ?? null,
    device_unit_status: unit?.status ?? null,
  }
}

/** All orders for the signed-in user, newest first (RLS limits to their own rows). */
export async function getMyOrders(): Promise<VoyagerOrder[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('voyager_orders') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (data as VoyagerOrder[]) ?? []
}

/** Paid Device Batch claims with their exact Unit and per-Pack fulfillment. */
export async function getMyDeviceConsoles(): Promise<DeviceConsoleRecord[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orderRows } = await (supabase.from('voyager_orders') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('product_type', 'device_batch_claim')
    .in('status', ['paid', 'preparing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })
  const orders = (orderRows as VoyagerOrder[] | null) ?? []
  if (!orders.length) return []
  const orderIds = orders.map((order) => order.id)

  const [{ data: unitRows }, { data: packRows }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('device_batch_units') as any)
      .select('order_id, unit_code, status')
      .in('order_id', orderIds),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('device_order_packs') as any)
      .select('order_id, stage_id, stage_position, label, expected_window, is_console_pack, status, tracking_number, tracking_url')
      .in('order_id', orderIds)
      .order('stage_position', { ascending: true }),
  ])
  const unitByOrder = new Map<string, { order_id: string; status: string; unit_code: string }>(
    (unitRows ?? []).map((unit: { order_id: string; status: string; unit_code: string }) => [unit.order_id, unit]),
  )
  const packsByOrder = new Map<string, DeviceOrderPack[]>()
  for (const pack of packRows ?? []) {
    const current = packsByOrder.get(pack.order_id) ?? []
    current.push(pack as DeviceOrderPack)
    packsByOrder.set(pack.order_id, current)
  }

  return orders.flatMap((order) => {
    const unit = unitByOrder.get(order.id)
    return unit ? [{
      order,
      packs: packsByOrder.get(order.id) ?? [],
      unitCode: unit.unit_code,
      unitStatus: unit.status,
    }] : []
  })
}

// ── Admin (architect-only) ──────────────────────────────────────────────────

export interface AdminOrder extends VoyagerOrder {
  email: string | null
  display_name: string | null
  stripe_session_id: string | null
  address_line1: string | null
  address_line2: string | null
  postal_code: string | null
  country: string | null
  phone: string | null
}

async function requireArchitect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: me } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return me?.role === 'architect'
}

async function requireArchitectId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return me?.role === 'architect' ? user.id : null
}

/** All orders, newest first. Architect only. */
export async function getAllOrders(): Promise<AdminOrder[]> {
  if (!(await requireArchitect())) return []
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from('voyager_orders') as any)
    .select('*')
    .order('created_at', { ascending: false })
  const orders = (data as AdminOrder[]) ?? []
  const deviceOrderIds = orders
    .filter((order) => order.product_type === 'device_batch_claim')
    .map((order) => order.id)
  if (!deviceOrderIds.length) return orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: units } = await (admin.from('device_batch_units') as any)
    .select('order_id, unit_code, status')
    .in('order_id', deviceOrderIds)
  const unitByOrder = new Map<string, { order_id: string; status: string; unit_code: string }>(
    (units ?? []).map((unit: { order_id: string; status: string; unit_code: string }) => [unit.order_id, unit]),
  )
  return orders.map((order) => {
    const unit = unitByOrder.get(order.id)
    return {
      ...order,
      device_unit_code: unit?.unit_code ?? null,
      device_unit_status: unit?.status ?? null,
    }
  })
}

/** Update fulfillment fields. Stamps shipped_at / delivered_at on status change. */
export async function updateOrderFulfillment(
  orderId: string,
  updates: {
    status?: string
    carrier?: string | null
    tracking_number?: string | null
    tracking_url?: string | null
    expected_unit_code?: string | null
  },
): Promise<{ error: string | null; emailWarning?: string }> {
  const architectId = await requireArchitectId()
  if (!architectId) return { error: 'Forbidden' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {}
  if (updates.status !== undefined) {
    patch.status = updates.status
  }
  if (updates.carrier !== undefined) patch.carrier = updates.carrier
  if (updates.tracking_number !== undefined) patch.tracking_number = updates.tracking_number
  if (updates.tracking_url !== undefined) patch.tracking_url = updates.tracking_url

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentOrder, error: currentOrderError } = await (admin.from('voyager_orders') as any)
    .select('status, product_type')
    .eq('id', orderId)
    .maybeSingle()
  if (currentOrderError) return { error: currentOrderError.message }
  if (!currentOrder) return { error: 'Order not found' }
  if (updates.status !== undefined && updates.status !== currentOrder.status) {
    if (updates.status === 'shipped') patch.shipped_at = new Date().toISOString()
    if (updates.status === 'delivered') patch.delivered_at = new Date().toISOString()
  }
  if (
    currentOrder.product_type === 'device_batch_claim'
    && updates.status !== undefined
  ) {
    const transitionError = validateDeviceOrderFulfillmentUpdate(
      currentOrder.status,
      updates.status,
      updates.tracking_number,
    )
    if (transitionError) return { error: transitionError }
  }

  let updatedOrder
  const requiresUnitVerification = currentOrder.product_type === 'device_batch_claim'
    && currentOrder.status !== 'shipped'
    && updates.status === 'shipped'
  if (requiresUnitVerification) {
    if (!updates.expected_unit_code?.trim()) {
      return { error: 'Type or scan the assigned Device Unit code before shipping.' }
    }
    // Exact Unit verification and the status transition happen in one database transaction.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: shipError } = await (admin as any).rpc('ship_device_order', {
      p_order_id: orderId,
      p_expected_unit_code: updates.expected_unit_code,
      p_carrier: updates.carrier ?? '',
      p_tracking_number: updates.tracking_number ?? '',
      p_tracking_url: updates.tracking_url,
      p_architect_id: architectId,
    })
    if (shipError) return { error: shipError.message }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from('voyager_orders') as any)
      .select('id, user_id, email, amount, currency, status, product_type, device_batch_slug, pack_count, tracking_number, tracking_url')
      .eq('id', orderId)
      .maybeSingle()
    if (error) return { error: error.message }
    updatedOrder = data
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from('voyager_orders') as any)
      .update(patch)
      .eq('id', orderId)
      .eq('status', currentOrder.status)
      .select('id, user_id, email, amount, currency, status, product_type, device_batch_slug, pack_count, tracking_number, tracking_url')
      .maybeSingle()
    if (error) return { error: error.message }
    updatedOrder = data
  }
  if (!updatedOrder) {
    return { error: 'Order status changed in another session. Reload and try again.' }
  }

  let emailWarning: string | undefined
  const customerEmailStatuses: DeviceOrderEmailStatus[] = [
    'paid',
    'preparing',
    'shipped',
    'delivered',
    'payment_failed',
    'refunded',
  ]
  if (
    updatedOrder?.product_type === 'device_batch_claim'
    && customerEmailStatuses.includes(updatedOrder.status as DeviceOrderEmailStatus)
  ) {
    const email = await sendDeviceOrderStatusNotification(
      updatedOrder,
      updatedOrder.status as DeviceOrderEmailStatus,
    )
    if (email.error) emailWarning = email.error
  }

  revalidatePath('/admin/orders')
  revalidatePath('/profile')
  return { error: null, emailWarning }
}

/**
 * Manually create a paid order for a user (by email) and provision their
 * Voyager membership. Used when payment happened outside the Stripe flow
 * (offline, gifted, etc.) or for testing.
 *
 * - If no account exists for the email, one is invited via Supabase.
 * - Idempotent: if the user is already a paid Voyager, still creates a new
 *   order row so you can record the physical shipment.
 */
export async function createOrderManually(params: {
  email: string
  amount?: number          // cents, default 1200
  note?: string            // internal note stored in display_name field
}): Promise<{ error: string | null; orderId?: string }> {
  if (!(await requireArchitect())) return { error: 'Forbidden' }

  const { provisionVoyagerMembership } = await import('@/lib/actions/membership')
  const { getCurrentBatch } = await import('@/lib/actions/membership')

  const email = params.email.trim().toLowerCase()
  const amount = params.amount ?? 1200
  const admin = createAdminClient()

  // Resolve or create the account
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  let authUser = list?.users?.find((u) => u.email?.toLowerCase() === email)

  if (!authUser) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/callback`,
    })
    if (inviteErr) return { error: `Could not invite ${email}: ${inviteErr.message}` }
    authUser = invited?.user ?? null
  }

  if (!authUser) return { error: `Failed to resolve account for ${email}` }

  const batch = await getCurrentBatch()

  // Create the order row (status=paid immediately)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderErr } = await (admin.from('voyager_orders') as any)
    .insert({
      user_id:    authUser.id,
      email,
      amount,
      currency:   'usd',
      status:     'paid',
      batch_label: batch,
      display_name: params.note?.trim() || null,
      stripe_session_id: `manual_${Date.now()}`,
      paid_at:    new Date().toISOString(),
    })
    .select('id')
    .single()

  if (orderErr) return { error: orderErr.message }

  // Provision Voyager membership (idempotent)
  const { error: provErr } = await provisionVoyagerMembership(authUser.id)
  if (provErr) return { error: provErr }

  revalidatePath('/admin/orders')
  revalidatePath('/profile')
  return { error: null, orderId: order?.id }
}
