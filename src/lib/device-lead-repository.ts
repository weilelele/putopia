import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { DeviceLeadOption } from './device-lead'

export async function listDeviceLeadOptions(): Promise<DeviceLeadOption[]> {
  const client = await createClient()
  const { data, error } = await client.from('voyager_profiles')
    .select('id, display_name, role, avatar_url, location, bio')
    .in('role', ['architect', 'voyager']).order('display_name')
  if (error) throw new Error('Could not load Field Lead members. Please try again.')
  return data ?? []
}
