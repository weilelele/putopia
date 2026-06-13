/**
 * Weekly newsletter generation.
 *
 * Gathers last-7-day activity (intel, votes, comments, devices) from the DB,
 * feeds it to Claude for a concise editorial narrative, then renders tokens
 * (person groups, intel links, device links) to email-safe inline HTML.
 *
 * Results cached for 6 hours via unstable_cache.
 */

import Anthropic from '@anthropic-ai/sdk'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

// ── Types ────────────────────────────────────────────────────────────────────

interface IntelItem {
  id: string
  title: string
  tag: string
  excerpt: string
}

interface VoteItem {
  title: string
  description: string
  responseCount: number
  optionLabels: string[]
}

interface CommentItem {
  authorName: string
  authorAvatarUrl: string | null
  body: string
  subjectType: string
  subjectId: string
}

interface DeviceItem {
  id: string
  name: string
  status: string | null
  location: string
  imagePath: string | null
  recentCommenters: Array<{ name: string; avatarUrl: string | null }>
}

interface WeeklyData {
  intel: IntelItem[]
  votes: VoteItem[]
  comments: CommentItem[]
  devices: DeviceItem[]
  /** unique active commenters this week (for avatar clusters) */
  activeUsers: Array<{ name: string; avatarUrl: string | null }>
}

export interface NewsletterContent {
  narrativeHtml: string
  weekLabel: string
  /** For unregistered: active device images + avatar cluster */
  activeUsers: Array<{ name: string; avatarUrl: string | null }>
  devices: DeviceItem[]
}

// ── Shared style constants ────────────────────────────────────────────────────

const MONO = "'Space Mono',ui-monospace,'Courier New',monospace"
const PARA_STYLE = `margin:0 0 14px;font-size:11px;color:rgba(245,245,245,0.72);line-height:1.9;letter-spacing:0.01em;font-family:${MONO};`

// ── DB data gathering ────────────────────────────────────────────────────────

