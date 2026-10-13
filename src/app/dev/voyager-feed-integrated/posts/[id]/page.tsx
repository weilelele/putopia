import { notFound } from 'next/navigation'
import { IntegratedFeedPreview } from '../../preview'
export const dynamic = 'force-dynamic'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <IntegratedFeedPreview postId={(await params).id} />
}
