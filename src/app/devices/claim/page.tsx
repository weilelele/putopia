import { redirect } from 'next/navigation'

// Legacy claim links now enter the same Device entitlement flow, without checkout.
export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ batch?: string | string[] }> }) {
  const { batch } = await searchParams
  redirect(typeof batch === 'string' && batch ? `/devices/batches/${encodeURIComponent(batch)}` : '/devices')
}
