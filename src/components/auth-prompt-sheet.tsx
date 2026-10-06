'use client'
import { ArchiveSheet } from '@/components/archive-sheet'
import { ArchiveLinkButton } from '@/components/archive-link-button'

/**
 * Shared "join to take part" prompt. Participation buttons stay pressable for
 * visitors and open this instead of being disabled (design-system §4.2); after
 * registering or logging in the visitor returns to `redirect`.
 */
export function AuthPromptSheet({
  open, onClose, title = 'Join to take part', message, redirect,
}: {
  open: boolean
  onClose: () => void
  title?: string
  message: string
  /** Path to return to after sign-up or login, e.g. "/worlds/live". */
  redirect: string
}) {
  const query = `?redirect=${encodeURIComponent(redirect)}`
  return (
    <ArchiveSheet open={open} onClose={onClose} title={title}>
      <p style={{ margin: 0, fontSize: 'var(--fs-body)', lineHeight: 1.6, color: 'var(--color-star-dim)' }}>{message}</p>
      <ArchiveLinkButton href={`/register${query}`} variant="primary">REGISTER</ArchiveLinkButton>
      <ArchiveLinkButton href={`/login${query}`} variant="secondary">I ALREADY HAVE AN ACCOUNT · LOG IN</ArchiveLinkButton>
    </ArchiveSheet>
  )
}