async function gatherWeeklyData(): Promise<WeeklyData> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [intelRes, votesRes, commentsRes, deviceCommentsRes] = await Promise.all([
    admin
      .from('intel')
      .select('id, title, tag, content')
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(6),

    admin
      .from('votes')
      .select('id, title, description, options')
      .or(`created_at.gte.${since},is_active.eq.true`)
      .order('created_at', { ascending: false })
      .limit(4),

    admin
      .from('comments')
      .select('author_name, author_avatar_url, body, subject_type, subject_id')
      .gte('created_at', since)
      .eq('is_visible', true)
      .not('author_name', 'is', null)
      .not('body', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30),

    // Device activity: comments on devices this week
    admin
      .from('comments')
      .select('subject_id, author_name, author_avatar_url, body')
      .eq('subject_type', 'device')
      .gte('created_at', since)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  // Vote response counts
  const votesData = votesRes.data ?? []
  const voteCounts = await Promise.all(
    votesData.map((v) =>
      admin
        .from('vote_responses')
        .select('id', { count: 'exact', head: true })
        .eq('vote_id', v.id)
        .then(({ count }) => count ?? 0)
    )
  )

  // Fetch device details for those that had comment activity
  type CommentRow = {
    author_name: string | null
    author_avatar_url: string | null
    body: string | null
    subject_type: string | null
    subject_id: string | null
  }
  const deviceCommentRows = (deviceCommentsRes.data ?? []) as CommentRow[]
  const activeDeviceIds = [...new Set(deviceCommentRows.map((c) => c.subject_id).filter(Boolean) as string[])]

  let deviceItems: DeviceItem[] = []
  if (activeDeviceIds.length > 0) {
    const { data: devData } = await admin
      .from('devices')
      .select('id, name, status, location, image_path')
      .in('id', activeDeviceIds)
      .limit(4)

    deviceItems = (devData ?? []).map((d) => {
      const commenters = deviceCommentRows
        .filter((c) => c.subject_id === d.id && c.author_avatar_url)
        .slice(0, 4)
        .map((c) => ({ name: c.author_name ?? '', avatarUrl: c.author_avatar_url }))
      return {
        id: d.id,
        name: d.name,
        status: d.status,
        location: d.location,
        imagePath: d.image_path,
        recentCommenters: commenters,
      }
    })
  }

  // Active users this week (unique commenters across all subjects)
  const seen = new Set<string>()
  const activeUsers: Array<{ name: string; avatarUrl: string | null }> = []
  for (const c of (commentsRes.data ?? []) as CommentRow[]) {
    const name = c.author_name ?? ''
    if (name && !seen.has(name)) {
      seen.add(name)
      activeUsers.push({ name, avatarUrl: c.author_avatar_url ?? null })
    }
  }

  // Filter meaningful comments
  const allComments: CommentItem[] = ((commentsRes.data ?? []) as CommentRow[])
    .filter((c) => c.body && c.body.trim().length > 25)
    .slice(0, 12)
    .map((c) => ({
      authorName: c.author_name ?? 'Unknown',
      authorAvatarUrl: c.author_avatar_url ?? null,
      body: (c.body ?? '').slice(0, 180),
      subjectType: c.subject_type ?? '',
      subjectId: c.subject_id ?? '',
    }))

  return {
    intel: (intelRes.data ?? []).map((i) => ({
      id: i.id,
      title: i.title ?? '',
      tag: i.tag ?? '',
      excerpt: ((i.content as string | null) ?? '').slice(0, 260),
    })),
    votes: votesData.map((v, idx) => {
      const opts = (v.options as Array<{ id: string; label: string }>) ?? []
      return {
        title: v.title ?? '',
        description: (v.description ?? '').slice(0, 180),
        responseCount: voteCounts[idx],
        optionLabels: opts.slice(0, 3).map((o) => o.label),
      }
    }),
    comments: allComments,
    devices: deviceItems,
    activeUsers,
  }
}

// ── Claude prompt & call ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the editorial voice of the Multiverse Collective — a secretive research network that monitors parallel worlds. Your writing is precise, measured, slightly mysterious, and human. Short sentences. No jargon.

Write a weekly newsletter briefing. Exactly 2 paragraphs. Each paragraph: 2–3 sentences maximum. Do not pad.

TOKENS — use these in your text:
• To link a specific intel report: <ref-intel id="INT-XXXXX" title="Short Title"/>
• To link a specific device: <ref-device id="MCC-2" name="Device Name"/>
• When multiple people participated in something together, use ONE group token instead of listing names: <ref-group users="Name1|avatar_url1,Name2|avatar_url2,Name3|avatar_url3" label="N members"/>
• When mentioning a single person: <ref-person name="Full Name" avatar="avatar_url_or_empty"/>
• Only use people/devices/intel that appear in the data below. Do not invent.

Respond ONLY with valid JSON — no markdown fences, nothing else:
{"paragraphs":["paragraph 1","paragraph 2"]}`

function buildDataContext(data: WeeklyData): string {
  const lines: string[] = []

  lines.push('INTEL (past 7 days):')
  for (const i of data.intel) {
    lines.push(`  [${i.id}] ${i.tag} — "${i.title}" | ${i.excerpt.slice(0, 160)}`)
  }

  lines.push('\nACTIVE VOTES:')
  for (const v of data.votes) {
    lines.push(`  "${v.title}" — ${v.responseCount} responses | options: ${v.optionLabels.join(' / ')}`)
  }

  lines.push('\nDEVICES WITH RECENT ACTIVITY:')
  for (const d of data.devices) {
    const who = d.recentCommenters.map((c) => `${c.name}|${c.avatarUrl ?? ''}`).join(', ')
    lines.push(`  [${d.id}] "${d.name}" (${d.status ?? 'unknown'}, ${d.location}) — active commenters: ${who || 'none'}`)
  }

  lines.push('\nMEMBER COMMENTS (recent):')
  for (const c of data.comments) {
    lines.push(`  ${c.authorName}|${c.authorAvatarUrl ?? ''} on ${c.subjectType}/${c.subjectId}: "${c.body}"`)
  }

  return lines.join('\n')
}

async function callClaude(data: WeeklyData): Promise<string[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildDataContext(data) }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned) as { paragraphs: string[] }
  return parsed.paragraphs.filter(Boolean).slice(0, 2)
}

// ── Token → email-safe HTML ───────────────────────────────────────────────────

function avatarImg(url: string, size = 20, zIndex = 1): string {
  return (
    `<img src="${url}" width="${size}" height="${size}" ` +
    `style="width:${size}px;height:${size}px;border-radius:50%;display:inline;` +
    `vertical-align:middle;border:2px solid #060A1A;` +
    `margin-right:-6px;object-fit:cover;position:relative;z-index:${zIndex};" />`
  )
}

