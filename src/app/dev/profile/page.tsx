import { notFound } from 'next/navigation'
import { ProfilePreview } from './preview'

export const dynamic = 'force-dynamic'
export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { state } = await searchParams
  const mode = state === 'voyager' || state === 'holder' || state === 'architect' ? state : 'applicant'
  return <ProfilePreview key={mode} mode={mode} />
}
