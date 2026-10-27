'use client'

import { ArchiveLinkButton } from '@/components/archive-link-button'

/** Served at the URL that failed, so retry reloads it; without JS, fall back to the dashboard. */
export function RetryLink() {
  return <ArchiveLinkButton href="/console" variant="primary" onClick={event => { event.preventDefault(); window.location.reload() }}>Retry connection</ArchiveLinkButton>
}
