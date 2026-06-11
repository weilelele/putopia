import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fd = await req.formData()
  const worldId = fd.get('worldId') as string | null
  const file    = fd.get('image') as File | null

  if (!worldId || !file) {
    return NextResponse.json({ error: 'Missing worldId or image' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })
  }

  // Verify the user submitted this world
  const admin = createAdminClient()
  const { data: world } = await admin
    .from('worlds')
    .select('id, submitted_by')
    .eq('id', worldId)
    .single()

  if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 })
  if (world.submitted_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${worldId}/cover.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('world-images')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('world-images').getPublicUrl(path)

  // Persist the image path on the world record
  await admin.from('worlds').update({ image_path: publicUrl }).eq('id', worldId)

  return NextResponse.json({ url: publicUrl })
}
