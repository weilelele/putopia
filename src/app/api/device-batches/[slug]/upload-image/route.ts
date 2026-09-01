import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to upload.' }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: profile }, { data: unit }] = await Promise.all([
    admin.from('voyager_profiles').select('role').eq('id', user.id).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from('device_batch_units') as any)
      .select('id')
      .eq('batch_slug', slug)
      .eq('user_id', user.id)
      .in('status', ['assigned', 'preparing', 'shipped', 'delivered', 'return_pending'])
      .limit(1)
      .maybeSingle(),
  ])
  if (profile?.role !== 'architect' && !unit) {
    return NextResponse.json({ error: 'Only confirmed holders can upload.' }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose an image.' }, { status: 400 })
  }
  const extension = IMAGE_EXTENSIONS.get(file.type)
  if (!extension) {
    return NextResponse.json({ error: 'Use a JPEG, PNG, or WebP image.' }, { status: 415 })
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Images must be 5 MB or smaller.' }, { status: 413 })
  }

  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  const path = `${user.id}/device-batches/${safeSlug}/${randomUUID()}.${extension}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error } = await admin.storage
    .from('comment-images')
    .upload(path, bytes, { contentType: file.type, upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = admin.storage.from('comment-images').getPublicUrl(path)
  return NextResponse.json({ path: data.publicUrl }, { status: 201 })
}