function renderGroup(usersStr: string, label: string): string {
  const users = usersStr
    .split(',')
    .map((u) => {
      const [name, url] = u.split('|')
      return { name: name?.trim() ?? '', url: url?.trim() ?? '' }
    })
    .filter((u) => u.name)
    .slice(0, 5)

  const imgs = users
    .filter((u) => u.url)
    .map((u, i) => avatarImg(u.url, 20, users.length - i))
    .join('')

  const paddingRight = users.filter((u) => u.url).length * 6 + 4

  return (
    `<span style="display:inline-block;vertical-align:middle;white-space:nowrap;` +
    `padding-right:${paddingRight}px;margin:0 3px;">` +
    imgs +
    `</span>` +
    (label
      ? `<span style="font-size:9px;color:rgba(245,245,245,0.45);` +
        `vertical-align:middle;margin-left:10px;">${label}</span>`
      : '')
  )
}

function renderPerson(name: string, avatar: string): string {
  const img = avatar
    ? `<img src="${avatar}" width="16" height="16" ` +
      `style="width:16px;height:16px;border-radius:50%;display:inline;` +
      `vertical-align:middle;border:1px solid rgba(255,255,255,0.15);` +
      `margin:0 3px 2px 2px;object-fit:cover;" />`
    : ''
  return `${img}<strong style="color:#F5F5F5;">${name}</strong>`
}

function renderIntelLink(id: string, title: string): string {
  return (
    `<a href="https://putopia.vercel.app/intel/${id}" ` +
    `style="color:#FF6B35;text-decoration:none;` +
    `border-bottom:1px solid rgba(255,107,53,0.3);">${title}</a>`
  )
}

function renderDeviceLink(id: string, name: string): string {
  return (
    `<a href="https://putopia.vercel.app/devices/${id}" ` +
    `style="color:rgba(245,245,245,0.8);text-decoration:none;` +
    `border-bottom:1px solid rgba(245,245,245,0.2);">${name}</a>`
  )
}

function processTokens(text: string): string {
  let html = text

  html = html.replace(
    /<ref-group users="([^"]*)" label="([^"]*)"\s*\/>/g,
    (_, users, label) => renderGroup(users, label)
  )
  html = html.replace(
    /<ref-person name="([^"]*)" avatar="([^"]*)"\s*\/>/g,
    (_, name, avatar) => renderPerson(name, avatar)
  )
  html = html.replace(
    /<ref-intel id="([^"]*)" title="([^"]*)"\s*\/>/g,
    (_, id, title) => renderIntelLink(id, title)
  )
  html = html.replace(
    /<ref-device id="([^"]*)" name="([^"]*)"\s*\/>/g,
    (_, id, name) => renderDeviceLink(id, name)
  )

  return html
}

function narrativeToHtml(paragraphs: string[]): string {
  return paragraphs
    .map((p, i) => {
      const isLast = i === paragraphs.length - 1
      const style = isLast ? PARA_STYLE.replace('margin:0 0 14px;', 'margin:0;') : PARA_STYLE
      return `<p style="${style}">${processTokens(p)}</p>`
    })
    .join('\n')
}

// ── Narrative section wrapper ─────────────────────────────────────────────────

function wrapNarrativeSection(innerHtml: string): string {
  return `
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.12);overflow:hidden;">
    <div style="height:1px;background:rgba(255,107,53,0.08);"></div>
    <div style="padding:20px 24px 22px;">
      <div style="font-size:8px;letter-spacing:0.32em;color:rgba(255,107,53,0.42);margin-bottom:16px;">— THIS WEEK IN THE COLLECTIVE —</div>
      ${innerHtml}
    </div>
  </td></tr>`
}

// ── Cached orchestrator ───────────────────────────────────────────────────────

export const getWeeklyNewsletterContent = unstable_cache(
  async (): Promise<NewsletterContent> => {
    const data = await gatherWeeklyData()

    let paragraphs: string[]
    try {
      paragraphs = await callClaude(data)
    } catch (err) {
      console.error('[newsletter] Claude generation failed:', err)
      paragraphs = [
        'The Collective has been active this week — new intel filed, field devices engaged, and members voting on open decisions.',
        'Check the console for the latest briefings.',
      ]
    }

    return {
      narrativeHtml: wrapNarrativeSection(narrativeToHtml(paragraphs)),
      weekLabel: new Date().toISOString().slice(0, 10),
      activeUsers: data.activeUsers,
      devices: data.devices,
    }
  },
  ['weekly-newsletter'],
  { revalidate: 6 * 60 * 60 }
)

// ── Shared template parts ─────────────────────────────────────────────────────

