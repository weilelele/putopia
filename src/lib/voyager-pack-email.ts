// Initial Voyager Pack — purchase confirmation email.
//
// Sent once after a member's Initial Voyager Pack order is confirmed. Covers:
//   1. Physical items are in assembly and ship with the first batch.
//   2. The three perks unlocked (early-bird Console, internal voting, inner intel).
//   3. An invitation to take part — reply to this transmission, or reach the
//      three Architects on X.
//
// Visual shell matches the deep-space terminal style used across all
// Multiverse Collective emails (see src/lib/signal/engagement.ts → shell()).

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
const ICON = `${SITE}/assets/vi-icon.png`
const WORDMARK = `${SITE}/assets/vi-wordmark.png`

// Pack product photo. Defaults to the deployed public asset; overridable via env
// so a pre-deploy test can point at a live URL (e.g. a GitHub-raw URL on the branch).
const PACK_IMG = process.env.PACK_EMAIL_IMAGE_URL ?? `${SITE}/voyager-pack/pack-email.png`

/** Reply-to inbox a human actually monitors, so "just reply" works. */
const REPLY_TO = process.env.COLLECTIVE_REPLY_TO ?? 'voyagers@multiverseco.org'

const ARCHITECTS: { name: string; handle: string; href: string; avatar: string | null }[] = [
  {
    name: 'Ryo Tanaka',
    handle: 'ryotanakaputo',
    href: 'https://x.com/ryotanakaputo',
    avatar: 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/avatars/86fadca3-8739-4553-9179-c4d0e84895ee/avatar.jpg',
  },
  {
    name: 'Valentina Cruz',
    handle: 'ValentinaCruzi',
    href: 'https://x.com/ValentinaCruzi',
    avatar: 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/avatars/403b32a7-8d85-4cdd-9c7f-4f2c7919d726/avatar.jpg',
  },
  {
    name: 'Weile Yang',
    handle: 'weilelele',
    href: 'https://x.com/weilelele',
    avatar: 'https://oxwfnmcwovxnrvagxzdz.supabase.co/storage/v1/object/public/avatars/6fc6e5cd-35fe-4812-ac04-f9074c6ee0c7/avatar.png',
  },
]

/** The three perks the Initial Pack unlocks. Items with an href render a button
 *  that links straight to where the perk is used; item 1 (early-bird reservation)
 *  has no link yet — Console orders aren't open. */
const PERKS: { title: string; desc: string; href?: string; cta?: string }[] = [
  {
    title: 'Early-Bird Console',
    desc: 'Reserve your Multiverse Console ahead of the public — first batch, first served.',
  },
  {
    title: 'Internal Voting',
    desc: 'Cast your vote on classified, Voyager-only decisions.',
    href: '/vote?tab=classified',
    cta: 'Open classified votes',
  },
  {
    title: 'Inner Intel',
    desc: 'Read classified intel and signal briefings reserved for Voyagers.',
    href: '/intel?tab=classified',
    cta: 'Read classified intel',
  },
]

