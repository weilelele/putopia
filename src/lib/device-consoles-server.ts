import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { DeviceConsoleRecord, DeviceOrderPack, VoyagerOrder } from '@/lib/actions/orders'

/** Internal loader: userId must come from a verified server session. */
/** Paid Device Batch claims with their exact Unit and per-Pack fulfillment. */
export async function readMyDeviceConsoles(userId: string | null): Promise<DeviceConsoleRecord[]> {
  const supabase = await createClient()
  if (!userId) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orderRows } = await (supabase.from('voyager_orders') as any)
    .select('*')
    .eq('user_id', userId)
    .in('product_type', ['device_batch_claim', 'initiation_console_claim'])
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

