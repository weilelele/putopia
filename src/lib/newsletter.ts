/**
 * Weekly newsletter — fixed editorial copy + DB-driven action items.
 *
 * Registered layout (Groups A & B):
 *   greeting → intro paragraph → Initial Voyager Pack (lead-gen, top) →
 *   2 latest news entries (with publisher avatar) → Signal Dispatch question
 *
 * No AI generation. Copy is fixed; news + signal + devices pull fresh from DB,
 * cached 6 hours. Personalized greeting (codename) is injected per-recipient at
 * send time; preview pages use '[CODENAME]'.
 */

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

// ── Types ────────────────────────────────────────────────────────────────────

interface NewsItem {
  id: string
  title: string
  tag: string
  excerpt: string
  publisherName: string | null
  publisherAvatarUrl: string | null
}

interface SignalAsset {
  id: string
  media: 'image' | 'video' | 'audio'
  url: string | null
  role: 'main' | 'option'
}

interface SignalTaskItem {
  id: string
  type: string
  prompt: string | null
  main: SignalAsset | null
  options: SignalAsset[]
  participantCount: number
}

interface DeviceItem {
  id: string
  name: string
  status: string | null
  location: string
  imagePath: string | null
  activeCount: number // members who logged readings this week
}

export interface NewsletterContent {
  newsCardsHtml: string
  signalHtml: string
  weekLabel: string
  activeUsers: Array<{ name: string; avatarUrl: string | null }>
  devices: DeviceItem[] // for unregistered device strip
}

// ── Style constants ───────────────────────────────────────────────────────────

const MONO = "'Courier Prime','Courier New',ui-monospace,monospace"

// UTM suffix for every email link, so newsletter-driven traffic/conversions are
// attributable in PostHog and kept distinct from organic site entry.
// CTA links additionally append &utm_content=direct|task_gated for A/B.
const UTM = '?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=weekly_newsletter'
const PARA = `margin:0 0 16px;font-size:14px;color:rgba(245,245,245,0.68);line-height:1.9;letter-spacing:0.01em;font-family:${MONO};`
const PARA_LAST = `margin:0;font-size:14px;color:rgba(245,245,245,0.68);line-height:1.9;letter-spacing:0.01em;font-family:${MONO};`

const SIGNAL_TYPE_HINT: Record<string, string> = {
  visual_match: 'Which signal comes from the same world as the reference?',
  visual_odd_one: 'Which signal does not belong to this group?',
  audio_odd_one: 'Which sound does not belong to this group?',
  audio_match: 'Which sound comes from the same world as the reference?',
}

// ── DB data gathering ─────────────────────────────────────────────────────────

