import 'server-only'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { listPublicDeviceBatches } from '@/lib/device-batch-repository'
import { stillImage } from './dashboard-media'
import type { DashboardUpdate } from './dashboard-model'
/** Read enough candidates for category caps and entity deduplication before the global cutoff. */
export const readDashboardUpdates = unstable_cache(async (canSeeClassified: boolean): Promise<{ updates: DashboardUpdate[]; incomplete: boolean }> => {
  const db = createAdminClient()
  const [intel, established, members, batches, activity] = await Promise.all([
    db.from('intel').select('id,title,content,images,classified,timestamp,publisher_id,publisher_name').order('timestamp', { ascending:false }).limit(10),
    db.from('activity_events').select('id,created_at,target_id,target_title,target_image,target_href').eq('event_type','world_established').eq('is_visible',true).order('created_at',{ascending:false}).limit(30),
    db.from('activity_events').select('id,created_at,actor_name,actor_id,target_href').eq('event_type','voyager_activated').or('actor_role.is.null,actor_role.neq.architect').eq('is_visible',true).order('created_at',{ascending:false}).limit(20),
    listPublicDeviceBatches().then(data=>({data,error:false})).catch(()=>({data:[],error:true})),
    db.from('activity_events').select('id,event_type,created_at,target_id,target_title,target_image,target_href').in('event_type',['device_updated']).eq('is_visible',true).order('created_at',{ascending:false}).limit(30),
  ])
  const incomplete = Boolean(intel.error || established.error || members.error || batches.error || activity.error)
  const publisherIds = [...new Set((intel.data ?? []).filter(item => !item.classified || canSeeClassified).flatMap(item => item.publisher_id ? [item.publisher_id] : []))]
  const publishers = publisherIds.length ? await db.from('voyager_profiles').select('id,avatar_url').in('id',publisherIds) : {data:[],error:null}
  const avatars = new Map((publishers.data ?? []).map(item => [item.id,item.avatar_url]))
  return { incomplete: incomplete || Boolean(publishers.error), updates: [
    ...(intel.data ?? []).map(item => {
      const locked = item.classified && !canSeeClassified
      return {id:`intel-${item.id}`,occurredAt:item.timestamp,category:'Intel',title:item.title,description:locked ? undefined : item.content.slice(0,180),image:locked ? null : item.images?.[0],images:locked ? undefined : item.images,authorName:locked ? undefined : item.publisher_name ?? 'Multiverse Collective',authorAvatar:locked ? null : avatars.get(item.publisher_id ?? '') ?? null,href:`/intel/${encodeURIComponent(item.id)}`,locked}
    }),
    ...(established.data ?? []).map(item => ({id:`established-${item.id}`,entityKey:item.target_id ? `world-${item.target_id}` : undefined,occurredAt:item.created_at,category:'Established world',title:item.target_title ?? 'A world entered the archive',image:item.target_image,href:item.target_id ? `/worlds/${encodeURIComponent(item.target_id)}` : '/worlds'})),
    ...(members.data ?? []).map(item => ({id:`activation-${item.id}`,occurredAt:item.created_at,category:'Voyager activated',title:`${item.actor_name} joined the Collective`,href:'/voyagers'})),
    ...(activity.data ?? []).map(item => ({id:`device-event-${item.id}`,entityKey:item.target_id ? `device-${item.target_id}` : item.target_href ? `device-href-${item.target_href}` : undefined,occurredAt:item.created_at,category:'Device update',title:item.target_title ?? 'Device archive updated',image:stillImage('image',item.target_image),href:item.target_href?.startsWith('/') && !item.target_href.startsWith('//') ? item.target_href : '/devices'})),
    ...batches.data.map(batch => {
      const media = batch.latestUpdate.media?.[0]
      return {id:`device-${batch.slug}`,entityKey:`device-${batch.slug}`,occurredAt:batch.latestUpdate.date,category:'Device update',title:batch.latestUpdate.title,description:batch.latestUpdate.body,image:media ? stillImage(media.kind,media.src,media.poster) : batch.image,href:`/devices/batches/${encodeURIComponent(batch.slug)}`}
    }),
  ] }
}, ['dashboard-event-updates-v4'], { revalidate:30 })
