import { getOnboardingVariants } from '@/lib/actions/onboarding-variants'
import OnboardingClient from './onboarding-client'

// Personalized funnel page — always read the latest variant copy from the DB
// (so admin edits show up immediately, no stale cache).
export const dynamic = 'force-dynamic'

export default async function NewPage() {
  const variants = await getOnboardingVariants()
  return <OnboardingClient variants={variants} />
}
