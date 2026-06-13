/* Newsletter preview — Group A (direct purchase)
   Visit /newsletter/direct to preview in browser. */

export const metadata = { title: 'Newsletter Preview — Direct', robots: 'noindex' }
export const dynamic = 'force-dynamic'

import { getWeeklyNewsletterContent, buildDirectHtml } from '@/lib/newsletter'

export default async function DirectNewsletterPage() {
  const content = await getWeeklyNewsletterContent()
  const html = buildDirectHtml(content, '[CODENAME]')
  const previewHtml = html.replace(/https:\/\/putopia\.vercel\.app/g, '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060A1A' }}>
      <div style={{
        padding: '10px 0 8px', textAlign: 'center', flexShrink: 0,
        fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.22em',
        color: 'rgba(255,107,53,0.45)',
      }}>
        ◈ NEWSLETTER PREVIEW — GROUP A (DIRECT) — {content.weekLabel} ◈
      </div>
      <iframe
        srcDoc={previewHtml}
        style={{ flex: 1, border: 0, display: 'block' }}
        title="Newsletter Preview — Direct"
      />
    </div>
  )
}
