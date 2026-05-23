'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { ApplicationInsert, ApplicationStatus } from '@/types/database'
import { getPostHogClient } from '@/lib/posthog-server'

export async function submitApplication(application: ApplicationInsert) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('applications')
    .insert({ name: '', ...application })

  if (error) return { error: error.message }

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
          email: application.email,
          reactivate_existing: false,
          send_welcome_email: false,
        }),
      })
    } catch {
      // Newsletter subscription failure doesn't block the application
    }
  }

  return { error: null }
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

  // If approved, send invite email and upgrade the applicant's role
  if (status === 'approved') {
    const { data: app } = await supabase
      .from('applications')
      .select('email')
      .eq('id', applicationId)
      .single()

    if (app?.email) {
      const admin = createAdminClient()

      // Send a fresh invite so the link isn't expired by the time the user clicks it.
      // redirectTo is used by the Supabase email template as {{ .RedirectTo }}; the
      // template must be customised in the Supabase dashboard to use token_hash format:
      //   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next={{ .RedirectTo }}
      // This prevents email-scanner prefetchers from consuming the OTP before the user clicks.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://putopia-dtogto3vt-weileleles-projects.vercel.app'
      try {
        await admin.auth.admin.inviteUserByEmail(app.email, {
          redirectTo: `${siteUrl}/register`,
        })
      } catch {
        // Invite failure doesn't block the approval
      }

      // Find the auth user by email and promote their profile
      const { data: users } = await admin.auth.admin.listUsers()
      const authUser = users?.users?.find(u => u.email === app.email)
      if (authUser) {
        // VoyagerProfileUpdate restricts to user-editable fields; role promotion
        // is an architect/admin-only operation so we cast past the RLS type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin.from('voyager_profiles') as any)
          .update({ role: 'voyager' })
          .eq('id', authUser.id)
      }
    }
  }

  revalidatePath('/architect/applications')
  const posthog = getPostHogClient()
  posthog.capture({ distinctId: user.id, event: 'application_reviewed', properties: { application_id: applicationId, status } })
  await posthog.shutdown()
  return { error: null }
}
