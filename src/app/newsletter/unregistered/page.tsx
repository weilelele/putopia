/* Newsletter preview — Unregistered users (have email but haven't completed signup)
   Visit /newsletter/unregistered to preview in browser. */

export const metadata = { title: 'Newsletter Preview — Unregistered', robots: 'noindex' }
export const dynamic = 'force-dynamic'

import { getWeeklyNewsletterContent, buildUnregisteredHtml } from '@/lib/newsletter'

export default async function UnregisteredNewsletterPage() {
  const { activeUsers, devices, weekLabel } = await getWeeklyNewsletterContent()
  const html = buildUnregisteredHtml(activeUsers, devices)
  const previewHtml = html.replace(/https:\/\/www\.multiverseco\.org/g, '')

  return (
    <div className="newsletter-preview-page">
      <div className="newsletter-preview-bar">
        NEWSLETTER PREVIEW — UNREGISTERED USERS — {weekLabel}
      </div>
      <iframe
        srcDoc={previewHtml}
        style={{ flex: 1, border: 0, display: 'block' }}
        title="Newsletter Preview — Unregistered"
      />
    </div>
  )
}
