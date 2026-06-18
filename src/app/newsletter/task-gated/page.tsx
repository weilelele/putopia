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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060A1A' }}>
      <div style={{
        padding: '10px 0 8px', textAlign: 'center', flexShrink: 0,
        fontFamily: 'monospace', fontSize: 'var(--fs-caption)', letterSpacing: '0.22em',
        color: 'rgba(255,107,53,0.45)',
      }}>
        ◈ NEWSLETTER PREVIEW — GROUP B (TASK GATED) — {content.weekLabel} ◈
      </div>
      <iframe
        srcDoc={previewHtml}
        style={{ flex: 1, border: 0, display: 'block' }}
        title="Newsletter Preview — Task Gated"
      />
    </div>
  )
}
