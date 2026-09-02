import { createAdminClient } from '@/lib/supabase/server'
import StudioForm from './StudioForm'
import { listDeviceLibraryEntries } from '@/lib/device-library-repository'

export const dynamic = 'force-dynamic'

export default async function StudioPage() {
  const admin = createAdminClient()

  const [{ data: intelList }, { data: worldsList }, devicesList] = await Promise.all([
    admin
      .from('intel')
      .select('id, title, tag, classified')
      .order('timestamp', { ascending: false }),
    admin
      .from('worlds')
      .select('id, name, description, discoverer_name')
      .order('created_at', { ascending: false })
      .limit(20),
    listDeviceLibraryEntries(20),
  ])

  return (
    <StudioForm
      intelList={intelList ?? []}
      worldsList={worldsList ?? []}
      devicesList={devicesList ?? []}
    />
  )
}
