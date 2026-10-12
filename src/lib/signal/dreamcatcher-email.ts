import { parallaxArrayName } from '@/lib/parallax-brand'

/** One publication notification, addressed only to the original observer. */
export function buildDreamcatcherEmail(input: { worldName: string; worldId: string; arrayName?: string; roundNumber: number; closesAt: string; siteUrl: string }) {
  const name = input.worldName.replace(/[\r\n]/g, ' ').slice(0, 120)
  const array = parallaxArrayName(input.arrayName ?? 'Parallax Array')
  const url = `${input.siteUrl.replace(/\/$/, '')}/worlds/${encodeURIComponent(input.worldId)}`
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const closes = new Date(input.closesAt).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
  const subject = `A new signal from your world — Round ${input.roundNumber}`
  const introduction = `The ${array} has received a new set of images linked to “${name}”.`
  const guidance = 'Look through the images and choose the one that feels closest to what you experienced. Your response will guide the next observation.'
  const text = `Your observation has returned a signal.\n\n${introduction}\n\n${guidance}\n\nCommunity feedback is open until ${closes}.\n\nView the signals: ${url}\n\nMultiverse Collective`
  const site = escape(input.siteUrl.replace(/\/$/, ''))
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta name="color-scheme" content="dark"/></head>
<body style="margin:0;padding:0;background-color:#080C20;color:#F5F5F5;font-family:'Courier Prime','Courier New',Courier,monospace;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#080C20" style="background-color:#080C20;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td align="center" style="padding:0 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td><img src="${site}/assets/vi-icon.png" width="44" alt="" style="display:block;width:44px;height:auto;"/></td>
<td style="padding-left:12px;"><img src="${site}/assets/vi-wordmark.png" width="184" alt="Multiverse Collective" style="display:block;width:184px;height:auto;"/></td>
</tr></table></td></tr>
<tr><td bgcolor="#10162D" style="background-color:#10162D;padding:28px 24px;">
<p style="margin:0 0 20px;font-size:12px;line-height:1.5;color:#E35205;">PARALLAX ARRAY · ROUND ${input.roundNumber}</p>
<h1 style="margin:0 0 24px;font-size:28px;line-height:1.2;font-weight:700;color:#F5F5F5;">Your observation has returned a signal.</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;overflow-wrap:anywhere;color:#F5F5F5;">${escape(introduction)}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#F5F5F5;">${guidance}</p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#F5F5F5;">Community feedback is open until<br/><strong>${escape(closes)}</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" bgcolor="#E35205" style="background-color:#E35205;"><a href="${escape(url)}" style="display:block;padding:16px 12px;font-size:14px;line-height:1.4;font-weight:700;color:#10162D;text-decoration:none;">VIEW THE SIGNALS</a></td></tr></table>
</td></tr>
<tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;line-height:1.8;color:#F5F5F5;">EXPLORING PARALLEL WORLDS, TOGETHER<br/><a href="${site}" style="color:#F5F5F5;text-decoration:none;">Multiverse Collective</a></p></td></tr>
</table></td></tr></table></body></html>`
  return { subject, text, html }
}
