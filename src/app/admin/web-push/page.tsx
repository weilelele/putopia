import { redirect } from 'next/navigation'
import { webPushConfig, webPushDb, webPushUser } from '@/lib/push/web-server'
import { WebPushPreview } from './preview'

export const dynamic = 'force-dynamic'

export default async function WebPushAdminPage() {
  const user = await webPushUser()
  if (!user) redirect('/login?redirect=/admin/web-push')
  const db = webPushDb()
  const { data: profile } = await db.from('voyager_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'architect') return <p>Architect access required.</p>
  const config = await webPushConfig()
  const [subscriptions, attempts, accepted, displayed, clicked] = await Promise.all([
    db.from('web_push_subscriptions').select('id', { count: 'exact', head: true }).eq('enabled', true),
    db.from('web_push_deliveries').select('id', { count: 'exact', head: true }),
    db.from('web_push_deliveries').select('id', { count: 'exact', head: true }).eq('status', 'provider_accepted'),
    db.from('web_push_deliveries').select('id', { count: 'exact', head: true }).not('displayed_at', 'is', null),
    db.from('web_push_deliveries').select('id', { count: 'exact', head: true }).not('clicked_at', 'is', null),
  ])
  if ([subscriptions, attempts, accepted, displayed, clicked].some(result => result.error)) return <p>Push storage is unavailable. Counts could not be confirmed.</p>
  return <section className="grid gap-4">
    <h1>Android / Web Push</h1>
    <p>Real sending: {config.sending_enabled ? 'ENABLED' : 'LOCKED — awaiting approval'}</p>
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {[
        ['Opted-in devices', subscriptions.count], ['Send attempts', attempts.count],
        ['Provider accepted', accepted.count], ['Displayed', displayed.count], ['Clicked', clicked.count],
      ].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value ?? 0}</dd></div>)}
    </dl>
    <p>Provider acceptance is not proof of display. Display and click receipts are counted separately.</p>
    <WebPushPreview />
  </section>
}
