/* Newsletter preview — Group A (direct purchase)
   Visit /newsletter/direct to preview in browser. */

export const metadata = { title: 'Newsletter Preview — Direct', robots: 'noindex' }
export const dynamic = 'force-dynamic'

import { getWeeklyNewsletterContent, buildDirectHtml } from '@/lib/newsletter'

export default async function DirectNewsletterPage() {
  const content = await getWeeklyNewsletterContent()
  const html = buildDirectHtml(content, '[CODENAME]')
  const previewHtml = html.replace(/https:\/\/www\.multiverseco\.org/g, '')

  return (
    <div className="newsletter-preview-page">
      <div className="newsletter-preview-bar">
        NEWSLETTER PREVIEW — GROUP A (DIRECT) — {content.weekLabel}
      </div>
      <iframe
        srcDoc={previewHtml}
        style={{ flex: 1, border: 0, display: 'block' }}
        title="Newsletter Preview — Direct"
      />
    </div>
  )
}
