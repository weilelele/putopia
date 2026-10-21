import { notFound } from 'next/navigation'
import { MissionSimulator } from './mission-simulator'

export const dynamic = 'force-dynamic'
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <MissionSimulator />
}
