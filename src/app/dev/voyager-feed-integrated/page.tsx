import { notFound } from 'next/navigation'
import { IntegratedFeedPreview } from './preview'
export const dynamic = 'force-dynamic'
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <IntegratedFeedPreview />
}