async function gatherWeeklyData(): Promise<{
  news: NewsItem[]
  signal: SignalTaskItem | null
  stripDevices: DeviceItem[]
  activeUsers: Array<{ name: string; avatarUrl: string | null }>
}> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const today = new Date().toISOString().slice(0, 10)

  const [intelRes, allCommentsRes, devicesRes, signalTaskRes] = await Promise.all([
    // Latest 2 public intel items (news entries)
    admin
      .from('intel')
      .select('id, title, tag, content, publisher_name, publisher_id')
      .eq('classified', false)
      .order('timestamp', { ascending: false })
      .limit(2),

    // Recent commenters (active-user avatar cluster for unregistered)
    admin
      .from('comments')
      .select('author_name, author_avatar_url')
      .gte('created_at', since)
      .eq('is_visible', true)
      .not('author_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(40),

    // Most recently updated devices (for unregistered strip)
    admin
      .from('devices')
      .select('id, name, status, location, image_path')
      .order('updated_at', { ascending: false })
      .limit(4),

    // Latest published signal task
    admin
      .from('signal_tasks')
      .select('id, type, prompt')
      .eq('is_published', true)
      .lte('task_date', today)
      .order('task_date', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(1),
  ])

  // ── News: enrich with publisher avatars ──
  type IntelRow = {
    id: string; title: string | null; tag: string | null; content: string | null
    publisher_name: string | null; publisher_id: string | null
  }
  const intelRows = (intelRes.data ?? []) as IntelRow[]
  const publisherIds = [...new Set(intelRows.map((i) => i.publisher_id).filter(Boolean) as string[])]
  const avatarMap: Record<string, string | null> = {}
  if (publisherIds.length) {
    const { data: profiles } = await admin
      .from('voyager_profiles')
      .select('id, avatar_url')
      .in('id', publisherIds)
    for (const p of profiles ?? []) avatarMap[p.id] = p.avatar_url
  }
  const news: NewsItem[] = intelRows.map((i) => ({
    id: i.id,
    title: i.title ?? '',
    tag: i.tag ?? '',
    excerpt: (i.content ?? '').slice(0, 150),
    publisherName: i.publisher_name,
    publisherAvatarUrl: i.publisher_id ? (avatarMap[i.publisher_id] ?? null) : null,
  }))

  // ── Signal: fetch assets + participant count for the latest task ──
  let signal: SignalTaskItem | null = null
  const taskRow = signalTaskRes.data?.[0] as { id: string; type: string; prompt: string | null } | undefined
  if (taskRow) {
    const [assetsRes, countRes] = await Promise.all([
      admin
        .from('signal_task_assets')
        .select('id, media, processed_url, display_url, asset_role, display_order')
        .eq('task_id', taskRow.id)
        .eq('is_selected', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true }),
      admin
        .from('signal_responses')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskRow.id),
    ])
    type AssetRow = {
      id: string; media: 'image' | 'video' | 'audio'
      processed_url: string | null; display_url: string | null
      asset_role: 'main' | 'option'
    }
    const assets = (assetsRes.data ?? []) as AssetRow[]
    const toAsset = (a: AssetRow): SignalAsset => ({
      id: a.id,
      media: a.media,
      url: a.display_url || a.processed_url,
      role: a.asset_role,
    })
    const main = assets.find((a) => a.asset_role === 'main')
    signal = {
      id: taskRow.id,
      type: taskRow.type,
      prompt: taskRow.prompt,
      main: main ? toAsset(main) : null,
      options: assets.filter((a) => a.asset_role !== 'main').map(toAsset),
      participantCount: countRes.count ?? 0,
    }
  }

  // ── Active users (unique, for unregistered cluster) ──
  type CommentRow = { author_name: string | null; author_avatar_url: string | null }
  const seen = new Set<string>()
  const activeUsers: Array<{ name: string; avatarUrl: string | null }> = []
  for (const c of (allCommentsRes.data ?? []) as CommentRow[]) {
    if (c.author_name && !seen.has(c.author_name)) {
      seen.add(c.author_name)
      activeUsers.push({ name: c.author_name, avatarUrl: c.author_avatar_url ?? null })
    }
  }

  const stripDevices: DeviceItem[] = (devicesRes.data ?? [])
    .map((d) => ({
      id: d.id, name: d.name, status: d.status, location: d.location,
      imagePath: d.image_path, activeCount: 0,
    }))
    .filter((d) => d.imagePath)
    .slice(0, 3)

  return { news, signal, stripDevices, activeUsers }
}

// ── Section HTML builders ─────────────────────────────────────────────────────

function publisherBadge(name: string | null, avatarUrl: string | null): string {
  const display = name ?? 'Collective'
  if (avatarUrl) {
    return (
      `<img src="${avatarUrl}" width="20" height="20" alt="" ` +
      `style="width:20px;height:20px;border-radius:50%;object-fit:cover;display:inline-block;` +
      `vertical-align:middle;border:1px solid rgba(255,255,255,0.12);" />` +
      `<span style="font-size:13px;color:rgba(245,245,245,0.7);margin-left:8px;vertical-align:middle;">${display}</span>`
    )
  }
  const initials = display.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
  return (
    `<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#241433;` +
    `color:#E8A020;font-size:13px;font-weight:700;line-height:20px;text-align:center;` +
    `vertical-align:middle;border:1px solid rgba(232,160,32,0.4);">${initials}</span>` +
    `<span style="font-size:13px;color:rgba(245,245,245,0.7);margin-left:8px;vertical-align:middle;">${display}</span>`
  )
}

