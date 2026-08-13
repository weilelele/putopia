import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { WorldflowAsset, WorldflowWorld } from '@/lib/actions/worldflow'
import { asWorldflowAdmin } from '@/lib/worldflow-database'
import { WorldflowClient } from './worldflow-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Worldflow — Multiverse Collective',
  description: 'Parallel-world creation and production workspace.',
}

export default async function WorldflowPage({ searchParams }: { searchParams: Promise<{ world?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/worldflow')

  const admin = asWorldflowAdmin(createAdminClient())
  const [{ data: profile }, { data: worlds }, { data: assets }, query] = await Promise.all([
    admin.from('voyager_profiles').select('role, display_name').eq('id', user.id).maybeSingle(),
    admin.from('worldflow_worlds').select('*').order('updated_at', { ascending: false }),
    admin.from('worldflow_assets').select('*').order('created_at', { ascending: false }),
    searchParams,
  ])

  return <WorldflowClient
    assets={(assets ?? []) as WorldflowAsset[]}
    initialSelectedId={query.world ?? null}
    user={{
      id: user.id,
      name: profile?.display_name || user.email?.split('@')[0] || 'Creator',
      role: profile?.role ?? 'applicant',
    }}
    worlds={(worlds ?? []) as WorldflowWorld[]}
  />
}
