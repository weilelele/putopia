import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-seo'

/** Public pages stay open to search and AI answer engines; account, admin and tooling routes do not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/studio', '/api/', '/auth/', '/dev/', '/profile', '/register', '/login', '/activate', '/ui-kit'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
