/**
 * Weekly newsletter — fixed editorial copy + DB-driven intel cards & device section.
 *
 * No AI generation. Narrative copy is fixed. Intel cards and device section
 * are pulled fresh from DB each render, then cached 6 hours.
 *
 * Personalized greeting (codename) is injected per-recipient at send time.
 * Preview pages use '[CODENAME]' as placeholder.
 */

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

// ── Types ────────────────────────────────────────────────────────────────────

interface IntelItem {
  id: string
  title: string
  tag: string
  excerpt: string
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
  intelCardsHtml: string
  deviceSectionHtml: string
  weekLabel: string
  activeUsers: Array<{ name: string; avatarUrl: string | null }>
  devices: DeviceItem[] // for unregistered device strip
}

// ── Style constants ───────────────────────────────────────────────────────────

const MONO = "'Space Mono',ui-monospace,'Courier New',monospace"
const PARA = `margin:0 0 16px;font-size:11px;color:rgba(245,245,245,0.68);line-height:1.9;letter-spacing:0.01em;font-family:${MONO};`
const PARA_LAST = `margin:0;font-size:11px;color:rgba(245,245,245,0.68);line-height:1.9;letter-spacing:0.01em;font-family:${MONO};`

// ── DB data gathering ─────────────────────────────────────────────────────────

async function gatherWeeklyData(): Promise<{
  intel: IntelItem[]
  featuredDevice: DeviceItem | null
  stripDevices: DeviceItem[]
  activeUsers: Array<{ name: string; avatarUrl: string | null }>
}> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [intelRes, deviceCommentsRes, allCommentsRes, devicesRes] = await Promise.all([
    // Latest 3 intel items
    admin
      .from('intel')
      .select('id, title, tag, content')
      .order('timestamp', { ascending: false })
      .limit(3),

    // Who commented on devices this week (for activity count)
    admin
      .from('comments')
      .select('subject_id, author_name, author_avatar_url')
      .eq('subject_type', 'device')
      .gte('created_at', since)
      .eq('is_visible', true)
      .not('author_name', 'is', null),

    // All recent commenters (for active-user list)
    admin
      .from('comments')
      .select('author_name, author_avatar_url')
      .gte('created_at', since)
      .eq('is_visible', true)
      .not('author_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(40),

    // Most recently updated devices (up to 4)
    admin
      .from('devices')
      .select('id, name, status, location, image_path')
      .order('updated_at', { ascending: false })
      .limit(4),
  ])

  // Active users (unique, ordered by recency)
  type CommentRow = { author_name: string | null; author_avatar_url: string | null }
  const seen = new Set<string>()
  const activeUsers: Array<{ name: string; avatarUrl: string | null }> = []
  for (const c of (allCommentsRes.data ?? []) as CommentRow[]) {
    if (c.author_name && !seen.has(c.author_name)) {
      seen.add(c.author_name)
      activeUsers.push({ name: c.author_name, avatarUrl: c.author_avatar_url ?? null })
    }
  }

  // Device activity counts
  type DevCommentRow = { subject_id: string | null; author_name: string | null }
  const devComments = (deviceCommentsRes.data ?? []) as DevCommentRow[]
  const activityMap = new Map<string, number>()
  for (const c of devComments) {
    if (c.subject_id) {
      activityMap.set(c.subject_id, (activityMap.get(c.subject_id) ?? 0) + 1)
    }
  }

  const deviceItems: DeviceItem[] = (devicesRes.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    location: d.location,
    imagePath: d.image_path,
    activeCount: activityMap.get(d.id) ?? 0,
  }))

  return {
    intel: (intelRes.data ?? []).map((i) => ({
      id: i.id,
      title: i.title ?? '',
      tag: i.tag ?? '',
      excerpt: ((i.content as string | null) ?? '').slice(0, 160),
    })),
    featuredDevice: deviceItems[0] ?? null,
    stripDevices: deviceItems.filter((d) => d.imagePath).slice(0, 3),
    activeUsers,
  }
}

// ── Section HTML builders ─────────────────────────────────────────────────────

