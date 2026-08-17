import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { asWorldflowAdmin } from '@/lib/worldflow-database'

const MAX_FILE_BYTES = 50 * 1024 * 1024
const MEDIA_TYPES: Record<string, { extension: string; mediaType: 'image' | 'video' }> = {
  'image/jpeg': { extension: 'jpg', mediaType: 'image' },
  'image/png': { extension: 'png', mediaType: 'image' },
  'image/webp': { extension: 'webp', mediaType: 'image' },
  'video/mp4': { extension: 'mp4', mediaType: 'video' },
  'video/webm': { extension: 'webm', mediaType: 'video' },
  'video/quicktime': { extension: 'mov', mediaType: 'video' },
}

async function authenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function POST(request: Request) {
  const user = await authenticatedUser()
  if (!user) return NextResponse.json({ error: '请先登录。' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  const worldId = String(form.get('worldId') ?? '')
  const shotId = String(form.get('shotId') ?? '') || null
  const eventId = String(form.get('eventId') ?? '') || null
  const characterId = String(form.get('characterId') ?? '') || null
  const step = Number(form.get('step'))
  if (!(file instanceof File)) return NextResponse.json({ error: '请选择本地素材。' }, { status: 400 })
  if (!worldId || !Number.isInteger(step) || step < 1 || step > 7) {
    return NextResponse.json({ error: '素材位置无效。' }, { status: 400 })
  }
  const media = MEDIA_TYPES[file.type]
  if (!media) return NextResponse.json({ error: '支持 JPG、PNG、WebP、MP4、WebM 或 MOV。' }, { status: 415 })
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: '素材必须小于 50 MB。' }, { status: 413 })
  }

  const admin = asWorldflowAdmin(createAdminClient())
  const { data: world } = await admin.from('worldflow_worlds').select('current_step, owner_id, workflow_state').eq('id', worldId).maybeSingle()
  if (!world) return NextResponse.json({ error: '找不到这个世界。' }, { status: 404 })
  if (world.owner_id !== user.id) {
    return NextResponse.json({ error: '只有创建者可以添加素材。' }, { status: 403 })
  }
  if (step > world.current_step) {
    return NextResponse.json({ error: '请先完成当前步骤的审核。' }, { status: 409 })
  }
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
  if (['review', 'approved'].includes(state.stepStatuses?.[String(step)] ?? '')) {
    return NextResponse.json({ error: '当前步骤为只读状态，不能添加素材。' }, { status: 409 })
  }
  if (step === 6 && media.mediaType !== 'image') {
    return NextResponse.json({ error: '图片素材步骤只接受图片。' }, { status: 415 })
  }
  if (step === 7 && media.mediaType !== 'video') {
    return NextResponse.json({ error: '视频素材步骤只接受视频。' }, { status: 415 })
  }
  if (shotId && !state.shots?.some((shot) => shot.id === shotId)) {
    return NextResponse.json({ error: '镜头无效。' }, { status: 400 })
  }
  if (characterId && !state.characters?.some((character) => character.id === characterId)) {
    return NextResponse.json({ error: '角色无效。' }, { status: 400 })
  }
  if (step === 3 && !shotId) {
    return NextResponse.json({ error: '镜头素材必须绑定到具体镜头。' }, { status: 400 })
  }
  if (step === 4 && (!characterId || media.mediaType !== 'image')) {
    return NextResponse.json({ error: '角色素材必须是绑定到具体角色的图片。' }, { status: 400 })
  }
  const eventExists =
    shotId && eventId
      ? state.eventSystems?.[shotId]?.timeSlots?.some((slot) => slot.events?.some((event) => event.id === eventId || event.subEvents?.some((subEvent) => subEvent.id === eventId)))
      : false
  if ((step >= 6 && (!shotId || !eventId)) || (eventId && !eventExists)) {
    return NextResponse.json({ error: '请选择有效的镜头和事件。' }, { status: 400 })
  }

  const path = `${user.id}/${worldId}/step-${step}/${randomUUID()}.${media.extension}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await admin.storage.from('worldflow-assets').upload(path, bytes, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  let versionQuery = admin.from('worldflow_assets').select('id', { count: 'exact', head: true }).eq('world_id', worldId).eq('step', step)
  versionQuery = shotId ? versionQuery.eq('shot_id', shotId) : versionQuery.is('shot_id', null)
  versionQuery = eventId ? versionQuery.eq('event_id', eventId) : versionQuery.is('event_id', null)
  versionQuery = characterId ? versionQuery.eq('character_id', characterId) : versionQuery.is('character_id', null)
  const { count } = await versionQuery

  const assetId = randomUUID()
  const { data: asset, error: insertError } = await admin
    .from('worldflow_assets')
    .insert({
      id: assetId,
      world_id: worldId,
      uploaded_by: user.id,
      step,
      shot_id: shotId,
      event_id: eventId,
      character_id: characterId,
      media_type: media.mediaType,
      file_name: file.name.slice(0, 240),
      storage_path: path,
      public_url: `/api/worldflow/assets/${assetId}`,
      file_size: file.size,
      mime_type: file.type,
      version: (count ?? 0) + 1,
      source_type: 'local',
      source_provider: null,
      source_asset_id: null,
      source_url: null,
    })
    .select('*')
    .single()
  if (insertError) {
    await admin.storage.from('worldflow-assets').remove([path])
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(asset, { status: 201 })
}
