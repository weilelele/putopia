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
