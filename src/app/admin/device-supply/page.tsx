import { getDeviceSupplyAdmin } from '@/lib/actions/device-supply'
import { DeviceSupplyEditor } from './supply-editor'
export const dynamic = 'force-dynamic'
export default async function DeviceSupplyPage() {
  let data: Awaited<ReturnType<typeof getDeviceSupplyAdmin>> | null = null
  try { data = await getDeviceSupplyAdmin() } catch { /* Fail closed, without exposing query errors. */ }
  if (!data) return <main className="p-4"><h1>Device supply</h1><p>Supply administration is unavailable. Human architect access and migration v88 are required.</p></main>
  return <DeviceSupplyEditor data={data} />
}