function buildNewsCardsHtml(news: NewsItem[]): string {
  if (news.length === 0) return ''

  const cards = news
    .map(
      (item) => `
    <tr><td style="padding-bottom:8px;">
      <a href="https://www.multiverseco.org/intel/${item.id}${UTM}"
         style="display:block;text-decoration:none;background:#0A0E27;border:1px solid rgba(255,107,53,0.12);padding:15px 17px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:9px;">
          <tr>
            <td style="vertical-align:middle;">${publisherBadge(item.publisherName, item.publisherAvatarUrl)}</td>
            <td style="text-align:right;vertical-align:middle;font-size:12px;letter-spacing:0.2em;color:rgba(255,107,53,0.5);">${item.tag.toUpperCase()}</td>
          </tr>
        </table>
        <div style="font-size:15px;font-weight:700;color:#F5F5F5;line-height:1.35;font-family:${MONO};">${item.title}</div>
        <div style="margin-top:9px;font-size:12px;letter-spacing:0.16em;color:rgba(255,107,53,0.5);font-family:${MONO};">READ MORE →</div>
      </a>
    </td></tr>`
    )
    .join('')

  return `
  <tr><td style="height:20px;"></td></tr>
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
      <tr>
        <td style="font-size:12px;letter-spacing:0.28em;color:rgba(255,107,53,0.42);padding-bottom:10px;font-family:${MONO};">THIS WEEK'S BRIEFINGS</td>
        <td style="text-align:right;padding-bottom:10px;">
          <a href="https://www.multiverseco.org/intel${UTM}"
             style="font-size:12px;letter-spacing:0.16em;color:rgba(255,107,53,0.45);text-decoration:none;font-family:${MONO};">VIEW ALL INTEL →</a>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">${cards}</table>
  </td></tr>`
}

function renderSignalThumb(asset: SignalAsset): string {
  if (asset.media === 'audio' || !asset.url) {
    return `<div style="width:100%;aspect-ratio:1;background:#070912;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:12px;letter-spacing:0.14em;color:rgba(245,245,245,0.4);">AUDIO</span>
    </div>`
  }
  return `<img src="${asset.url}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#070912;" />`
}

function buildSignalHtml(signal: SignalTaskItem | null): string {
  if (!signal || signal.options.length === 0) return ''

  const prompt = signal.prompt || SIGNAL_TYPE_HINT[signal.type] || 'Make your judgment.'
  const href = `https://www.multiverseco.org/signal${UTM}`

  const referenceRow = signal.main
    ? `<table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
        <tr>
          <td style="font-size:13px;color:rgba(245,245,245,0.35);letter-spacing:0.15em;padding-right:10px;vertical-align:middle;font-family:${MONO};">REFERENCE</td>
          <td style="width:54px;"><div style="width:54px;border:1px solid rgba(255,107,53,0.25);">${renderSignalThumb(signal.main)}</div></td>
        </tr>
      </table>`
    : ''

  const opts = signal.options.slice(0, 4)
  const colWidth = `${(100 / opts.length).toFixed(4)}%`
  const optionCells = opts
    .map(
      (a, i) => `
      <td width="${colWidth}" style="width:${colWidth};padding:0 3px;vertical-align:top;">
        <div style="font-size:13px;color:rgba(245,245,245,0.5);margin-bottom:3px;font-family:${MONO};">${String.fromCharCode(65 + i)}</div>
        <div style="border:1px solid rgba(255,107,53,0.16);background:#070912;">${renderSignalThumb(a)}</div>
      </td>`
    )
    .join('')

  return `
  <tr><td style="height:20px;"></td></tr>
  <tr><td>
    <a href="${href}" style="display:block;text-decoration:none;background:#0F1430;border:1px solid rgba(255,107,53,0.16);padding:16px;">
      <div style="font-size:13px;letter-spacing:0.28em;color:#E85D04;margin-bottom:12px;font-family:${MONO};">// SIGNAL DISPATCH</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
        <tr>
          <td style="font-size:14px;color:rgba(245,245,245,0.85);line-height:1.55;font-family:${MONO};">${prompt}</td>
          <td style="text-align:right;vertical-align:top;font-size:13px;color:rgba(245,245,245,0.35);white-space:nowrap;padding-left:10px;font-family:${MONO};">${signal.participantCount} response${signal.participantCount !== 1 ? 's' : ''}</td>
        </tr>
      </table>
      ${referenceRow}
      <table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>${optionCells}</tr></table>
      <div style="margin-top:13px;font-size:13px;letter-spacing:0.14em;color:rgba(255,107,53,0.55);font-family:${MONO};">FILE YOUR READ — SEE HOW OTHERS RESPONDED →</div>
    </a>
  </td></tr>`
}

