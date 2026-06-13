/* Newsletter preview — Group A (direct purchase)
   Visit /newsletter/direct to preview in browser.
   DIRECT_HTML is also exported for the email send action. */

export const metadata = { title: 'Newsletter Preview — Direct', robots: 'noindex' }
export const dynamic = 'force-dynamic'

import {
  getWeeklyNewsletterContent,
  EMAIL_HEAD,
  EMAIL_HEADER_REGISTERED,
  CTA_DIRECT,
  EMAIL_FOOTER,
  EMAIL_TAIL,
} from '@/lib/newsletter'

export default async function DirectNewsletterPage() {
  const { narrativeHtml, weekLabel } = await getWeeklyNewsletterContent()
  const html = buildDirectHtml(narrativeHtml)
  // Strip production domain so preview links resolve to current host
  const previewHtml = html.replace(/https:\/\/putopia\.vercel\.app/g, '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060A1A' }}>
      <div style={{
        padding: '10px 0 8px', textAlign: 'center', flexShrink: 0,
        fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.22em',
        color: 'rgba(255,107,53,0.45)',
      }}>
        ◈ NEWSLETTER PREVIEW — GROUP A (DIRECT) — {weekLabel} ◈
      </div>
      <iframe
        srcDoc={previewHtml}
        style={{ flex: 1, border: 0, display: 'block' }}
        title="Newsletter Preview — Direct"
      />
    </div>
  )
}

/** Build the full email HTML for Group A (direct purchase). */
export function buildDirectHtml(narrativeHtml: string): string {
  return (
    EMAIL_HEAD +
    EMAIL_HEADER_REGISTERED +
    narrativeHtml +
    CTA_DIRECT +
    EMAIL_FOOTER +
    EMAIL_TAIL
  )
}

/**
 * DIRECT_HTML — static snapshot used by the legacy email send action.
 * @deprecated Prefer calling buildDirectHtml(await getWeeklyNewsletterContent().narrativeHtml)
 *             to get fresh AI-generated content.
 */
export const DIRECT_HTML = buildDirectHtml(
  /* placeholder narrative – replaced at send time */ `
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
