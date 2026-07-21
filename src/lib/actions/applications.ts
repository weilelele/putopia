'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { ApplicationInsert, ApplicationStatus } from '@/types/database'
import { getPostHogClient } from '@/lib/posthog-server'
import { upsertLoopsContact } from '@/lib/loops'
import { resendAccessLink } from '@/lib/actions/auth-resend'

export async function submitApplication(application: ApplicationInsert) {
  const supabase = await createClient()

  const normalizedEmail = (application.email ?? '').trim().toLowerCase()
  if (!normalizedEmail) return { error: 'Email required', inviteEmailSent: false }

  // Check for existing row to increment submission_count rather than duplicating
  const { data: existing } = await supabase
    .from('applications')
    .select('id, submission_count')
    .eq('email', normalizedEmail)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  let error: string | null = null

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('applications') as any)
      .update({ submission_count: (existing.submission_count ?? 1) + 1 })
      .eq('id', existing.id)
    if (updateError) error = (updateError as { message: string }).message
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from('applications') as any)
      .insert({ name: '', ...application, email: normalizedEmail, submission_count: 1 })
    if (insertError) error = (insertError as { message: string }).message
  }

  if (error) return { error }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://multiverseco.org'

  // Send invite email via Supabase Auth
  let inviteEmailSent = false
  let inviteErrorMessage: string | null = null
  try {
    const admin = createAdminClient()
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: `${siteUrl}/auth/callback`,
    })
    if (inviteError) {
      if (/already been registered|already registered|already exists/i.test(inviteError.message)) {
        const resend = await resendAccessLink(normalizedEmail)
        inviteEmailSent = resend.ok
        if (!resend.ok) {
          inviteErrorMessage = resend.error ?? 'Could not send access link'
          console.error('[submitApplication] resendAccessLink failed:', resend.error)
        }
      } else {
        inviteErrorMessage = inviteError.message
        console.error('[submitApplication] inviteUserByEmail failed:', inviteError.message)
      }
    } else {
      inviteEmailSent = true
    }
  } catch (err) {
    inviteErrorMessage = err instanceof Error ? err.message : 'Could not send access link'
    console.error('[submitApplication] inviteUserByEmail threw:', err)
  }

  // Sync to Loops (newsletter & marketing)
  upsertLoopsContact({
    email: normalizedEmail,
    userGroup: 'applicant',
    utmSource:   application.utm_source   ?? undefined,
    utmMedium:   application.utm_medium   ?? undefined,
    utmCampaign: application.utm_campaign ?? undefined,
    utmContent:  application.utm_content  ?? undefined,
  }).catch(() => {})

  // Subscribe to Beehiiv newsletter
  const beehiivKey = process.env.BEEHIIV_API_KEY
  const beehiivPub = process.env.BEEHIIV_PUBLICATION_ID
  if (beehiivKey && beehiivPub) {
    try {
      await fetch(`https://api.beehiiv.com/v2/publications/${beehiivPub}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${beehiivKey}`,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          reactivate_existing: false,
          send_welcome_email: false,
        }),
      })
    } catch {
      // Newsletter subscription failure doesn't block the application
    }
  }

  if (!inviteEmailSent) {
    return {
      error: 'We saved your email. Please try sending the access link again in a moment.',
      inviteEmailSent: false,
      applicationSaved: true,
      detail: inviteErrorMessage,
    }
  }

  return { error: null, inviteEmailSent: true, applicationSaved: true }
}

export async function getMyApplication() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data } = await supabase
    .from('applications')
    .select('*')
    .eq('email', user.email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

export async function getAllApplications() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function reviewApplication(
  applicationId: string,
  status: ApplicationStatus,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('applications')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (error) return { error: error.message }

  // If approved, upgrade the applicant to a full Voyager. Route this through the
  // single canonical membership entry point (provisionVoyagerMembership) so an
  // approved member ends up in the exact same state as a paid one: atomic role
  // promotion + member_no + current batch + the voyager_activated feed event.
  // (Raw role flips here used to skip all of that, producing Voyagers with no
  // member number / batch.)
  if (status === 'approved') {
    const { data: app } = await supabase
      .from('applications')
      .select('email')
      .eq('id', applicationId)
      .single()

    if (app?.email) {
      const admin = createAdminClient()
      // Find the auth user by email and provision their membership
      const { data: users } = await admin.auth.admin.listUsers()
      const authUser = users?.users?.find(u => u.email === app.email)
      if (authUser) {
        const { provisionVoyagerMembership } = await import('@/lib/actions/membership')
        await provisionVoyagerMembership(authUser.id)
      }
    }
  }

  revalidatePath('/architect/applications')
  const posthog = getPostHogClient()
  posthog.capture({ distinctId: user.id, event: 'application_reviewed', properties: { application_id: applicationId, status } })
  await posthog.shutdown()
  return { error: null }
}
