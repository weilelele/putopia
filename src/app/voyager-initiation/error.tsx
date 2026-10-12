'use client'
import { ArchiveRouteError } from '@/components/archive-route-state'
export default function Error({ reset }: { reset: () => void }) {
  return <ArchiveRouteError title="INITIATION UNAVAILABLE" description="We could not load your membership and order records. Please try again." onRetry={reset} returnHref="/console" returnLabel="DASHBOARD" />
}
