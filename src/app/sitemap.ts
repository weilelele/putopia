import type { MetadataRoute } from 'next'
import { getPublicIntel } from '@/lib/actions/intel'
import { getAllWorlds } from '@/lib/actions/worlds'
import { SITE_URL } from '@/lib/site-seo'

export const dynamic = 'force-dynamic'

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/voyager-initiation', priority: 1, changeFrequency: 'weekly' },
  { path: '/console', priority: 0.8, changeFrequency: 'daily' },
  { path: '/intel', priority: 0.8, changeFrequency: 'daily' },
  { path: '/worlds', priority: 0.8, changeFrequency: 'daily' },
  { path: '/devices', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/voyagers', priority: 0.6, changeFrequency: 'daily' },
  { path: '/worlds/live', priority: 0.6, changeFrequency: 'daily' },
  { path: '/voyager-pack', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/terms/initiation', priority: 0.2, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
]

/** A failed data source drops its entries rather than the whole sitemap. */
async function settle<T>(load: () => Promise<T[]>): Promise<T[]> {
  try { return await load() } catch { return [] }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [intel, worlds] = await Promise.all([settle(getPublicIntel), settle(getAllWorlds)])
  return [
    ...STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({ url: `${SITE_URL}${path}`, priority, changeFrequency })),
    ...intel.map((entry) => ({ url: `${SITE_URL}/intel/${encodeURIComponent(entry.id)}`, lastModified: entry.timestamp, priority: 0.6 })),
    ...worlds.map((world) => ({ url: `${SITE_URL}/worlds/${encodeURIComponent(world.id)}`, lastModified: world.created_at, priority: 0.5 })),
  ]
}
