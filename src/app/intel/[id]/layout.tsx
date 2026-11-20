import { createAdminClient } from '@/lib/supabase/server'
import { serializeJsonLd } from '@/lib/site-seo'
import { intelVideoJsonLd } from '@/lib/video-seo'

/** Public Intel posts with a video carry VideoObject markup in the server HTML; the page itself renders on the client. */
async function publicVideoMarkup(id: string) {
  try {
    const { data } = await createAdminClient()
      .from('intel')
      .select('id, title, content, timestamp, classified, images, video_url, video_poster_url')
      .eq('id', id)
      .eq('classified', false)
      .not('video_url', 'is', null)
      .maybeSingle()
    return data ? intelVideoJsonLd(data) : null
  } catch {
    return null
  }
}

export default async function IntelEntryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const video = await publicVideoMarkup(id)
  return <>
    {video && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(video) }} />}
    {children}
  </>
}