// ── Fixed editorial copy ──────────────────────────────────────────────────────

function buildIntroHtml(): string {
  return `
  <tr><td style="padding:14px 4px 0;">
    <p style="${PARA_LAST}">This week marks our organization's official debut to the public, and we have welcomed many new members — we need fresh energy to maintain the order of the parallel worlds. We are now receiving signals from many worlds at once, and we want you to help us decide: which world, which signal deserves our focus?</p>
  </td></tr>`
}

// ── Cached content orchestrator ───────────────────────────────────────────────

// Cache only the raw DB data (cheap, serializable). HTML is rebuilt fresh on
// every call below, so template/style edits take effect immediately instead of
// being frozen inside a 6-hour cache entry.
const getWeeklyData = unstable_cache(
  async () => gatherWeeklyData(),
  ['weekly-newsletter-data'],
  { revalidate: 6 * 60 * 60 }
)

export async function getWeeklyNewsletterContent(): Promise<NewsletterContent> {
  const { news, signal, stripDevices, activeUsers } = await getWeeklyData()
  return {
    newsCardsHtml: buildNewsCardsHtml(news),
    signalHtml: buildSignalHtml(signal),
    weekLabel: new Date().toISOString().slice(0, 10),
    activeUsers,
    devices: stripDevices,
  }
}

// ── Shared template scaffolding ───────────────────────────────────────────────

