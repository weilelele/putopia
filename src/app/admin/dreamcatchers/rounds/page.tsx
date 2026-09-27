import { requireDreamcatcherArchitect } from '@/lib/dreamcatcher-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { retryDreamcatcherGeneration } from '@/lib/actions/dreamcatcher-admin'
import { ArchiveButton } from '@/components/archive-button'
import { ArchiveLinkButton } from '@/components/archive-link-button'
import { ArchiveCard } from '@/components/archive-card'
export const dynamic = 'force-dynamic'

export default async function DreamcatcherRoundsAdminPage() {
  await requireDreamcatcherArchitect()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any).from('dreamcatcher_generation_requests')
    .select('id,status,attempt,last_error,created_at,dreamcatcher_rounds(world_id,round_number,status)')
    .order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error('Parallax Array migration or round records are unavailable')
  const rows = (data ?? []) as { id: string; status: string; attempt: number; last_error: string | null; dreamcatcher_rounds: { world_id: string; round_number: number; status: string } }[]
  return <main className="main pilot-archive-page archive-detail-page">
    <h1>Parallax Array rounds</h1>
    <ArchiveLinkButton href="/admin/dreamcatchers" variant="ghost">BACK TO DEVICES</ArchiveLinkButton>
    {!process.env.COSMO_MONGO_URI && <p>The existing Cosmo read connection is not configured. Set COSMO_MONGO_URI before accepting dreams.</p>}
    <p>Latest 100 round records. Requests use the existing Cosmo inbox; sync retries do not create another generation request.</p>
    {rows.map(row => <ArchiveCard key={row.id} className="archive-inline-panel">
      <ArchiveLinkButton href={`/worlds/${encodeURIComponent(row.dreamcatcher_rounds.world_id)}`} variant="ghost">{row.dreamcatcher_rounds.world_id} · ROUND {row.dreamcatcher_rounds.round_number}</ArchiveLinkButton>
      <p>Device: {row.dreamcatcher_rounds.status} · Generation: {row.status} · Attempt {row.attempt}</p>
      {row.last_error && <p>{row.last_error}</p>}
      {row.status === 'failed' && row.attempt < 9 && <form action={retryDreamcatcherGeneration}><input type="hidden" name="requestId" value={row.id} /><ArchiveButton type="submit">RETRY SYNC</ArchiveButton></form>}
    </ArchiveCard>)}
    {!rows.length && <p>No round generation requests yet.</p>}
  </main>
}
