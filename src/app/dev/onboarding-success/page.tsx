import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OnboardingSuccessPreview } from './preview'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Onboarding success · Preview', robots: { index: false, follow: false } }

export default async function Page({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound()
  const { variant } = await searchParams
  return <OnboardingSuccessPreview variant={variant === 'control' ? 'control' : 'test'} />
}
