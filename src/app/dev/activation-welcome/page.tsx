import { notFound } from 'next/navigation'
import { ActivationWelcome } from '@/components/activation-welcome'

export const dynamic = 'force-dynamic'

export default async function ActivationWelcomePreview({ searchParams }: { searchParams: Promise<{ frame?: string }> }) {
  if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound()
  const query = await searchParams
  const value = query.frame === undefined ? undefined : Number(query.frame)
  const frame = value !== undefined && Number.isFinite(value) && value >= 0 ? value : undefined
  return <ActivationWelcome frame={frame} />
}
