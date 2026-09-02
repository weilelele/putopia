import { notFound, redirect } from 'next/navigation'
import { DeviceClaimClient } from '../_components/device-claim-client'
import { getPublicDeviceBatch } from '@/lib/device-batch-repository'

export const dynamic = 'force-dynamic'

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string | string[] }>
}) {
  const query = await searchParams
  const slug = typeof query.batch === 'string' ? query.batch : null
  if (!slug) redirect('/devices')
  const batch = await getPublicDeviceBatch(slug)

  if (!batch) notFound()

  return <DeviceClaimClient batch={batch} />
}
