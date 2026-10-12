import { redirect } from 'next/navigation'

export default async function DiscussionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/devices/batches/${encodeURIComponent(slug)}`)
}
