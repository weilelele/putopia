import type { DeviceBatch, DistributionStage } from '@/lib/device-batches'
import { formatStripeMinorUnits } from '@/lib/device-checkout'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://multiverseco.org'
const REPLY_TO = process.env.COLLECTIVE_REPLY_TO ?? 'voyagers@multiverseco.org'

export type DeviceOrderEmailStatus =
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'payment_failed'
  | 'refunded'

export type BuiltEmail = {
  subject: string
  html: string
  text: string
  replyTo?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeHttpUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function emailShell(opts: {
  eyebrow: string
  title: string
  intro: string
  body: string
  ctaLabel: string
  ctaHref: string
  footer?: string
}) {
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080C20;color:#F5F5F5;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#080C20;">
    <tr><td align="center" style="padding:36px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">
        <tr><td style="padding:0 0 22px;">
          <img src="${SITE}/assets/vi-wordmark.png" width="220" alt="Multiverse Collective" style="display:block;width:220px;max-width:72%;height:auto;">
        </td></tr>
        <tr><td style="border:1px solid rgba(245,245,245,.18);background:#10162D;padding:32px 26px;">
          <p style="margin:0 0 12px;color:#E35205;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">${escapeHtml(opts.eyebrow)}</p>
          <h1 style="margin:0 0 18px;color:#F5F5F5;font-size:26px;line-height:1.2;">${escapeHtml(opts.title)}</h1>
          <p style="margin:0 0 22px;color:rgba(245,245,245,.7);font-size:15px;line-height:1.75;">${escapeHtml(opts.intro)}</p>
          ${opts.body}
          <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:26px;">
            <tr><td style="background:#E35205;">
              <a href="${escapeHtml(opts.ctaHref)}" style="display:inline-block;padding:13px 20px;color:#080C20;font-size:12px;font-weight:700;letter-spacing:.12em;text-decoration:none;">${escapeHtml(opts.ctaLabel)} →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 0 0;color:rgba(245,245,245,.35);font-size:12px;line-height:1.6;">
          ${escapeHtml(opts.footer ?? 'Building better worlds, together.')}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return html
}

function recordRows(rows: { label: string; value: string }[]) {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid rgba(245,245,245,.12);">
    ${rows.map((row) => `<tr>
      <td style="padding:11px 0;border-bottom:1px solid rgba(245,245,245,.12);color:rgba(245,245,245,.4);font-size:12px;text-transform:uppercase;">${escapeHtml(row.label)}</td>
      <td align="right" style="padding:11px 0;border-bottom:1px solid rgba(245,245,245,.12);color:#F5F5F5;font-size:13px;">${escapeHtml(row.value)}</td>
    </tr>`).join('')}
  </table>`
}

export function buildBatchMajorUpdateEmail(
  batch: DeviceBatch,
  update: { date: string; title: string; body: string },
): BuiltEmail {
  const subject = `${batch.code} update — ${update.title}`
  const href = `${SITE}/devices/batches/${encodeURIComponent(batch.slug)}`
  const body = `<div style="padding:18px 0;border-top:1px solid rgba(245,245,245,.12);border-bottom:1px solid rgba(245,245,245,.12);">
    <p style="margin:0 0 8px;color:#E35205;font-size:12px;letter-spacing:.1em;">${escapeHtml(update.date)}</p>
    <p style="margin:0;color:rgba(245,245,245,.72);font-size:15px;line-height:1.8;">${escapeHtml(update.body)}</p>
  </div>`

  return {
    subject,
    html: emailShell({
      eyebrow: `${batch.code} · field update`,
      title: update.title,
      intro: `A major update has been added to the ${batch.name} record.`,
      body,
      ctaLabel: 'Read the full record',
      ctaHref: href,
      footer: 'You received this because you follow this Batch.',
    }),
    text: [
      subject,
      update.date,
      '',
      update.body,
      '',
      `Read the full record: ${href}`,
      'You received this because you follow this Batch.',
    ].join('\n'),
    replyTo: REPLY_TO,
  }
}

export function buildDistributionStageEmail(
  batch: DeviceBatch,
  stage: Pick<DistributionStage, 'id' | 'label' | 'status' | 'summary' | 'window'>,
): BuiltEmail {
  const completed = stage.status === 'completed'
  const stateLabel = completed ? 'completed' : 'in progress'
  const subject = `${batch.code} — ${stage.label} ${stateLabel}`
  const href = `${SITE}/devices/batches/${encodeURIComponent(batch.slug)}`
  const intro = completed
    ? `${stage.label} has been marked complete for your Batch.`
    : `${stage.label} is now the active distribution stage for your Batch.`
  const body = recordRows([
    { label: 'Distribution', value: stage.label },
    { label: 'Status', value: stateLabel },
    { label: 'Window', value: stage.window },
    { label: 'Field note', value: stage.summary },
  ])

  return {
    subject,
    html: emailShell({
      eyebrow: `${batch.code} · distribution`,
      title: stage.label,
      intro,
      body,
      ctaLabel: 'View distribution record',
      ctaHref: href,
      footer: 'This is a transactional update for a Batch you claimed.',
    }),
    text: [
      subject,
      '',
      intro,
      `Window: ${stage.window}`,
      `Field note: ${stage.summary}`,
      '',
      `View distribution record: ${href}`,
    ].join('\n'),
    replyTo: REPLY_TO,
  }
}

const ORDER_STATUS_COPY: Record<
  DeviceOrderEmailStatus,
  { subject: string; eyebrow: string; title: string; intro: string }
> = {
  paid: {
    subject: 'Your Batch claim is confirmed',
    eyebrow: 'Payment confirmed',
    title: 'Your Console is secured',
    intro: 'Payment has been verified and your name is now attached to this Batch record.',
  },
  preparing: {
    subject: 'Your first distribution is being prepared',
    eyebrow: 'Order update',
    title: 'Preparation has started',
    intro: 'The field team has moved your Batch claim into preparation.',
  },
  shipped: {
    subject: 'A Batch package is on its way',
    eyebrow: 'Shipment update',
    title: 'Package dispatched',
    intro: 'A package connected to your Batch claim has left the field station.',
  },
  delivered: {
    subject: 'Your Batch package was delivered',
    eyebrow: 'Delivery update',
    title: 'Delivery recorded',
    intro: 'The carrier has marked your Batch package as delivered.',
  },
  payment_failed: {
    subject: 'Your Batch payment needs attention',
    eyebrow: 'Payment update',
    title: 'Payment was not completed',
    intro: 'Your claim has not been activated. You can return to the Batch record and try again.',
  },
  refunded: {
    subject: 'Your Batch payment was refunded',
    eyebrow: 'Payment update',
    title: 'Refund recorded',
    intro: 'A refund has been recorded for this Batch claim.',
  },
}

export function buildDeviceOrderStatusEmail(opts: {
  batch: DeviceBatch
  status: DeviceOrderEmailStatus
  packCount: number
  paidAmount?: number | null
  currency?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
}): BuiltEmail {
  const copy = ORDER_STATUS_COPY[opts.status]
  const batchHref = `${SITE}/devices/batches/${encodeURIComponent(opts.batch.slug)}`
  const trackingHref = safeHttpUrl(opts.trackingUrl)
  const href = opts.status === 'shipped' && trackingHref ? trackingHref : batchHref
  const ctaLabel = opts.status === 'shipped' && trackingHref
    ? 'Track package'
    : opts.status === 'payment_failed'
      ? 'Return to claim'
      : 'Open batch record'
  const rows = [
    { label: 'Batch', value: opts.batch.code },
    { label: 'Distribution', value: `${opts.packCount} packs` },
    ...(opts.status === 'paid' && opts.paidAmount != null && opts.currency
      ? [{
          label: 'Total',
          value: formatStripeMinorUnits(opts.paidAmount, opts.currency),
        }]
      : []),
    ...(opts.trackingNumber
      ? [{ label: 'Tracking', value: opts.trackingNumber }]
      : []),
  ]

  return {
    subject: `${opts.batch.code} — ${copy.subject}`,
    html: emailShell({
      eyebrow: copy.eyebrow,
      title: copy.title,
      intro: copy.intro,
      body: recordRows(rows),
      ctaLabel,
      ctaHref: href,
    }),
    text: [
      `${opts.batch.code} — ${copy.subject}`,
      '',
      copy.intro,
      `Batch: ${opts.batch.code}`,
      `Distribution: ${opts.packCount} packs`,
      ...(opts.status === 'paid' && opts.paidAmount != null && opts.currency
        ? [`Total: ${formatStripeMinorUnits(opts.paidAmount, opts.currency)}`]
        : []),
      ...(opts.trackingNumber ? [`Tracking: ${opts.trackingNumber}`] : []),
      '',
      `${ctaLabel}: ${href}`,
    ].join('\n'),
    replyTo: REPLY_TO,
  }
}