export const EMAIL_HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>Transmission — Multiverse Collective</title>
<base target="_top" />
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin: 0; padding: 0; }
  @media only screen and (max-width: 480px) {
    .stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    .stack-img { width: 100% !important; height: auto !important; max-width: 100% !important; }
    .pack-pad { padding: 22px 24px 26px !important; }
    .hdr-pad { padding: 18px 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#0A0E27;font-family:'Courier Prime','Courier New',ui-monospace,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E27;padding:32px 16px 64px;">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">`

export const EMAIL_TAIL = `
</table>
</td></tr>
</table>
</body>
</html>`

/** Format an ISO date (YYYY-MM-DD) as a masthead dateline, e.g. "JUN 18, 2026". */
function mastheadDate(weekLabel: string): string {
  return new Date(`${weekLabel}T00:00:00Z`)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

/** Registered-email header with the issue date appended to the masthead. */
export function buildHeaderRegistered(weekLabel: string): string {
  return `
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.18);padding:0;overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0" class="hdr-pad" style="padding:20px 26px;">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:9px;">
                <img src="https://www.multiverseco.org/assets/vi-icon.png" height="26" alt=""
                     style="height:26px;width:auto;display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <img src="https://www.multiverseco.org/assets/vi-wordmark.png" height="16" alt="MULTIVERSE COLLECTIVE"
                     style="height:16px;width:auto;display:block;" />
              </td>
            </tr>
          </table>
          <div style="font-size:12px;letter-spacing:0.3em;color:rgba(245,245,245,0.45);margin-top:8px;font-family:'Courier Prime','Courier New',monospace;">WEEKLY NEWSLETTER &mdash; ${mastheadDate(weekLabel)}</div>
        </td>
        <td style="text-align:right;vertical-align:middle;white-space:nowrap;">
          <span style="display:inline-block;border:1px solid #B98620;padding:5px 11px;background:#1C1708;font-size:12px;font-weight:700;letter-spacing:0.16em;color:#E8A020;font-family:'Courier Prime','Courier New',monospace;">APPLICANT</span>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="height:10px;"></td></tr>`
}

/** Personalized greeting. Pass real codename at send time; preview uses '[CODENAME]'. */
export function buildGreetingHtml(codename: string): string {
  return `
  <tr><td style="padding:16px 4px 2px;">
    <div style="font-size:20px;font-weight:700;color:#F5F5F5;letter-spacing:0.05em;font-family:'Courier Prime','Courier New',ui-monospace,monospace;">${codename},</div>
  </td></tr>`
}

export const EMAIL_FOOTER = `
  <tr><td style="height:28px;"></td></tr>
  <tr><td style="border-top:1px solid rgba(255,107,53,0.1);padding-top:20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;letter-spacing:0.18em;color:#B5603A;font-family:'Courier Prime','Courier New',monospace;">MULTIVERSE.COLLECTIVE</td>
        <td style="text-align:right;font-size:12px;letter-spacing:0.12em;color:rgba(245,245,245,0.45);font-family:'Courier Prime','Courier New',monospace;">EXPLORE PARALLEL WORLDS</td>
      </tr>
    </table>
    <div style="margin-top:10px;font-size:12px;color:rgba(245,245,245,0.35);letter-spacing:0.06em;line-height:1.8;font-family:'Courier Prime','Courier New',monospace;">
      You are receiving this because you are registered in the Multiverse Collective network.<br/>
      <a href="https://www.multiverseco.org/console${UTM}" style="color:#C26A40;text-decoration:none;">Visit console</a>
      &nbsp;·&nbsp;
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#C26A40;text-decoration:none;">Unsubscribe</a>
    </div>
  </td></tr>`

// ── Voyager Pack CTA blocks (concise: image left + headline + feature list) ────

export const CTA_DIRECT = `
  <tr><td style="height:18px;"></td></tr>
  <tr><td style="background:#150E28;border:1px solid #6E3A18;overflow:hidden;">
    <div style="height:3px;background:#FF6B35;"></div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td class="stack" width="220" style="vertical-align:top;padding:0;width:220px;">
          <img class="stack-img" src="https://www.multiverseco.org/voyager-pack/voyager-hero.png" width="220" alt="Initial Voyager Pack"
               style="width:220px;display:block;" />
        </td>
        <td class="stack pack-pad" style="vertical-align:middle;padding:24px 24px 24px 22px;">
          <div style="font-size:12px;letter-spacing:0.24em;color:#FF8C5A;margin-bottom:13px;font-family:'Courier Prime','Courier New',monospace;">◈ INITIAL VOYAGER PACK ◈</div>
          <div style="font-size:17px;font-weight:700;letter-spacing:0.05em;color:#FFFFFF;margin-bottom:16px;line-height:1.32;font-family:'Courier Prime','Courier New',monospace;">YOUR VOYAGER STATUS IS READY.</div>
          <div style="margin-bottom:7px;font-size:13px;color:rgba(245,245,245,0.80);letter-spacing:0.03em;font-family:'Courier Prime','Courier New',monospace;">— Physical Badge</div>
          <div style="margin-bottom:7px;font-size:13px;color:rgba(245,245,245,0.80);letter-spacing:0.03em;font-family:'Courier Prime','Courier New',monospace;">— Access Card</div>
          <div style="margin-bottom:20px;font-size:13px;color:rgba(245,245,245,0.80);letter-spacing:0.03em;font-family:'Courier Prime','Courier New',monospace;">— Full Network Access</div>
          <a href="https://www.multiverseco.org/voyager-pack${UTM}&amp;utm_content=direct"
             style="display:block;text-align:center;background:#FF6B35;color:#0A0E27;font-family:'Courier Prime','Courier New',monospace;font-size:14px;font-weight:700;letter-spacing:0.16em;text-decoration:none;padding:14px;">
            [ ACTIVATE NOW &rarr; ]
          </a>
        </td>
      </tr>
    </table>
  </td></tr>`

export const CTA_TASK_GATED = `
  <tr><td style="height:18px;"></td></tr>
  <tr><td style="background:#0C1024;border:1px solid #6E5418;overflow:hidden;">
    <div style="height:3px;background:#B98620;"></div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td class="stack" width="220" style="vertical-align:top;padding:0;width:220px;">
          <img class="stack-img" src="https://www.multiverseco.org/voyager-pack/voyager-hero.png" width="220" alt="Initial Voyager Pack"
               style="width:220px;display:block;filter:grayscale(45%);" />
        </td>
        <td class="stack pack-pad" style="vertical-align:middle;padding:24px 24px 24px 22px;">
          <div style="font-size:12px;letter-spacing:0.24em;color:#E8A020;margin-bottom:13px;font-family:'Courier Prime','Courier New',monospace;">◈ YOUR PATH TO VOYAGER ◈</div>
          <div style="font-size:17px;font-weight:700;letter-spacing:0.05em;color:#FFFFFF;margin-bottom:16px;line-height:1.32;font-family:'Courier Prime','Courier New',monospace;">ACTIVATE YOUR VOYAGER STATUS.</div>
          <div style="font-size:13px;color:rgba(245,245,245,0.80);line-height:1.75;margin-bottom:20px;font-family:'Courier Prime','Courier New',monospace;">
            Complete the Collective&#39;s field assessment tasks to unlock the Initial Voyager Pack.
          </div>
          <a href="https://www.multiverseco.org/voyager-pack${UTM}&amp;utm_content=task_gated"
             style="display:block;text-align:center;background:#1C1708;color:#E8A020;font-family:'Courier Prime','Courier New',monospace;font-size:14px;font-weight:700;letter-spacing:0.16em;text-decoration:none;padding:14px;border:1px solid #B98620;">
            [ VIEW VOYAGER PACK &rarr; ]
          </a>
          <div style="text-align:center;font-size:13px;letter-spacing:0.04em;color:rgba(245,245,245,0.50);margin-top:13px;font-family:'Courier Prime','Courier New',monospace;">
            Pack unlocks upon completing your field assessment.
          </div>
        </td>
      </tr>
    </table>
  </td></tr>`

// ── Full email assemblers ─────────────────────────────────────────────────────

/** Group A — registered, direct purchase. codename is injected at send time. */
export function buildDirectHtml(content: NewsletterContent, codename = '[CODENAME]'): string {
  return (
    EMAIL_HEAD +
    buildHeaderRegistered(content.weekLabel) +
    buildGreetingHtml(codename) +
    buildIntroHtml() +
    content.newsCardsHtml +
    CTA_DIRECT +
    content.signalHtml +
    EMAIL_FOOTER +
    EMAIL_TAIL
  )
}

/** Group B — registered, task-gated purchase. codename is injected at send time. */
export function buildTaskGatedHtml(content: NewsletterContent, codename = '[CODENAME]'): string {
  return (
    EMAIL_HEAD +
    buildHeaderRegistered(content.weekLabel) +
    buildGreetingHtml(codename) +
    buildIntroHtml() +
    content.newsCardsHtml +
    CTA_TASK_GATED +
    content.signalHtml +
    EMAIL_FOOTER +
    EMAIL_TAIL
  )
}

/** Unregistered users — advertising / recruitment email. */
export function buildUnregisteredHtml(
  activeUsers: Array<{ name: string; avatarUrl: string | null }>,
  devices: DeviceItem[]
): string {
  const usersWithPhoto = activeUsers.filter((u) => u.avatarUrl).slice(0, 8)
  const memberCount = activeUsers.length

  const avatarCluster = usersWithPhoto
    .map(
      (u, i) =>
        `<img src="${u.avatarUrl}" width="28" height="28" ` +
        `style="width:28px;height:28px;border-radius:50%;display:inline;vertical-align:middle;` +
        `border:2px solid #0A0E27;margin-right:-8px;object-fit:cover;` +
        `position:relative;z-index:${usersWithPhoto.length - i};" />`
    )
    .join('')

  const deviceCols = devices
    .filter((d) => d.imagePath)
    .slice(0, 3)
    .map(
      (d) =>
        `<td width="33%" style="padding:0 4px;vertical-align:top;">
          <a href="https://www.multiverseco.org" style="display:block;text-decoration:none;">
            <div style="overflow:hidden;border:1px solid rgba(255,107,53,0.15);">
              <img src="${d.imagePath}" width="180" alt="${d.name}"
                   style="width:100%;height:90px;object-fit:cover;display:block;filter:brightness(0.6) saturate(0.7);" />
            </div>
            <div style="font-size:12px;letter-spacing:0.12em;color:rgba(245,245,245,0.3);margin-top:5px;
                        font-family:'Courier Prime','Courier New',monospace;text-align:center;">${d.id}</div>
          </a>
        </td>`
    )
    .join('')

  const deviceSection = deviceCols
    ? `
  <tr><td style="height:16px;"></td></tr>
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>${deviceCols}</tr>
    </table>
  </td></tr>`
    : ''

  const memberSection =
    usersWithPhoto.length > 0
      ? `
  <tr><td style="height:18px;"></td></tr>
  <tr><td>
    <div style="display:inline-block;padding-right:${usersWithPhoto.length * 6 + 4}px;">${avatarCluster}</div>
    <span style="font-size:13px;color:rgba(245,245,245,0.38);vertical-align:middle;margin-left:14px;font-family:'Courier Prime','Courier New',monospace;">
      ${memberCount} member${memberCount !== 1 ? 's' : ''} active this week
    </span>
  </td></tr>`
      : ''

  const body = `
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.18);padding:0;overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:22px 28px 20px;">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:11px;">
                <img src="https://www.multiverseco.org/assets/vi-icon.png" height="36" alt=""
                     style="height:36px;width:auto;display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <img src="https://www.multiverseco.org/assets/vi-wordmark.png" height="24" alt="MULTIVERSE COLLECTIVE"
                     style="height:24px;width:auto;display:block;" />
              </td>
            </tr>
          </table>
          <div style="font-size:12px;letter-spacing:0.32em;color:rgba(245,245,245,0.28);margin-top:9px;font-family:'Courier Prime','Courier New',monospace;">TRANSMISSION</div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="height:10px;"></td></tr>

  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.10);padding:24px 26px 26px;">
    <p style="${PARA}">Thank you for your curiosity about Parallel World and the Multiverse Collective.</p>
    <p style="${PARA}">You have been selected for the opportunity to access our organization's intranet. Inside, you will be able to see our latest developments and the ongoing progress of our newest device, the Multiverse Console.</p>
    <p style="${PARA_LAST}">Furthermore, you will have the chance to become a member of the organization and obtain a Multiverse Console of your own. These are limited edition, and we are still searching for them all over the world. If you have the chance to get one, don't miss out.</p>
  </td></tr>

  ${deviceSection}
  ${memberSection}

  <tr><td style="height:20px;"></td></tr>
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.25);text-align:center;padding:32px 28px 28px;">
    <div style="font-size:12px;letter-spacing:0.28em;color:rgba(255,107,53,0.42);margin-bottom:14px;font-family:'Courier Prime','Courier New',monospace;">◈ OPEN TO NEW MEMBERS ◈</div>
    <a href="https://www.multiverseco.org"
       style="display:inline-block;background:linear-gradient(135deg,#E85D04,#FF6B35);color:#0A0E27;
              font-family:'Courier Prime','Courier New',monospace;font-size:15px;font-weight:700;
              letter-spacing:0.18em;text-decoration:none;padding:14px 36px;">
      APPLY FOR ACCESS →
    </a>
  </td></tr>

  <tr><td style="height:24px;"></td></tr>
  <tr><td style="border-top:1px solid rgba(255,107,53,0.08);padding-top:18px;text-align:center;">
    <div style="font-size:12px;color:rgba(245,245,245,0.15);letter-spacing:0.06em;font-family:'Courier Prime','Courier New',monospace;">
      MULTIVERSE.COLLECTIVE · EXPLORE PARALLEL WORLDS
    </div>
  </td></tr>`

  return EMAIL_HEAD + body + EMAIL_TAIL
}
