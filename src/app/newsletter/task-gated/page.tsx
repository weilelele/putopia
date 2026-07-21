/* Newsletter preview — Group B (task_gated)
   Visit /newsletter/task-gated to preview in browser. */

export const metadata = { title: 'Newsletter Preview — Task Gated', robots: 'noindex' }
export const dynamic = 'force-dynamic'

import { getWeeklyNewsletterContent, buildTaskGatedHtml } from '@/lib/newsletter'

export default async function TaskGatedNewsletterPage() {
  const content = await getWeeklyNewsletterContent()
  const html = buildTaskGatedHtml(content, '[CODENAME]')
  const previewHtml = html.replace(/https:\/\/www\.multiverseco\.org/g, '')

  return (
    <div className="newsletter-preview-page">
      <div className="newsletter-preview-bar">
        NEWSLETTER PREVIEW — GROUP B (TASK GATED) — {content.weekLabel}
      </div>
      <iframe
        srcDoc={previewHtml}
        style={{ flex: 1, border: 0, display: 'block' }}
        title="Newsletter Preview — Task Gated"
      />
    </div>
  )
}