function buildIntelCardsHtml(intel: IntelItem[]): string {
  if (intel.length === 0) return ''

  const cards = intel
    .map(
      (item) => `
    <tr><td style="padding-bottom:6px;">
      <a href="https://putopia.vercel.app/intel/${item.id}"
         style="display:block;text-decoration:none;background:#0A0E27;border:1px solid rgba(255,107,53,0.12);padding:16px 18px;">
        <div style="font-size:7px;letter-spacing:0.24em;color:rgba(255,107,53,0.5);margin-bottom:8px;font-family:${MONO};">${item.tag.toUpperCase()}</div>
        <div style="font-size:12px;font-weight:700;color:#F5F5F5;margin-bottom:8px;line-height:1.35;font-family:${MONO};">${item.title}</div>
        <div style="font-size:9px;color:rgba(245,245,245,0.42);line-height:1.75;font-family:${MONO};">${item.excerpt}</div>
        <div style="margin-top:10px;font-size:8px;letter-spacing:0.16em;color:rgba(255,107,53,0.5);font-family:${MONO};">READ MORE →</div>
      </a>
    </td></tr>`
    )
    .join('')

  return `
  <tr><td style="height:20px;"></td></tr>
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
      <tr>
        <td style="font-size:8px;letter-spacing:0.28em;color:rgba(255,107,53,0.42);padding-bottom:10px;font-family:${MONO};">THIS WEEK'S BRIEFINGS</td>
        <td style="text-align:right;padding-bottom:10px;">
          <a href="https://putopia.vercel.app/intel"
             style="font-size:8px;letter-spacing:0.16em;color:rgba(255,107,53,0.45);text-decoration:none;font-family:${MONO};">VIEW ALL INTEL →</a>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${cards}
    </table>
  </td></tr>`
}

function buildDeviceSectionHtml(device: DeviceItem | null): string {
  if (!device) return ''

  const img = device.imagePath
    ? `<img src="${device.imagePath}" width="160" alt="${device.name}"
         style="width:160px;min-width:160px;height:120px;object-fit:cover;display:block;filter:brightness(0.65) saturate(0.8);" />`
    : `<div style="width:160px;min-width:160px;height:120px;background:#060A1A;"></div>`

  const activityLine =
    device.activeCount > 0
      ? `${device.activeCount} member${device.activeCount !== 1 ? 's' : ''} logged readings this week`
      : 'Recently updated'

  return `
  <tr><td style="height:20px;"></td></tr>
  <tr><td>
    <div style="font-size:8px;letter-spacing:0.28em;color:rgba(255,107,53,0.42);margin-bottom:10px;font-family:${MONO};">LATEST DEVICE</div>
    <a href="https://putopia.vercel.app/devices/${device.id}"
       style="display:block;text-decoration:none;background:#0A0E27;border:1px solid rgba(255,107,53,0.12);overflow:hidden;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="160" style="vertical-align:top;padding:0;width:160px;min-width:160px;">${img}</td>
          <td style="vertical-align:middle;padding:16px 20px;">
            <div style="font-size:7px;letter-spacing:0.22em;color:rgba(255,107,53,0.5);margin-bottom:6px;font-family:${MONO};">${device.id}</div>
            <div style="font-size:13px;font-weight:700;color:#F5F5F5;margin-bottom:8px;line-height:1.3;font-family:${MONO};">${device.name}</div>
            <div style="font-size:9px;color:rgba(245,245,245,0.4);margin-bottom:4px;font-family:${MONO};">Status: ${device.status ?? 'Active'}</div>
            <div style="font-size:9px;color:rgba(245,245,245,0.4);margin-bottom:14px;font-family:${MONO};">${activityLine}</div>
            <div style="font-size:8px;letter-spacing:0.16em;color:rgba(255,107,53,0.5);font-family:${MONO};">VIEW DEVICE →</div>
          </td>
        </tr>
      </table>
    </a>
  </td></tr>`
}

// ── Fixed editorial copy ──────────────────────────────────────────────────────

function buildRegisteredNarrativeHtml(): string {
  return `
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.10);padding:22px 26px 24px;">
    <p style="${PARA}">This week marks our organization's official debut to the public. We have welcomed many new members for a simple reason: we need fresh energy to maintain the order of the parallel worlds and the connections between them.</p>
    <p style="${PARA_LAST}">Of course, we have also identified some challenges. Many people are skeptical of our organization, and since much of our information is still being processed and hasn't been disclosed yet, some only have a partial understanding of what we do. We ask for your patience and look forward to even more people joining our ranks.</p>
  </td></tr>`
}

// ── Cached content orchestrator ───────────────────────────────────────────────

export const getWeeklyNewsletterContent = unstable_cache(
  async (): Promise<NewsletterContent> => {
    const { intel, featuredDevice, stripDevices, activeUsers } = await gatherWeeklyData()
    return {
      intelCardsHtml: buildIntelCardsHtml(intel),
      deviceSectionHtml: buildDeviceSectionHtml(featuredDevice),
      weekLabel: new Date().toISOString().slice(0, 10),
      activeUsers,
      devices: stripDevices,
    }
  },
  ['weekly-newsletter'],
  { revalidate: 6 * 60 * 60 }
)

