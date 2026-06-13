/* Newsletter preview — Unregistered users (have email but haven't completed signup)
   Visit /newsletter/unregistered to preview in browser. */

export const metadata = { title: 'Newsletter Preview — Unregistered', robots: 'noindex' }

import {
  buildUnregisteredNarrativeHtml,
  EMAIL_HEAD,
  EMAIL_HEADER_UNREGISTERED,
  CTA_UNREGISTERED,
  EMAIL_TAIL,
} from '@/lib/newsletter'

/** Build the full email HTML for unregistered users. */
export function buildUnregisteredHtml(): string {
  const narrativeHtml = buildUnregisteredNarrativeHtml()
  return (
    EMAIL_HEAD +
    EMAIL_HEADER_UNREGISTERED +
    narrativeHtml +
    CTA_UNREGISTERED +
    // Minimal footer for unregistered (no console link)
    `
  <tr><td style="height:24px;"></td></tr>
  <tr><td style="border-top:1px solid rgba(255,107,53,0.08);padding-top:18px;">
    <div style="font-size:8px;color:rgba(245,245,245,0.15);letter-spacing:0.06em;line-height:1.8;text-align:center;">
      MULTIVERSE.COLLECTIVE · BUILDING BETTER WORLDS, TOGETHER.
    </div>
  </td></tr>` +
    EMAIL_TAIL
  )
}

export default function UnregisteredNewsletterPage() {
  const html = buildUnregisteredHtml()
  const previewHtml = html.replace(/https:\/\/putopia\.vercel\.app/g, '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060A1A' }}>
      <div style={{
        padding: '10px 0 8px', textAlign: 'center', flexShrink: 0,
        fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.22em',
        color: 'rgba(255,107,53,0.45)',
      }}>
        ◈ NEWSLETTER PREVIEW — UNREGISTERED USERS ◈
      </div>
      <iframe
        srcDoc={previewHtml}
        style={{ flex: 1, border: 0, display: 'block' }}
        title="Newsletter Preview — Unregistered"
      />
    </div>
  )
}
