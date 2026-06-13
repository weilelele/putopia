/* Newsletter preview — Group B (task_gated)
   Visit /newsletter/task-gated to preview in browser.
   TASK_GATED_HTML is also exported for the email send action. */

export const metadata = { title: 'Newsletter Preview — Task Gated', robots: 'noindex' }
export const dynamic = 'force-dynamic'

import {
  getWeeklyNewsletterContent,
  EMAIL_HEAD,
  EMAIL_HEADER_REGISTERED,
  CTA_TASK_GATED,
  EMAIL_FOOTER,
  EMAIL_TAIL,
} from '@/lib/newsletter'

export default async function TaskGatedNewsletterPage() {
  const { narrativeHtml, weekLabel } = await getWeeklyNewsletterContent()
  const html = buildTaskGatedHtml(narrativeHtml)
  const previewHtml = html.replace(/https:\/\/putopia\.vercel\.app/g, '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060A1A' }}>
      <div style={{
        padding: '10px 0 8px', textAlign: 'center', flexShrink: 0,
        fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.22em',
        color: 'rgba(255,107,53,0.45)',
      }}>
        ◈ NEWSLETTER PREVIEW — GROUP B (TASK GATED) — {weekLabel} ◈
      </div>
      <iframe
        srcDoc={previewHtml}
        style={{ flex: 1, border: 0, display: 'block' }}
        title="Newsletter Preview — Task Gated"
      />
    </div>
  )
}

/** Build the full email HTML for Group B (task_gated). */
export function buildTaskGatedHtml(narrativeHtml: string): string {
  return (
    EMAIL_HEAD +
    EMAIL_HEADER_REGISTERED +
    narrativeHtml +
    CTA_TASK_GATED +
    EMAIL_FOOTER +
    EMAIL_TAIL
  )
}

/**
 * TASK_GATED_HTML — static snapshot used by the legacy email send action.
 * @deprecated Prefer calling buildTaskGatedHtml(narrativeHtml) with fresh AI content.
 */
export const TASK_GATED_HTML = buildTaskGatedHtml(
  `
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.12);overflow:hidden;">
    <div style="height:1px;background:rgba(255,107,53,0.08);"></div>
    <div style="padding:22px 24px 24px;">
      <div style="font-size:8px;letter-spacing:0.32em;color:rgba(255,107,53,0.42);margin-bottom:18px;">— THIS WEEK IN THE COLLECTIVE —</div>
      <p style="margin:0;font-size:12px;color:rgba(245,245,245,0.72);line-height:1.95;font-family:'Space Mono',ui-monospace,monospace;">
        The Collective has been active this week. Check the console for the latest updates.
      </p>
    </div>
  </td></tr>`
)
