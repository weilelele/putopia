import { createAdminClient } from '@/lib/supabase/server'
import StudioForm from './StudioForm'

export default async function StudioPage() {
  const admin = createAdminClient()

  const [{ data: intelList }, { data: worldsList }, { data: devicesList }] = await Promise.all([
    admin
      .from('intel')
      .select('id, title, tag, classified')
      .order('timestamp', { ascending: false }),
    admin
      .from('worlds')
      .select('id, name, description, discoverer_name')
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('devices')
      .select('id, name, location, description, knowledge')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <StudioForm
      intelList={intelList ?? []}
      worldsList={worldsList ?? []}
      devicesList={devicesList ?? []}
    />
  )
}