// ── Shared template scaffolding ───────────────────────────────────────────────

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

export const EMAIL_TAIL = `
</table>
</td></tr>
</table>
</body>
</html>`

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
          <div style="font-size:8px;letter-spacing:0.32em;color:rgba(245,245,245,0.28);margin-top:9px;font-family:'Space Mono',monospace;">WEEKLY NEWSLETTER</div>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <div style="display:inline-block;border:1px solid rgba(232,160,32,0.45);padding:5px 12px;background:rgba(232,160,32,0.06);">
            <div style="font-size:7px;letter-spacing:0.2em;color:rgba(232,160,32,0.55);font-family:'Space Mono',monospace;">STATUS</div>
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;color:#E8A020;font-family:'Space Mono',monospace;">APPLICANT</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="height:10px;"></td></tr>`

/** Personalized greeting. Pass real codename at send time; preview uses '[CODENAME]'. */
export function buildGreetingHtml(codename: string): string {
  return `
  <tr><td style="padding:16px 4px 2px;">
    <div style="font-size:20px;font-weight:700;color:#F5F5F5;letter-spacing:0.05em;font-family:'Space Mono',ui-monospace,monospace;">${codename},</div>
  </td></tr>`
}

export const EMAIL_FOOTER = `
  <tr><td style="height:28px;"></td></tr>
  <tr><td style="border-top:1px solid rgba(255,107,53,0.1);padding-top:20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:8px;letter-spacing:0.18em;color:rgba(255,107,53,0.4);font-family:'Space Mono',monospace;">MULTIVERSE.COLLECTIVE</td>
        <td style="text-align:right;font-size:8px;letter-spacing:0.12em;color:rgba(245,245,245,0.18);font-family:'Space Mono',monospace;">BUILDING BETTER WORLDS, TOGETHER.</td>
      </tr>
    </table>
    <div style="margin-top:10px;font-size:8px;color:rgba(245,245,245,0.15);letter-spacing:0.06em;line-height:1.8;font-family:'Space Mono',monospace;">
      You are receiving this because you are registered in the Multiverse Collective network.<br/>
      <a href="https://putopia.vercel.app/console" style="color:rgba(255,107,53,0.35);text-decoration:none;">Manage preferences</a>
      &nbsp;·&nbsp;
      <a href="https://putopia.vercel.app/console" style="color:rgba(255,107,53,0.35);text-decoration:none;">Visit console</a>
    </div>
  </td></tr>`

// ── CTA blocks ────────────────────────────────────────────────────────────────

const VOYAGER_PACK_COPY = `
    <p style="${PARA}">This week, we have prepared the all-new Voyager Pack for everyone. By passing various tests, you will gain higher levels of authorization, participate more deeply in our organization, and get closer to the Multiverse Console — our organization's mysterious device.</p>
    <p style="${PARA_LAST}">We look forward to seeing what you, and everyone else, will achieve.</p>`

export const CTA_DIRECT = `
  <tr><td style="height:20px;"></td></tr>
  <tr><td style="background:linear-gradient(160deg,#1A0E2A,#0F1430);border:1px solid rgba(255,107,53,0.35);overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="200" style="vertical-align:top;padding:0;width:200px;min-width:200px;">
          <img src="https://putopia.vercel.app/voyager-pack/voyager-hero.png" width="200" alt="Initial Voyager Pack"
               style="width:200px;display:block;" />
        </td>
        <td style="vertical-align:middle;padding:22px 22px 22px 20px;">
          <div style="font-size:7px;letter-spacing:0.28em;color:rgba(255,107,53,0.6);margin-bottom:12px;font-family:'Space Mono',monospace;">◈ INITIAL VOYAGER PACK ◈</div>
          ${VOYAGER_PACK_COPY}
          <div style="margin-top:18px;">
            <a href="https://putopia.vercel.app/voyager-pack"
               style="display:block;text-align:center;background:linear-gradient(135deg,#E85D04,#FF6B35);color:#060A1A;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.18em;text-decoration:none;padding:13px 14px;">
              [ ACTIVATE NOW → ]
            </a>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>`