function perkRows(): string {
  return PERKS.map((p) => {
    const button = p.href
      ? `\n    <a href="${SITE}${p.href}" style="display:inline-block;margin-top:10px;padding:8px 15px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:#FF6B35;border:1px solid #FF6B35;text-decoration:none;text-transform:uppercase;">${p.cta} &rarr;</a>`
      : ''
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;"><tr>
  <td style="border-left:2px solid #FF6B35;padding:2px 0 2px 16px;">
    <p style="margin:0 0 5px 0;font-size:13px;font-weight:700;letter-spacing:0.12em;color:#F5F5F5;text-transform:uppercase;">${p.title}</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#A8B6CE;">${p.desc}</p>${button}
  </td>
</tr></table>`
  }).join('\n  ')
}

function architectAvatars(): string {
  const cells = ARCHITECTS.map((a) => {
    const face = a.avatar
      ? `<img src="${a.avatar}" width="56" height="56" alt="${a.name} on X" style="display:block;width:56px;height:56px;border-radius:50%;border:1px solid #1E2840;"/>`
      : `<div style="width:56px;height:56px;border-radius:50%;border:1px solid #1E2840;background:#1A2342;color:#9FB0CC;font-size:18px;font-weight:700;line-height:56px;text-align:center;">${a.name.slice(0, 1).toUpperCase()}</div>`
    return `<td align="center" style="padding:0 9px;">
    <a href="${a.href}" style="text-decoration:none;">
      ${face}
      <p style="margin:8px 0 0 0;font-size:11px;letter-spacing:0.06em;color:#FF6B35;">@${a.handle}</p>
    </a>
  </td>`
  }).join('\n  ')
  return `<table cellpadding="0" cellspacing="0" border="0"><tr>\n  ${cells}\n</tr></table>`
}

/** Build the confirmation email. `name` personalises the greeting if known. */
export function buildVoyagerPackEmail(opts: { name?: string }): { subject: string; html: string; text: string } {
  const greet = opts.name?.trim() ? `${opts.name.trim()}, ` : ''
  const subject = 'Your Voyager Pack is confirmed — what comes next'

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#0A0E27;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0E27;"><tr><td align="center" style="padding:48px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td align="center" style="padding-bottom:36px;"><table cellpadding="0" cellspacing="0" border="0"><tr>
  <td valign="middle"><img src="${ICON}" height="38" style="display:block;height:38px;width:auto;" alt=""/></td><td width="10"></td>
  <td valign="middle"><img src="${WORDMARK}" height="30" style="display:block;height:30px;width:auto;" alt="Multiverse Collective"/></td>
</tr></table></td></tr>
<tr><td style="background-color:#0D1020;border:1px solid #1E2840;padding:40px 36px;">
  <p style="margin:0 0 22px 0;font-size:11px;letter-spacing:0.3em;color:#4A5570;text-transform:uppercase;">// Voyager confirmed</p>
  <h1 style="margin:0 0 18px 0;font-size:24px;font-weight:700;letter-spacing:0.08em;color:#F5F5F5;line-height:1.3;">YOU ARE NOW<br/>A MULTIVERSE VOYAGER</h1>
  <p style="margin:0 0 18px 0;font-size:15px;line-height:1.8;color:#A8B6CE;">${greet}your Initial Voyager Pack is confirmed. Welcome aboard.</p>
  <p style="margin:0 0 26px 0;font-size:15px;line-height:1.8;color:#A8B6CE;">The physical items&mdash;the welcome letter, your metal Voyager badge, and the classified component parts&mdash;are currently in assembly. We will initiate shipment with the very first batch and notify you.</p>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;"><tr><td align="center">
    <img src="${PACK_IMG}" width="210" alt="Initial Voyager Pack" style="display:block;width:210px;max-width:62%;height:auto;border:1px solid #1E2840;"/>
  </td></tr></table>

  <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:0.25em;color:#4A5570;text-transform:uppercase;">// What you have unlocked</p>
  ${perkRows()}

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 26px 0;"><tr><td style="height:1px;background-color:#1E2840;"></td></tr></table>

  <p style="margin:0 0 18px 0;font-size:15px;line-height:1.8;color:#C7D2E6;">The Collective is built by the people inside it, and we would rather hear from you than at you. Reply directly to this transmission, or reach our Architects on X:</p>
  ${architectAvatars()}

  <table cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;"><tr><td style="background-color:#FF6B35;">
    <a href="${SITE}/console" style="display:inline-block;padding:14px 32px;font-size:11px;font-weight:700;letter-spacing:0.2em;color:#0A0E27;text-decoration:none;text-transform:uppercase;">[ RETURN TO COLLECTIVE ]</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding-top:24px;"><p style="margin:0;font-size:10px;color:#2A3A5A;text-align:center;line-height:1.8;letter-spacing:0.05em;">BUILDING BETTER WORLDS, TOGETHER.<br/><a href="${SITE}" style="color:#4A5570;text-decoration:none;">multiverseco.org</a></p></td></tr>
</table></td></tr></table></body></html>`

  const text = [
    `${greet}your Initial Voyager Pack is confirmed. Welcome aboard.`,
    '',
    'The physical items—the welcome letter, your metal Voyager badge, and the classified component parts—are currently in assembly. We will initiate shipment with the very first batch and notify you.',
    '',
    'WHAT YOU HAVE UNLOCKED',
    ...PERKS.map((p) => (p.href ? `- ${p.title}: ${p.desc} (${p.cta}: ${SITE}${p.href})` : `- ${p.title}: ${p.desc}`)),
    '',
    'The Collective is built by the people inside it. Reply directly to this email, or reach our Architects on X:',
    ...ARCHITECTS.map((a) => `- @${a.handle} (${a.name}) — ${a.href}`),
    '',
    `Return to Collective: ${SITE}/console`,
    '',
    'BUILDING BETTER WORLDS, TOGETHER.',
    'multiverseco.org',
  ].join('\n')

  return { subject, html, text }
}

/** Send the confirmation to one recipient. Reply-to points at a monitored inbox. */
export async function sendVoyagerPackConfirmation(to: string, name?: string): Promise<{ error: string | null }> {
  // Imported lazily so this module stays usable in pure contexts (e.g. preview).
  const { sendEmail } = await import('@/lib/email')
  const { subject, html, text } = buildVoyagerPackEmail({ name })
  return sendEmail({ to, subject, html, text, replyTo: REPLY_TO })
}
