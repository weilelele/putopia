import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getBandAssetById } from '@/lib/cosmo'
import { asWorldflowAdmin } from '@/lib/worldflow-database'

type LinkRequest = {
  characterId?: string | null
  channelId?: string | null
  bandId?: string | null
  eventId?: string | null
  provider?: 'cosmo' | 'signal_task_assets' | 'world_final_assets'
  shotId?: string | null
  sourceAssetId?: string
  sourceMedia?: 'image' | 'video'
  step?: number
  worldId?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '请先登录。' }, { status: 401 })

  const body = (await request.json()) as LinkRequest
  const worldId = body.worldId ?? ''
  const shotId = body.shotId || null
  const eventId = body.eventId || null
  const characterId = body.characterId || null
  const step = Number(body.step)
  const supportedProviders = ['cosmo', 'signal_task_assets', 'world_final_assets']
  if (!worldId || !body.sourceAssetId || !body.provider || !supportedProviders.includes(body.provider) || !Number.isInteger(step) || step < 1 || step > 7) {
    return NextResponse.json({ error: '云端素材位置无效。' }, { status: 400 })
  }

  const admin = asWorldflowAdmin(createAdminClient())
  const { data: world } = await admin.from('worldflow_worlds').select('current_step, owner_id, workflow_state').eq('id', worldId).maybeSingle()
  if (!world) return NextResponse.json({ error: '找不到这个世界。' }, { status: 404 })
  if (world.owner_id !== user.id) return NextResponse.json({ error: '只有创建者可以关联素材。' }, { status: 403 })
  if (step > world.current_step) return NextResponse.json({ error: '请先完成当前步骤的审核。' }, { status: 409 })

  const state = world.workflow_state as {
    shots?: Array<{ id: string }>
    characters?: Array<{ id: string }>
    eventSystems?: Record<
      string,
      {
        timeSlots?: Array<{
          events?: Array<{ id: string; subEvents?: Array<{ id: string }> }>
        }>
      }
    >
    stepStatuses?: Record<string, string>
  }
  if (step < 5 && ['review', 'approved'].includes(state.stepStatuses?.[String(step)] ?? '')) {
    return NextResponse.json({ error: '当前步骤为只读状态，不能关联素材。' }, { status: 409 })
  }
  if (shotId && !state.shots?.some((shot) => shot.id === shotId)) return NextResponse.json({ error: '镜头无效。' }, { status: 400 })
  if (characterId && !state.characters?.some((character) => character.id === characterId)) return NextResponse.json({ error: '角色无效。' }, { status: 400 })
  if (step === 3 && !shotId) return NextResponse.json({ error: '镜头素材必须绑定到具体镜头。' }, { status: 400 })
  const eventExists =
    shotId && eventId
      ? state.eventSystems?.[shotId]?.timeSlots?.some((slot) => slot.events?.some((event) => event.id === eventId || event.subEvents?.some((subEvent) => subEvent.id === eventId)))
      : false
  if ((step >= 6 && (!shotId || !eventId)) || (eventId && !eventExists)) {
    return NextResponse.json({ error: '请选择有效的镜头和事件。' }, { status: 400 })
  }

  let mediaType: 'image' | 'video'
  let sourceUrl: string
  let fileName: string
  if (body.provider === 'cosmo') {
    if (!body.channelId || !body.bandId || (body.sourceMedia !== 'image' && body.sourceMedia !== 'video')) {
      return NextResponse.json({ error: 'Cosmo 素材来源信息不完整。' }, { status: 400 })
    }
    let result: Awaited<ReturnType<typeof getBandAssetById>>
    try {
      result = await getBandAssetById(
        body.channelId,
        body.bandId,
        body.sourceMedia,
        body.sourceAssetId,
      )
    } catch (error) {
      console.error('[worldflow] Cosmo asset validation failed', error)
      return NextResponse.json({ error: 'Cosmo 素材读取失败，请稍后重试。' }, { status: 502 })
    }
    if (!result) {
      return NextResponse.json({ error: '找不到可关联的 Cosmo 素材。' }, { status: 404 })
    }
    const { asset: source, band, channel } = result
    mediaType = source.media
    sourceUrl = source.url
    fileName = `${channel.freq !== null ? `${channel.freq} · ` : ''}${channel.name} / ${band.name}`
  } else if (body.provider === 'signal_task_assets') {
    const { data: source } = await admin
      .from('signal_task_assets')
      .select('id, media, processed_url, source_channel_name, source_band_name')
      .eq('id', body.sourceAssetId)
      .eq('is_selected', true)
      .maybeSingle()
    if (!source || (source.media !== 'image' && source.media !== 'video') || !source.processed_url) {
      return NextResponse.json({ error: '找不到可关联的云端素材。' }, { status: 404 })
    }
    mediaType = source.media
    sourceUrl = source.processed_url
    fileName = source.source_channel_name || source.source_band_name || `云端生成素材 ${source.id.slice(0, 8)}`
  } else {
    const { data: source } = await admin.from('world_final_assets').select('id, media, url, world_id').eq('id', body.sourceAssetId).maybeSingle()
    if (!source) return NextResponse.json({ error: '找不到可关联的云端素材。' }, { status: 404 })
    mediaType = source.media
    sourceUrl = source.url
    fileName = `归档世界 ${source.world_id}`
  }

  if ((step === 4 || step === 6) && mediaType !== 'image') return NextResponse.json({ error: '当前步骤只接受图片。' }, { status: 415 })
  if (step === 7 && mediaType !== 'video') return NextResponse.json({ error: '当前步骤只接受视频。' }, { status: 415 })
  if (step === 4 && !characterId) return NextResponse.json({ error: '角色素材必须绑定到具体角色。' }, { status: 400 })

  let versionQuery = admin.from('worldflow_assets').select('id', { count: 'exact', head: true }).eq('world_id', worldId).eq('step', step)
  versionQuery = shotId ? versionQuery.eq('shot_id', shotId) : versionQuery.is('shot_id', null)
  versionQuery = eventId ? versionQuery.eq('event_id', eventId) : versionQuery.is('event_id', null)
  versionQuery = characterId ? versionQuery.eq('character_id', characterId) : versionQuery.is('character_id', null)
  const { count } = await versionQuery

  const assetId = randomUUID()
  const { data: asset, error } = await admin
    .from('worldflow_assets')
    .insert({
      id: assetId,
      world_id: worldId,
      uploaded_by: user.id,
      step,
      shot_id: shotId,
      event_id: eventId,
      character_id: characterId,
      media_type: mediaType,
      file_name: fileName.slice(0, 240),
      storage_path: null,
      public_url: `/api/worldflow/assets/${assetId}`,
      file_size: null,
      mime_type: mediaType === 'image' ? 'image/*' : 'video/mp4',
      version: (count ?? 0) + 1,
      source_type: 'cloud',
      source_provider: body.provider,
      source_asset_id: body.sourceAssetId,
      source_url: sourceUrl,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(asset, { status: 201 })
}