export const EMAIL_HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Transmission — Multiverse Collective</title>
<base target="_top" />
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#060A1A;font-family:'Space Mono',ui-monospace,'Courier New',monospace;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060A1A;padding:32px 16px 64px;">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">`

export const EMAIL_HEADER_REGISTERED = `
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.18);padding:0;overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:22px 28px 20px;">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:11px;">
                <img src="https://putopia.vercel.app/assets/vi-icon.png" height="36" alt=""
                     style="height:36px;width:auto;display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <img src="https://putopia.vercel.app/assets/vi-wordmark.png" height="24" alt="MULTIVERSE COLLECTIVE"
                     style="height:24px;width:auto;display:block;" />
              </td>
            </tr>
          </table>
          <div style="font-size:8px;letter-spacing:0.32em;color:rgba(245,245,245,0.28);margin-top:9px;">WEEKLY NEWSLETTER</div>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <div style="display:inline-block;border:1px solid rgba(232,160,32,0.45);padding:5px 12px;background:rgba(232,160,32,0.06);">
            <div style="font-size:7px;letter-spacing:0.2em;color:rgba(232,160,32,0.55);">STATUS</div>
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;color:#E8A020;">APPLICANT</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="height:10px;"></td></tr>`

export const EMAIL_FOOTER = `
  <tr><td style="height:24px;"></td></tr>
  <tr><td style="border-top:1px solid rgba(255,107,53,0.1);padding-top:20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:8px;letter-spacing:0.18em;color:rgba(255,107,53,0.4);">MULTIVERSE.COLLECTIVE</td>
        <td style="text-align:right;font-size:8px;letter-spacing:0.12em;color:rgba(245,245,245,0.18);">BUILDING BETTER WORLDS, TOGETHER.</td>
      </tr>
    </table>
    <div style="margin-top:10px;font-size:8px;color:rgba(245,245,245,0.15);letter-spacing:0.06em;line-height:1.8;">
      You are receiving this because you are registered in the Multiverse Collective network.<br/>
      <a href="https://putopia.vercel.app/console" style="color:rgba(255,107,53,0.35);text-decoration:none;">Manage preferences</a>
      &nbsp;·&nbsp;
      <a href="https://putopia.vercel.app/console" style="color:rgba(255,107,53,0.35);text-decoration:none;">Visit console</a>
    </div>
  </td></tr>`

export const EMAIL_TAIL = `
</table>
</td></tr>
</table>
</body>
</html>`

export const CTA_DIRECT = `
  <tr><td style="height:16px;"></td></tr>
  <tr><td style="background:linear-gradient(160deg,#1A0E2A,#0F1430);border:1px solid rgba(255,107,53,0.45);overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="210" style="vertical-align:top;padding:0;overflow:hidden;">
          <img src="https://putopia.vercel.app/voyager-pack/voyager-hero.png" width="210" alt="Initial Voyager Pack"
               style="width:210px;display:block;" />
        </td>
        <td style="vertical-align:middle;padding:24px 24px 24px 22px;">
          <div style="font-size:7px;letter-spacing:0.28em;color:rgba(255,107,53,0.6);margin-bottom:9px;">◈ INITIAL VOYAGER PACK ◈</div>
          <div style="font-size:15px;font-weight:700;letter-spacing:0.07em;color:#F5F5F5;margin-bottom:14px;line-height:1.3;">
            YOUR VOYAGER<br/>STATUS IS READY.
          </div>
          <div style="margin-bottom:5px;font-size:10px;color:rgba(245,245,245,0.55);letter-spacing:0.06em;">Physical Badge</div>
          <div style="margin-bottom:5px;font-size:10px;color:rgba(245,245,245,0.55);letter-spacing:0.06em;">Access Card</div>
          <div style="margin-bottom:18px;font-size:10px;color:rgba(245,245,245,0.55);letter-spacing:0.06em;">Full Network Access</div>
          <a href="https://putopia.vercel.app/voyager-pack"
             style="display:block;text-align:center;background:linear-gradient(135deg,#E85D04,#FF6B35);color:#060A1A;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.18em;text-decoration:none;padding:12px 14px;margin-bottom:12px;">
            [ ACTIVATE NOW ]
          </a>
          <div style="text-align:center;">
            <a href="https://putopia.vercel.app/voyager-pack"
               style="font-size:9px;letter-spacing:0.1em;color:rgba(255,107,53,0.5);text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.22);">
              Learn more →
            </a>
          </div>
        </td>
      </tr>
    </table>
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,107,53,0.2),transparent);"></div>
  </td></tr>`

