import 'server-only'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { publishedRowsToBatches, type DeviceBatchRow } from '@/lib/device-batch-records'
import { stillImage } from './dashboard-media'
import { dashboardIntelUpdate, type DashboardUpdate } from './dashboard-model'
/** Server-only sources; access filtering happens below, after fresh authentication.
 * Public reads can begin while identity is resolving instead of after it. */
const readDashboardUpdateSources = unstable_cache(async () => {
  const db = createAdminClient()
  const [intel, established, members, batches, activity] = await Promise.all([
    db.from('intel').select('id,title,content,images,classified,timestamp,publisher_id,publisher_name').order('timestamp', { ascending:false }).limit(10),
    db.from('activity_events').select('id,created_at,target_id,target_title,target_image,target_href').eq('event_type','world_established').eq('is_visible',true).order('created_at',{ascending:false}).limit(30),
    db.from('activity_events').select('id,created_at,actor_name,actor_id,target_href').eq('event_type','voyager_activated').or('actor_role.is.null,actor_role.neq.architect').eq('is_visible',true).order('created_at',{ascending:false}).limit(20),
    db.from('device_batches').select('published_content,publication_status,revision,listing_quantity,claimed_quantity,reserved_quantity,price_amount,price_currency')
      .eq('publication_status','published').order('created_at',{ascending:true}).order('id',{ascending:true})
      .returns<Omit<DeviceBatchRow, 'content'>[]>(),
    db.from('activity_events').select('id,event_type,created_at,target_id,target_title,target_image,target_href').in('event_type',['device_updated']).eq('is_visible',true).order('created_at',{ascending:false}).limit(30),
  ])
  const incomplete = Boolean(intel.error || established.error || members.error || batches.error || activity.error)
  const publisherIds = [...new Set((intel.data ?? []).flatMap(item => item.publisher_id ? [item.publisher_id] : []))]
  const publishers = publisherIds.length ? await db.from('voyager_profiles').select('id,avatar_url').in('id',publisherIds) : {data:[],error:null}
  return { intel, established, members, batches, activity, publishers, incomplete: incomplete || Boolean(publishers.error) }
}, ['dashboard-update-sources-v1'], { revalidate:30 })

/** Read enough candidates for category caps and entity deduplication before the global cutoff. */
export async function readDashboardUpdates(permission: boolean | Promise<boolean>): Promise<{ updates: DashboardUpdate[]; incomplete: boolean }> {
  const [{ intel, established, members, batches, activity, publishers, incomplete }, canSeeClassified] = await Promise.all([
    readDashboardUpdateSources(), permission,
  ])
  const avatars = new Map((publishers.data ?? []).map(item => [item.id,item.avatar_url]))
  return { incomplete, updates: [
    ...(intel.data ?? []).map(item => dashboardIntelUpdate(item, avatars.get(item.publisher_id ?? '') ?? null, canSeeClassified)),
    ...(established.data ?? []).map(item => ({id:`established-${item.id}`,entityKey:item.target_id ? `world-${item.target_id}` : undefined,occurredAt:item.created_at,category:'Established world',title:item.target_title ?? 'A world entered the archive',image:item.target_image,href:item.target_id ? `/worlds/${encodeURIComponent(item.target_id)}` : '/worlds'})),
    ...(members.data ?? []).map(item => ({id:`activation-${item.id}`,occurredAt:item.created_at,category:'Voyager activated',title:`${item.actor_name} joined the Collective`,href:'/voyagers'})),
    ...(activity.data ?? []).map(item => ({id:`device-event-${item.id}`,entityKey:item.target_id ? `device-${item.target_id}` : item.target_href ? `device-href-${item.target_href}` : undefined,occurredAt:item.created_at,category:'Device update',title:item.target_title ?? 'Device archive updated',image:stillImage('image',item.target_image),href:item.target_href?.startsWith('/') && !item.target_href.startsWith('//') ? item.target_href : '/devices'})),
    ...publishedRowsToBatches((batches.data ?? []).map(row => ({ ...row, content: null }))).map(batch => {
      const media = batch.latestUpdate.media?.[0]
      return {id:`device-${batch.slug}`,entityKey:`device-${batch.slug}`,occurredAt:batch.latestUpdate.date,category:'Device update',title:batch.latestUpdate.title,description:batch.latestUpdate.body,image:media ? stillImage(media.kind,media.src,media.poster) : batch.image,href:`/devices/batches/${encodeURIComponent(batch.slug)}`}
    }),
  ] }
}
