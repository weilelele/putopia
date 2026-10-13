import { feedSession } from '@/lib/voyager-feed-server'
import { canReadVoyagerFeed, validFeedId } from '@/lib/voyager-feed'
export const dynamic = 'force-dynamic'
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
  try {
    const { id } = await params
    const { db, viewer } = await feedSession()
    if (!validFeedId(id) || !canReadVoyagerFeed(viewer)) return new Response(null, { status: 404, headers })
    const { data: entry } = await db.from('voyager_feed_entries').select('image_path').eq('id', id).maybeSingle()
    if (!entry?.image_path) return new Response(null, { status: 404, headers })
    const { data, error } = await db.storage.from('voyager-feed').download(entry.image_path)
    if (error || !data) return new Response(null, { status: 404, headers })
    return new Response(data, { headers: { ...headers, 'Content-Type': data.type, 'Content-Disposition': 'inline' } })
  } catch { return new Response(null, { status: 503, headers }) }
}
