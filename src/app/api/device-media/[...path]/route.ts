import { isDeviceMediaPath, referencesPublishedMedia } from '@/lib/device-media-access'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const headers = { 'Cache-Control': 'private, no-store' }
const unavailable = () => new Response(null, { status: 404, headers })

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/')
  if (!isDeviceMediaPath(path)) return unavailable()

  const admin = createAdminClient()
  // Published snapshots alone grant anonymous access; working drafts never do.
  const { data: batches, error } = await admin.from('device_batches')
    .select('published_content').eq('publication_status', 'published')
  if (error) return unavailable()
  const published = (batches as { published_content: unknown }[] | null)?.some((batch) =>
    referencesPublishedMedia(batch.published_content, `/api/device-media/${path}`))

  if (!published) {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return unavailable()
    const { data: profile } = await client.from('voyager_profiles')
      .select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'architect') return unavailable()
  }

  const { data, error: signingError } = await admin.storage
    .from('device-update-media').createSignedUrl(path, 60)
  if (signingError || !data) return unavailable()
  return new Response(null, { status: 307, headers: { ...headers, Location: data.signedUrl } })
}
