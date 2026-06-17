'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export interface ResendResult {
  ok: boolean
  error?: string
}

/**
 * Resend an access link to a user whose invite/magic link has expired.
 * Checks that the email belongs to an existing invited account before sending.
 */
export async function resendAccessLink(email: string): Promise<ResendResult> {
  const admin = createAdminClient()
  const normalised = email.trim().toLowerCase()
  if (!normalised) return { ok: false, error: 'EMAIL REQUIRED.' }

  const authUser = await findAuthUserByEmail(normalised)
  if (!authUser) {
    return { ok: false, error: 'NO ACCOUNT FOUND FOR THIS EMAIL.' }
  }

  // `email` exists in the DB but isn't in the generated TS types — cast to bypass.
  const { data: profile } = await (admin.from('voyager_profiles' as never) as ReturnType<typeof admin.from>)
    .select('id, registered_at')
    .eq('id', authUser.id)
    .maybeSingle()

  if (!profile) return { ok: false, error: 'NO ACCOUNT FOUND FOR THIS EMAIL.' }

  // Generate a magic link and send it ourselves. Supabase Admin generateLink()
  // returns an action_link; it does not deliver an email.
  // If the user has already registered, send them to the console; otherwise to /register.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://multiverseco.org'
  const next = (profile as { registered_at?: string | null }).registered_at ? '/intel' : '/register'
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalised,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${next}`,
    },
  })

  if (error) return { ok: false, error: error.message.toUpperCase() }
  const actionLink = data.properties?.action_link
  if (!actionLink) return { ok: false, error: 'ACCESS LINK COULD NOT BE GENERATED.' }

  const send = await sendEmail({
    to: normalised,
    subject: 'Your Multiverse Collective access link',
    html: buildAccessLinkHtml(actionLink),
    text: [
      'Your Multiverse Collective access link is ready.',
      '',
      actionLink,
      '',
      'If you did not request this, you can ignore this message.',
    ].join('\n'),
  })
  if (send.error) return { ok: false, error: send.error.toUpperCase() }
  return { ok: true }
}

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient()
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found
    if (!data.nextPage) return null
    page = data.nextPage
  }
}

function buildAccessLinkHtml(actionLink: string) {
  return `
    <div style="font-family:Courier New,monospace;background:#0A0E27;color:#F5F5F5;padding:28px;line-height:1.6">
      <div style="color:#FF6B35;letter-spacing:.18em;font-size:12px;margin-bottom:12px">MULTIVERSE COLLECTIVE</div>
      <h1 style="font-size:20px;margin:0 0 12px;color:#F5F5F5">Your access link is ready.</h1>
      <p style="color:rgba(245,245,245,.72);font-size:14px;margin:0 0 20px">
        Use the secure link below to continue your registration or enter the Collective.
      </p>
      <a href="${actionLink}" style="display:inline-block;background:#FF6B35;color:#070912;text-decoration:none;font-weight:bold;padding:12px 18px;letter-spacing:.08em">
        OPEN ACCESS LINK
      </a>
      <p style="color:rgba(245,245,245,.45);font-size:12px;margin:22px 0 0">
        If the button does not work, paste this URL into your browser:<br>
        <span style="word-break:break-all">${actionLink}</span>
      </p>
    </div>
  `
}
