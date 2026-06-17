import { getOnboardingVariants } from '@/lib/actions/onboarding-variants'
import OnboardingClient from './onboarding-client'

// Keep this route dynamic (no build-time prerender / DB dependency). The
// white-screen-on-ad-click problem is solved by loading.tsx (instant paint) +
// caching getOnboardingVariants itself (so the DB isn't hit on every click).
export const dynamic = 'force-dynamic'

export default async function NewPage() {
  const variants = await getOnboardingVariants()
  return <OnboardingClient variants={variants} />
}
