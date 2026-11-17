import { notFound } from 'next/navigation'
import type { MembershipPreview } from '@/app/voyager-initiation/membership-preview-purchase'
import { InitiationPreview } from './preview'
import { fixtureNames, type FixtureName } from './fixtures'
export const dynamic = 'force-dynamic'
export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string; from?: string; layout?: string; briefing?: string; calibration?: string; text?: string; membership?: string }> }) {
  // Read-only fixtures can be reviewed on a branch preview; never expose them on production.
  if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound()
  const { state, from, layout, briefing, calibration, text, membership } = await searchParams
  const name = fixtureNames.includes(state as FixtureName) ? state as FixtureName : 'unpaid'
  const membershipPreview: MembershipPreview | undefined = membership === 'choose' || membership === 'active' || membership === 'initial'
    ? { ownership: membership === 'choose' ? 'none' : membership === 'active' ? 'membership' : 'initial' }
    : undefined
  return <InitiationPreview membershipPreview={membershipPreview} key={`${name}:${calibration}`} name={name} deviceSource={from} paymentPlacement={layout === 'payment-first' ? 'top' : 'bottom'} briefingParam={briefing} calibrationIncomplete={calibration === 'incomplete'} largeText={text === 'large'} />
}