export const CTA_TASK_GATED = `
  <tr><td style="height:16px;"></td></tr>
  <tr><td style="background:#0A0E27;border:1px solid rgba(232,160,32,0.35);overflow:hidden;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,160,32,0.5),transparent);"></div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="210" style="vertical-align:top;padding:0;overflow:hidden;">
          <img src="https://putopia.vercel.app/voyager-pack/voyager-hero.png" width="210" alt="Initial Voyager Pack"
               style="width:210px;display:block;filter:grayscale(55%);opacity:0.55;" />
        </td>
        <td style="vertical-align:middle;padding:24px 24px 24px 22px;">
          <div style="font-size:7px;letter-spacing:0.28em;color:rgba(232,160,32,0.6);margin-bottom:9px;">◈ YOUR PATH TO VOYAGER ◈</div>
          <div style="font-size:15px;font-weight:700;letter-spacing:0.07em;color:#F5F5F5;margin-bottom:14px;line-height:1.3;">
            ACTIVATE YOUR<br/>VOYAGER STATUS.
          </div>
          <div style="font-size:11px;color:rgba(245,245,245,0.5);line-height:1.75;margin-bottom:18px;">
            Complete the Collective&#39;s field assessment tasks to unlock the Initial Voyager Pack.
          </div>
          <a href="https://putopia.vercel.app/voyager-pack"
             style="display:block;text-align:center;background:rgba(232,160,32,0.1);color:#E8A020;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.16em;text-decoration:none;padding:12px 14px;border:1px solid rgba(232,160,32,0.5);margin-bottom:12px;">
            [ VIEW VOYAGER PACK ]
          </a>
          <div style="text-align:center;font-size:9px;letter-spacing:0.06em;color:rgba(245,245,245,0.2);">
            Pack ($12) unlocks on completion
          </div>
        </td>
      </tr>
    </table>
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,160,32,0.2),transparent);"></div>
  </td></tr>`

// ── Unregistered newsletter builder (data-driven) ─────────────────────────────

