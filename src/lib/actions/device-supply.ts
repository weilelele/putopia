'use server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { readDeviceSupplyStatus, type DeviceSupplyOption, type ConsoleShipmentRecord } from '@/lib/device-supply-model'

async function humanArchitect() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Human architect access required.')
  const { data, error } = await client.from('voyager_profiles').select('role,account_kind').eq('id', user.id).single()
  if (error || data?.role !== 'architect' || data.account_kind !== 'human') throw new Error('Human architect access required.')
  return user.id
}
export async function getDeviceClaimSupply(slug: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (createAdminClient() as any).rpc('device_claim_supply', { p_slug: slug })
    return error ? 'unknown' as const : readDeviceSupplyStatus(data)
  } catch { return 'unknown' as const }
}
export async function getDeviceSupplyAdmin() {
  await humanArchitect()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const [config, batches, units, claims, audit] = await Promise.all([
    admin.from('initiation_batches').select('label,console_batch_slug,supply_revision').eq('label','S26').single(),
    admin.from('device_batches').select('slug,name,publication_status,listing_quantity,claimed_quantity,reserved_quantity').order('name'),
    admin.from('device_batch_units').select('batch_slug,unit_code,order_id,user_id,status,sequence_no'),
    admin.from('voyager_orders').select('id,device_batch_slug,status,tracking_url').eq('product_type','initiation_console_claim').in('status',['paid','preparing','shipped','delivered']).order('created_at',{ ascending:false }),
    admin.from('device_supply_audit').select('id,previous_slug,selected_slug,revision,note,created_at').eq('membership_batch','S26').order('revision',{ ascending:false }).limit(10),
  ])
  if ([config,batches,units,claims,audit].some(r => r.error)) throw new Error('Supply configuration is unavailable. Verify migration v88 before saving.')
  const options: DeviceSupplyOption[] = batches.data.map((b: Omit<DeviceSupplyOption,'availableUnits'>) => ({ ...b, availableUnits: units.data.filter((u: { batch_slug: string; status: string; order_id: string | null; user_id: string | null; sequence_no: number }) => u.batch_slug === b.slug && u.status === 'available' && !u.order_id && !u.user_id && u.sequence_no <= b.listing_quantity).length }))
  return { config: config.data as { label: string; console_batch_slug: string | null; supply_revision: number }, options,
    claims: (claims.data as { id: string; device_batch_slug: string; status: string; tracking_url: string | null }[]).map((o: { id: string; device_batch_slug: string; status: string; tracking_url: string | null }) => ({ ...o, unitCode: units.data.find((u: { order_id: string | null }) => u.order_id === o.id)?.unit_code as string | undefined })),
    audit: audit.data as { id: number; previous_slug: string | null; selected_slug: string | null; revision: number; note: string; created_at: string }[] }
}
export async function fulfillBoundConsole(input: { orderId: string; unitCode: string; status: string; trackingUrl: string }) {
  if (!['preparing','shipped','delivered'].includes(input.status) || !input.unitCode.trim()) return { error:'Choose a fulfillment status and verify the exact Unit code.' }
  try {
    const actor = await humanArchitect()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (createAdminClient() as any).rpc('fulfill_initiation_console',{ p_actor:actor,p_order:input.orderId,p_status:input.status,p_unit:input.unitCode.trim(),p_tracking:input.trackingUrl.trim() || null })
    if (error) return { error:'Not updated. Verify the exact Unit, active payment, next fulfillment step and immutable shipment tracking.' }
    revalidatePath('/admin/device-supply'); revalidatePath('/devices/my-consoles'); revalidatePath('/voyager-initiation')
    return { error:null }
  } catch { return { error:'Fulfillment could not be confirmed. Reload before retrying.' } }
}
export async function getMyConsoleShipments(): Promise<ConsoleShipmentRecord[]> {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return []
  // Private entitlement tables have no client grants. Use only the verified user ID.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: e,error } = await admin.from('initiation_entitlements').select('order_id,console_order_id').eq('user_id',user.id).maybeSingle()
  if (error) throw new Error('Console shipment records are unavailable.')
  if (!e?.console_order_id) return []
  const { data: s,error: shipmentError } = await admin.from('initiation_shipments').select('status,scheduled_month,tracking_url').eq('order_id',e.order_id).eq('user_id',user.id).eq('position',3).maybeSingle()
  if (shipmentError) throw new Error('Console shipment records are unavailable.')
  return s ? [{ orderId:e.console_order_id,status:s.status,scheduledMonth:s.scheduled_month,trackingUrl:s.tracking_url }] : []
}
