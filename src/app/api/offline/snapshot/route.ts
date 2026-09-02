import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIMITS = {
  worlds: 100,
  devices: 100,
  intel: 50,
  voyagers: 100,
  stories: 50,
  votes: 30,
  functions: 30,
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const { data: profile } = user
    ? await admin
      .from('voyager_profiles')
      .select('display_name, role')
      .eq('id', user.id)
      .maybeSingle()
    : { data: null }

  const authenticated = Boolean(user)
  const role = profile?.role ?? 'guest'

  const [worldsResult, devicesResult, intelResult, voyagersResult, storiesResult, votesResult, functionsResult] = await Promise.all([
    admin
      .from('worlds')
      .select('id, name, name_en, description, image_path, gradient_from, gradient_to, lifecycle_state, discoverer_name, discovery_date, submitted_at, created_at, is_test')
      .in('lifecycle_state', authenticated ? ['proposed', 'picked', 'syncing', 'stable'] : ['stable'])
      .order('created_at', { ascending: false })
      .limit(LIMITS.worlds),
    authenticated
      ? admin
        .from('devices')
        .select('id, name, batch_id, knowledge, location, description, image_path, status, current_user_name, exploration_progress, updated_at')
        .order('updated_at', { ascending: false })
        .limit(LIMITS.devices)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from('intel')
      .select('id, title, content, timestamp, tag, images, publisher_name, created_at')
      .eq('classified', false)
      .order('timestamp', { ascending: false })
      .limit(LIMITS.intel),
    authenticated
      ? admin
        .from('voyager_profiles')
        .select('id, display_name, bio, avatar_url, role, observation_days, worlds_discovered, batch_label, joined_at')
        .in('role', ['voyager', 'architect'])
        .order('joined_at', { ascending: true })
        .limit(LIMITS.voyagers)
      : Promise.resolve({ data: [], error: null }),
    authenticated
      ? admin
        .from('stories')
        .select('id, title, excerpt, content, date, tags, youtube_id, author_name, author_id, created_at')
        .eq('is_published', true)
        .order('date', { ascending: false })
        .limit(LIMITS.stories)
      : Promise.resolve({ data: [], error: null }),
    authenticated
      ? admin
        .from('votes')
        .select('id, title, description, type, scope, options, is_active, created_at, ends_at')
        .order('created_at', { ascending: false })
        .limit(LIMITS.votes)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from('mc_functions')
      .select('id, name, status, sort_order')
      .order('sort_order', { ascending: true })
      .limit(LIMITS.functions),
  ])

  const requiredError = worldsResult.error ?? intelResult.error ?? functionsResult.error
  if (requiredError) {
    console.error('[offline/snapshot] Required content query failed.', requiredError)
    return NextResponse.json({ error: 'Offline snapshot is unavailable' }, { status: 503 })
  }

  const worlds = (worldsResult.data ?? []).filter((world) => !world.is_test).map((world) => ({
    id: world.id,
    name: world.name,
    name_en: world.name_en,
    description: world.description,
    image_path: world.image_path,
    gradient_from: world.gradient_from,
    gradient_to: world.gradient_to,
    lifecycle_state: world.lifecycle_state,
    discoverer_name: world.discoverer_name,
    discovery_date: world.discovery_date,
    submitted_at: world.submitted_at,
    created_at: world.created_at,
  }))
  const devices = devicesResult.data ?? []
  const intel = intelResult.data ?? []
  const voyagers = voyagersResult.data ?? []
  const stories = storiesResult.data ?? []
  const votes = votesResult.data ?? []
  const functions = functionsResult.data ?? []

  const warningErrors = [
    devicesResult.error,
    voyagersResult.error,
    storiesResult.error,
    votesResult.error,
  ].filter(Boolean)
  if (warningErrors.length) {
    console.warn('[offline/snapshot] Optional sections were omitted.', warningErrors)
  }

  const response = NextResponse.json({
    version: 2,
    syncedAt: new Date().toISOString(),
    viewer: {
      authenticated,
      role,
      displayName: profile?.display_name ?? null,
    },
    worlds,
    devices,
    intel,
    voyagers,
    stories,
    votes,
    functions,
  })
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Vary', 'Cookie')
  return response
}
