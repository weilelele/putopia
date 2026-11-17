'use client'

import { useActionState } from 'react'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveField } from '@/components/archive-field'
import { ArchiveInput } from '@/components/archive-input'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { resetPassword } from './actions'

export function ResetPasswordForm({ hasLink }: { hasLink: boolean }) {
  const [state, action, pending] = useActionState(resetPassword, null)
  if (!hasLink || state?.invalidLink) return (
    <div className="pilot-login-form">
      <p className="archive-form-message is-error" role="alert">
        {state?.invalidLink ? state.error : 'This reset link is missing, expired, or has already been used.'}
      </p>
      <ArchiveLinkButton href="/auth/forgot-password" fullWidth variant="primary">REQUEST A NEW LINK</ArchiveLinkButton>
    </div>
  )

  return (
    <form className="pilot-login-form" action={action}>
      <ArchiveField htmlFor="new-password" label="NEW PASSWORD" helpText="Use at least 8 characters.">
        <ArchiveInput type="password" name="password" autoComplete="new-password" minLength={8} required />
      </ArchiveField>
      <ArchiveField htmlFor="confirm-password" label="CONFIRM NEW PASSWORD">
        <ArchiveInput type="password" name="confirmPassword" autoComplete="new-password" minLength={8} required />
      </ArchiveField>
      {state?.error && <p className="archive-form-message is-error" role="alert">{state.error}</p>}
      <ArchiveButton type="submit" fullWidth disabled={pending} aria-busy={pending}>
        {pending ? 'SAVING…' : 'RESET PASSWORD'}
      </ArchiveButton>
    </form>
  )
}
