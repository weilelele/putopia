import { permanentRedirect } from 'next/navigation'

const WORLDFLOW_URL = 'https://worldflow.multiverseco.org'

export default async function WorldflowPage({ searchParams }: { searchParams: Promise<{ world?: string }> }) {
  const { world } = await searchParams
  const destination = new URL(WORLDFLOW_URL)
  if (world) destination.searchParams.set('world', world)
  permanentRedirect(destination.toString())
}
