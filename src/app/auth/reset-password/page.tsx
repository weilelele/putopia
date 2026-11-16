import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { BackLink } from '@/components/back-link'
import { hasRecoveryContext } from '@/lib/supabase/password-recovery'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = { title: 'Reset password — Multiverse Collective', robots: { index: false } }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const hasLink = !(await searchParams).invalid && hasRecoveryContext(await cookies())
  return (
    <main className="main pilot-archive-page pilot-login-page">
      <div className="pilot-login-shell">
        <BackLink href="/login" label="Back to log in" />
        <header className="pilot-login-heading">
          <h1 className="pilot-login-title">RESET PASSWORD</h1>
        </header>
        <ResetPasswordForm hasLink={hasLink} />
      </div>
    </main>
  )
}