/** Build the full email HTML for unregistered users given live weekly data. */
export function buildUnregisteredHtml(
  activeUsers: Array<{ name: string; avatarUrl: string | null }>,
  devices: DeviceItem[]
): string {
  // Avatar cluster — up to 8 people with photos
  const usersWithPhoto = activeUsers.filter((u) => u.avatarUrl).slice(0, 8)
  const memberCount = activeUsers.length
  const avatarCluster = usersWithPhoto
    .map((u, i) =>
      `<img src="${u.avatarUrl}" width="28" height="28" ` +
      `style="width:28px;height:28px;border-radius:50%;display:inline;` +
      `vertical-align:middle;border:2px solid #060A1A;` +
      `margin-right:-8px;object-fit:cover;position:relative;z-index:${usersWithPhoto.length - i};" />`
    )
    .join('')

  // Device thumbnails — up to 3 with images
  const devicesWithImg = devices.filter((d) => d.imagePath).slice(0, 3)
  const deviceCols = devicesWithImg
    .map(
      (d) =>
        `<td width="33%" style="padding:0 4px;">
          <a href="https://putopia.vercel.app/devices/${d.id}" style="display:block;text-decoration:none;">
            <div style="position:relative;overflow:hidden;border:1px solid rgba(255,107,53,0.15);">
              <img src="${d.imagePath}" width="180" alt="${d.name}"
                   style="width:100%;height:90px;object-fit:cover;display:block;filter:brightness(0.65) saturate(0.7);" />
              <div style="position:absolute;bottom:0;left:0;right:0;padding:6px 8px;background:linear-gradient(transparent,rgba(6,10,26,0.92));">
                <div style="font-size:8px;letter-spacing:0.14em;color:rgba(245,245,245,0.8);font-family:'Space Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${d.id}
                </div>
              </div>
            </div>
          </a>
        </td>`
    )
    .join('')

  const deviceSection =
    devicesWithImg.length > 0
      ? `
  <tr><td style="height:10px;"></td></tr>
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.1);padding:16px 20px;">
    <div style="font-size:8px;letter-spacing:0.28em;color:rgba(255,107,53,0.38);margin-bottom:12px;">— FIELD DEVICES IN USE —</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr style="margin:0 -4px;">${deviceCols}</tr>
    </table>
    <div style="margin-top:10px;font-size:9px;color:rgba(245,245,245,0.28);letter-spacing:0.06em;">
      Members operate these devices to observe and record signals from parallel worlds.
    </div>
  </td></tr>`
      : ''

  const body = `
  <!-- ── HEADER ── -->
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.18);padding:0;overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:22px 28px 20px;">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:11px;">
                <img src="https://putopia.vercel.app/assets/vi-icon.png" height="36" alt=""
                     style="height:36px;width:auto;display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <img src="https://putopia.vercel.app/assets/vi-wordmark.png" height="24" alt="MULTIVERSE COLLECTIVE"
                     style="height:24px;width:auto;display:block;" />
              </td>
            </tr>
          </table>
          <div style="font-size:8px;letter-spacing:0.32em;color:rgba(245,245,245,0.28);margin-top:9px;">WEEKLY TRANSMISSION</div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="height:10px;"></td></tr>

  <!-- ── WHO WE ARE ── -->
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.12);padding:28px 28px 24px;">
    <div style="font-size:8px;letter-spacing:0.3em;color:rgba(255,107,53,0.42);margin-bottom:14px;">— ABOUT THE COLLECTIVE —</div>
    <div style="font-size:16px;font-weight:700;color:#F5F5F5;line-height:1.35;margin-bottom:14px;letter-spacing:0.04em;">
      We study what exists<br/>beyond this world.
    </div>
    <p style="margin:0 0 14px;font-size:11px;color:rgba(245,245,245,0.62);line-height:1.85;font-family:'Space Mono',ui-monospace,monospace;">
      The Multiverse Collective is a private network of observers, researchers, and theorists
      coordinating the monitoring of parallel worlds. We share field data, vote on decisions,
      and maintain the infrastructure that keeps our world connected to others.
    </p>
    <p style="margin:0;font-size:11px;color:rgba(245,245,245,0.62);line-height:1.85;font-family:'Space Mono',ui-monospace,monospace;">
      Membership is by invitation. The work is ongoing. The stakes are real.
    </p>
  </td></tr>

  ${deviceSection}

  <!-- ── ACTIVE MEMBERS ── -->
  <tr><td style="height:10px;"></td></tr>
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.1);padding:18px 20px;">
    <div style="font-size:8px;letter-spacing:0.28em;color:rgba(255,107,53,0.38);margin-bottom:12px;">— ACTIVE THIS WEEK —</div>
    <div style="display:inline-block;padding-right:${usersWithPhoto.length * 6 + 4}px;">
      ${avatarCluster}
    </div>
    <span style="font-size:10px;color:rgba(245,245,245,0.45);vertical-align:middle;margin-left:14px;font-family:'Space Mono',monospace;">
      ${memberCount} member${memberCount !== 1 ? 's' : ''} active this week
    </span>
  </td></tr>

  <!-- ── APPLY CTA ── -->
  <tr><td style="height:16px;"></td></tr>
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.25);overflow:hidden;text-align:center;padding:32px 28px 28px;">
    <div style="font-size:8px;letter-spacing:0.30em;color:rgba(255,107,53,0.45);margin-bottom:12px;">◈ OPEN TO NEW MEMBERS ◈</div>
    <div style="font-size:15px;font-weight:700;color:#F5F5F5;letter-spacing:0.04em;margin-bottom:10px;line-height:1.35;">
      Access is by application.
    </div>
    <div style="font-size:10px;color:rgba(245,245,245,0.45);line-height:1.8;margin-bottom:22px;">
      Apply to join. Gain access to the internal console,<br/>mission briefings, and the full network.
    </div>
    <a href="https://putopia.vercel.app"
       style="display:inline-block;background:linear-gradient(135deg,#E85D04,#FF6B35);color:#060A1A;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;letter-spacing:0.18em;text-decoration:none;padding:14px 32px;">
      APPLY FOR ACCESS →
    </a>
  </td></tr>

  <!-- ── FOOTER ── -->
  <tr><td style="height:24px;"></td></tr>
  <tr><td style="border-top:1px solid rgba(255,107,53,0.08);padding-top:18px;text-align:center;">
    <div style="font-size:8px;color:rgba(245,245,245,0.15);letter-spacing:0.06em;">
      MULTIVERSE.COLLECTIVE · BUILDING BETTER WORLDS, TOGETHER.
    </div>
  </td></tr>`

  return EMAIL_HEAD + body + EMAIL_TAIL
}

/** Static fallback for build-time exports (replaced at send time with live content). */
export function buildUnregisteredNarrativeHtml(): string {
  return buildUnregisteredHtml([], [])
}
