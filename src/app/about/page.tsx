import type { Metadata } from 'next'
import { geoPage } from '@/lib/geo-pages'
import { GeoArticle, geoMetadata, membershipOptions } from './geo-article'

export function generateMetadata(): Metadata {
  return geoMetadata(geoPage(null, membershipOptions()))
}

export default function AboutPage() {
  return <GeoArticle page={geoPage(null, membershipOptions())} />
}
