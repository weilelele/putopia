import type { Metadata } from 'next'
import { BackLink } from '@/components/back-link'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = { title: 'Forgot password — Multiverse Collective' }

export default function ForgotPasswordPage() {
  return (
    <main className="main pilot-archive-page pilot-login-page">
      <div className="pilot-login-shell">
        <BackLink href="/login" label="Back to log in" />
        <ForgotPasswordForm />
      </div>
    </main>
  )
}
