'use client'

import { useEffect } from 'react'
import { ArchiveRouteError } from '@/components/archive-route-state'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ArchiveRouteError
      title="ARCHIVE TEMPORARILY UNAVAILABLE"
      description="This section did not finish loading. Try opening it again."
      onRetry={unstable_retry}
      returnHref="/console"
      returnLabel="DASHBOARD"
    />
  )
}
