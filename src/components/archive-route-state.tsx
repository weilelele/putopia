'use client'

import { ArchiveButton } from '@/components/archive-button'
import { ArchiveCard } from '@/components/archive-card'
import { ArchiveLinkButton } from '@/components/archive-link-button'

type ArchiveRouteStateProps = {
  label?: string
  className?: string
}

export function ArchiveRouteLoading({
  label = 'RETRIEVING ARCHIVE',
  className = 'main pilot-archive-page archive-state-page',
}: ArchiveRouteStateProps) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <div className="archive-route-state">
        <div className="archive-route-state__eyebrow">{label}</div>
        <div className="archive-route-state__title archive-route-skeleton" />
        <div className="archive-route-state__line archive-route-skeleton" />
        <div className="archive-route-state__line is-short archive-route-skeleton" />
        <div className="archive-route-state__cards" aria-hidden="true">
          {[92, 128, 104].map((height) => (
            <ArchiveCard key={height} className="archive-route-skeleton" style={{ minHeight: height }} />
          ))}
        </div>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  )
}

type ArchiveRouteErrorProps = ArchiveRouteStateProps & {
  title?: string
  description?: string
  onRetry: () => void
  returnHref?: string
  returnLabel?: string
}

export function ArchiveRouteError({
  title = 'CONNECTION INTERRUPTED',
  description = 'The archive could not be retrieved. Check your connection and try again.',
  onRetry,
  returnHref,
  returnLabel = 'RETURN',
  className = 'main pilot-archive-page archive-state-page',
}: ArchiveRouteErrorProps) {
  return (
    <div className={className} role="alert">
      <ArchiveCard className="archive-route-state archive-route-state--error">
        <div className="archive-route-state__eyebrow">SYSTEM NOTICE</div>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="archive-route-state__actions">
          <ArchiveButton onClick={onRetry} variant="primary">RETRY</ArchiveButton>
          {returnHref && (
            <ArchiveLinkButton href={returnHref} variant="ghost">{returnLabel}</ArchiveLinkButton>
          )}
        </div>
      </ArchiveCard>
    </div>
  )
}
