import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// Additive tables have not yet been added to the generated database types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const webPushDb = () => createAdminClient() as any

export async function webPushConfig(): Promise<{ public_key: string; private_key: string; sending_enabled: boolean; subject: string }> {
  const db = webPushDb()
  const { data, error } = await db.from('web_push_config').select('public_key,private_key,sending_enabled,subject').eq('id', 1).maybeSingle()
  if (error) throw new Error('Web Push configuration storage unavailable')
  if (data) return data
  // Keep the signing key exclusively in server-managed storage. No new client
  // env or public key exposure beyond the public VAPID key is required.
  const keys = webpush.generateVAPIDKeys()
  const { error: insertError } = await db.from('web_push_config').insert({ id: 1, public_key: keys.publicKey, private_key: keys.privateKey, subject: 'https://www.multiverseco.org', sending_enabled: false })
  if (insertError && insertError.code !== '23505') throw new Error('Could not initialize Web Push configuration')
  const { data: configured, error: readError } = await db.from('web_push_config').select('public_key,private_key,sending_enabled,subject').eq('id', 1).single()
  if (readError || !configured) throw new Error('Could not load Web Push configuration')
  return configured
}

export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin
}

export async function webPushUser() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  return user
}

export async function authorizeWebCampaign(request: Request) {
  const expected = process.env.WEB_PUSH_CAMPAIGN_SECRET ?? ''
  const provided = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  if (expected.length >= 32 && expected.length === provided.length && timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return
  if (!sameOrigin(request)) throw new Error('Unauthorized')
  const user = await webPushUser()
  if (!user) throw new Error('Unauthorized')
  const { data } = await webPushDb().from('voyager_profiles').select('role').eq('id', user.id).maybeSingle()
  if (data?.role !== 'architect') throw new Error('Unauthorized')
}
