import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { asWorldflowAdmin } from '@/lib/worldflow-database'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '请先登录。' }, { status: 401 })

  const admin = asWorldflowAdmin(createAdminClient())
  const { data: asset } = await admin.from('worldflow_assets').select('storage_path, mime_type, file_name, source_type, source_url').eq('id', id).maybeSingle()
  if (!asset) return NextResponse.json({ error: '找不到素材。' }, { status: 404 })

  if (asset.source_type === 'cloud' && asset.source_url) {
    try {
      const url = new URL(asset.source_url)
      if (url.protocol !== 'https:') throw new Error('unsupported protocol')
      return NextResponse.redirect(url, { status: 307 })
    } catch {
      return NextResponse.json({ error: '云端素材地址无效。' }, { status: 404 })
    }
  }

  if (!asset.storage_path) return NextResponse.json({ error: '素材读取失败。' }, { status: 404 })

  const { data, error } = await admin.storage.from('worldflow-assets').download(asset.storage_path)
  if (error || !data) return NextResponse.json({ error: '素材读取失败。' }, { status: 404 })
  return new NextResponse(data, {
    headers: {
      'Content-Type': asset.mime_type,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(asset.file_name)}`,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '请先登录。' }, { status: 401 })

  const admin = asWorldflowAdmin(createAdminClient())
  const { data: asset } = await admin
    .from('worldflow_assets')
    .select('id, world_id, storage_path, step, media_type, shot_id, character_id')
    .eq('id', id)
    .maybeSingle()
  if (!asset) return NextResponse.json({ error: '找不到素材。' }, { status: 404 })

  const { data: world } = await admin
    .from('worldflow_worlds')
    .select('owner_id, workflow_state')
    .eq('id', asset.world_id)
    .maybeSingle()
  if (!world) return NextResponse.json({ error: '找不到这个世界。' }, { status: 404 })
  if (world.owner_id !== user.id) {
    return NextResponse.json({ error: '只有创建者可以移除素材。' }, { status: 403 })
  }

  const state = world.workflow_state as {
    characters?: Array<{ id: string }>
    shots?: Array<{ id: string }>
  }
  const requiredTarget =
    asset.step === 3 &&
    asset.media_type === 'image' &&
    asset.shot_id &&
    state.shots?.some((shot) => shot.id === asset.shot_id)
      ? { column: 'shot_id' as const, id: asset.shot_id, label: '每个镜头至少需要保留一张起始图片。' }
      : asset.step === 4 &&
          asset.media_type === 'image' &&
          asset.character_id &&
          state.characters?.some((character) => character.id === asset.character_id)
        ? { column: 'character_id' as const, id: asset.character_id, label: '每个角色至少需要保留一张形象图片。' }
        : null
  if (requiredTarget) {
    const { count, error: countError } = await admin
      .from('worldflow_assets')
      .select('id', { count: 'exact', head: true })
      .eq('world_id', asset.world_id)
      .eq('step', asset.step)
      .eq('media_type', 'image')
      .eq(requiredTarget.column, requiredTarget.id)
      .neq('id', id)
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
    if (!count) {
      return NextResponse.json({ error: requiredTarget.label }, { status: 409 })
    }
  }

  const { error } = await admin.from('worldflow_assets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (asset.storage_path) {
    const { error: storageError } = await admin.storage
      .from('worldflow-assets')
      .remove([asset.storage_path])
    if (storageError) {
      console.error('[worldflow] orphaned local asset after row deletion', {
        assetId: id,
        storagePath: asset.storage_path,
        error: storageError.message,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
