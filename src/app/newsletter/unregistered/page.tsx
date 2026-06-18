/* Newsletter preview — Unregistered users (have email but haven't completed signup)
   Visit /newsletter/unregistered to preview in browser. */

export const metadata = { title: 'Newsletter Preview — Unregistered', robots: 'noindex' }
export const dynamic = 'force-dynamic'

import { getWeeklyNewsletterContent, buildUnregisteredHtml } from '@/lib/newsletter'

export default async function UnregisteredNewsletterPage() {
  const { activeUsers, devices, weekLabel } = await getWeeklyNewsletterContent()
  const html = buildUnregisteredHtml(activeUsers, devices)
  const previewHtml = html.replace(/https:\/\/multiverseco\.org/g, '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060A1A' }}>
      <div style={{
        padding: '10px 0 8px', textAlign: 'center', flexShrink: 0,
        fontFamily: 'monospace', fontSize: 'var(--fs-caption)', letterSpacing: '0.22em',
        color: 'rgba(255,107,53,0.45)',
      }}>
        ◈ NEWSLETTER PREVIEW — UNREGISTERED USERS — {weekLabel} ◈
      </div>
      <iframe
        srcDoc={previewHtml}
        style={{ flex: 1, border: 0, display: 'block' }}
        title="Newsletter Preview — Unregistered"
      />
    </div>
  )
}
