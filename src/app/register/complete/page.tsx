import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ActivationWelcome } from '@/components/activation-welcome'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Account activated · Multiverse Collective', robots: { index: false, follow: false } }

export default async function RegistrationCompletePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login?redirect=%2Fregister%2Fcomplete')
  const { data: profile, error: profileError } = await supabase.from('voyager_profiles').select('registered_at').eq('id', user.id).maybeSingle()
  if (profileError) throw new Error('Unable to verify account activation. Please reload to try again.')
  if (!profile?.registered_at) redirect('/register')
  return <ActivationWelcome />
}
