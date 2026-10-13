import { notFound } from 'next/navigation'
import { VoyagerFeedPrototype } from './prototype'

export const dynamic = 'force-dynamic'
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <VoyagerFeedPrototype />
}
