import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GEO_SLUGS, geoPage, isGeoSlug } from '@/lib/geo-pages'
import { GeoArticle, geoMetadata, membershipOptions } from '../geo-article'

export const dynamicParams = false

export function generateStaticParams() {
  return GEO_SLUGS.map((slug) => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return isGeoSlug(slug) ? geoMetadata(geoPage(slug, membershipOptions())) : {}
}

export default async function AboutTopicPage({ params }: Props) {
  const { slug } = await params
  if (!isGeoSlug(slug)) notFound()
  return <GeoArticle page={geoPage(slug, membershipOptions())} />
}
