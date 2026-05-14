'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { ApplicationInsert, ApplicationStatus } from '@/types/database'

export async function submitApplication(application: ApplicationInsert) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('applications')
    .insert(application)

  if (error) return { error: error.message }
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

  // If approved, upgrade the applicant's role using service role key
  if (status === 'approved') {
    const { data: app } = await supabase
      .from('applications')
      .select('email')
      .eq('id', applicationId)
      .single()

    if (app?.email) {
      const admin = await createAdminClient()
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
  return { error: null }
}
