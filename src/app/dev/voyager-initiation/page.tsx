import { notFound } from 'next/navigation'
import { InitiationPreview } from './preview'
import { fixtureNames, type FixtureName } from './fixtures'
export const dynamic = 'force-dynamic'
export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string; from?: string; layout?: string }> }) {
  // Read-only fixtures can be reviewed on a branch preview; never expose them on production.
  if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound()
  const { state, from, layout } = await searchParams
  const name = fixtureNames.includes(state as FixtureName) ? state as FixtureName : 'unpaid'
  return <InitiationPreview key={name} name={name} deviceSource={from} paymentPlacement={layout === 'payment-first' ? 'top' : 'bottom'} />
}