export const CTA_TASK_GATED = `
  <tr><td style="height:20px;"></td></tr>
  <tr><td style="background:#0A0E27;border:1px solid rgba(232,160,32,0.30);overflow:hidden;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,160,32,0.5),transparent);"></div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="200" style="vertical-align:top;padding:0;width:200px;min-width:200px;">
          <img src="https://putopia.vercel.app/voyager-pack/voyager-hero.png" width="200" alt="Initial Voyager Pack"
               style="width:200px;display:block;filter:grayscale(60%);opacity:0.5;" />
        </td>
        <td style="vertical-align:middle;padding:22px 22px 22px 20px;">
          <div style="font-size:7px;letter-spacing:0.28em;color:rgba(232,160,32,0.6);margin-bottom:12px;font-family:'Space Mono',monospace;">◈ INITIAL VOYAGER PACK ◈</div>
          ${VOYAGER_PACK_COPY}
          <div style="margin-top:18px;">
            <a href="https://putopia.vercel.app/voyager-pack"
               style="display:block;text-align:center;background:rgba(232,160,32,0.08);color:#E8A020;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.16em;text-decoration:none;padding:13px 14px;border:1px solid rgba(232,160,32,0.45);">
              [ VIEW VOYAGER PACK → ]
            </a>
            <div style="margin-top:10px;text-align:center;font-size:9px;color:rgba(245,245,245,0.2);font-family:'Space Mono',monospace;">
              Pack unlocks upon completing your field assessment.
            </div>
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
    EMAIL_HEADER_REGISTERED +
    buildGreetingHtml(codename) +
    buildRegisteredNarrativeHtml() +
    content.intelCardsHtml +
    content.deviceSectionHtml +
    CTA_DIRECT +
    EMAIL_FOOTER +
    EMAIL_TAIL
  )
}

/** Group B — registered, task-gated purchase. codename is injected at send time. */
export function buildTaskGatedHtml(content: NewsletterContent, codename = '[CODENAME]'): string {
  return (
    EMAIL_HEAD +
    EMAIL_HEADER_REGISTERED +
    buildGreetingHtml(codename) +
    buildRegisteredNarrativeHtml() +
    content.intelCardsHtml +
    content.deviceSectionHtml +
    CTA_TASK_GATED +
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
        `border:2px solid #060A1A;margin-right:-8px;object-fit:cover;` +
        `position:relative;z-index:${usersWithPhoto.length - i};" />`
    )
    .join('')

  const deviceCols = devices
    .filter((d) => d.imagePath)
    .slice(0, 3)
    .map(
      (d) =>
        `<td width="33%" style="padding:0 4px;vertical-align:top;">
          <a href="https://putopia.vercel.app" style="display:block;text-decoration:none;">
            <div style="overflow:hidden;border:1px solid rgba(255,107,53,0.15);">
              <img src="${d.imagePath}" width="180" alt="${d.name}"
                   style="width:100%;height:90px;object-fit:cover;display:block;filter:brightness(0.6) saturate(0.7);" />
            </div>
            <div style="font-size:8px;letter-spacing:0.12em;color:rgba(245,245,245,0.3);margin-top:5px;
                        font-family:'Space Mono',monospace;text-align:center;">${d.id}</div>
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
    <span style="font-size:10px;color:rgba(245,245,245,0.38);vertical-align:middle;margin-left:14px;font-family:'Space Mono',monospace;">
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
                <img src="https://putopia.vercel.app/assets/vi-icon.png" height="36" alt=""
                     style="height:36px;width:auto;display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <img src="https://putopia.vercel.app/assets/vi-wordmark.png" height="24" alt="MULTIVERSE COLLECTIVE"
                     style="height:24px;width:auto;display:block;" />
              </td>
            </tr>
          </table>
          <div style="font-size:8px;letter-spacing:0.32em;color:rgba(245,245,245,0.28);margin-top:9px;font-family:'Space Mono',monospace;">TRANSMISSION</div>
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
    <div style="font-size:8px;letter-spacing:0.28em;color:rgba(255,107,53,0.42);margin-bottom:14px;font-family:'Space Mono',monospace;">◈ OPEN TO NEW MEMBERS ◈</div>
    <a href="https://putopia.vercel.app"
       style="display:inline-block;background:linear-gradient(135deg,#E85D04,#FF6B35);color:#060A1A;
              font-family:'Space Mono',monospace;font-size:12px;font-weight:700;
              letter-spacing:0.18em;text-decoration:none;padding:14px 36px;">
      APPLY FOR ACCESS →
    </a>
  </td></tr>

  <tr><td style="height:24px;"></td></tr>
  <tr><td style="border-top:1px solid rgba(255,107,53,0.08);padding-top:18px;text-align:center;">
    <div style="font-size:8px;color:rgba(245,245,245,0.15);letter-spacing:0.06em;font-family:'Space Mono',monospace;">
      MULTIVERSE.COLLECTIVE · BUILDING BETTER WORLDS, TOGETHER.
    </div>
  </td></tr>`

  return EMAIL_HEAD + body + EMAIL_TAIL
}
