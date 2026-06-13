/**
 * Weekly newsletter generation.
 *
 * Gathers last-7-day activity (intel, votes, comments) from the DB, feeds
 * it to Claude to produce an editorial narrative, then renders the narrative
 * to email-safe HTML with inline avatar + link tokens replaced.
 *
 * Results are cached for 6 hours so repeated page loads don't burn tokens.
 */

import Anthropic from '@anthropic-ai/sdk'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

// ── Types ────────────────────────────────────────────────────────────────────

interface IntelItem {
  id: string
  title: string
  tag: string
  excerpt: string      // first ~300 chars of content
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
  subjectType: string   // 'intel' | 'world' | 'device'
  subjectId: string
}

interface WeeklyData {
  intel: IntelItem[]
  votes: VoteItem[]
  comments: CommentItem[]
}

export interface NewsletterContent {
  /** Rendered HTML for the narrative section (ready to embed in email template) */
  narrativeHtml: string
  /** ISO date string for the week label */
  weekLabel: string
}

// ── DB data gathering ────────────────────────────────────────────────────────

async function gatherWeeklyData(): Promise<WeeklyData> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [intelRes, votesRes, commentsRes] = await Promise.all([
    admin
      .from('intel')
      .select('id, title, tag, content')
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(8),

    admin
      .from('votes')
      .select('id, title, description, options')
      .or(`created_at.gte.${since},is_active.eq.true`)
      .order('created_at', { ascending: false })
      .limit(5),

    admin
      .from('comments')
      .select('author_name, author_avatar_url, body, subject_type, subject_id')
      .gte('created_at', since)
      .eq('is_visible', true)
      .not('author_name', 'is', null)
      .not('body', 'is', null)
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  // Response counts per vote (parallel)
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

  const intelItems: IntelItem[] = (intelRes.data ?? []).map((i) => ({
    id: i.id,
    title: i.title ?? '',
    tag: i.tag ?? '',
    excerpt: ((i.content as string | null) ?? '').slice(0, 320),
  }))

  const voteItems: VoteItem[] = votesData.map((v, idx) => {
    const opts = (v.options as Array<{ id: string; label: string }>) ?? []
    return {
      title: v.title ?? '',
      description: (v.description ?? '').slice(0, 220),
      responseCount: voteCounts[idx],
      optionLabels: opts.slice(0, 4).map((o) => o.label),
    }
  })

  // Only keep comments with meaningful content (> 25 chars)
  type CommentRow = {
    author_name: string | null
    author_avatar_url: string | null
    body: string | null
    subject_type: string | null
    subject_id: string | null
  }
  const commentItems: CommentItem[] = ((commentsRes.data ?? []) as CommentRow[])
    .filter((c) => c.body && c.body.trim().length > 25)
    .slice(0, 12)
    .map((c) => ({
      authorName: c.author_name ?? 'Unknown',
      authorAvatarUrl: c.author_avatar_url ?? null,
      body: (c.body ?? '').slice(0, 200),
      subjectType: c.subject_type ?? '',
      subjectId: c.subject_id ?? '',
    }))

  return { intel: intelItems, votes: voteItems, comments: commentItems }
}

// ── Claude narrative generation ──────────────────────────────────────────────

const NARRATIVE_PROMPT = `You are the editorial voice of the Multiverse Collective — a secretive scientific organization that studies and monitors parallel worlds. Your writing is measured, slightly mysterious, intelligent, and human. You never use jargon for its own sake.

Write a weekly newsletter briefing covering the Collective's recent activity. Use exactly 3 paragraphs. Each paragraph should flow as natural prose — no bullet points, no headers, no markdown. The tone should feel like a message from a thoughtful senior member recapping the week to colleagues.

IMPORTANT RULES:
- When you want to name a specific person in the narrative, use this exact format: <ref-person name="Full Name" avatar="avatar_url_or_empty"/>
- When you want to reference a specific intel report, use this exact format: <ref-intel id="INT-XXXXXX" title="Short descriptive title"/>
- Only reference people who appear in the MEMBER ACTIVITY section with an avatar_url. If someone has no avatar, you can still name them but use avatar="".
- Only reference intel IDs that appear in the INTEL REPORTS section.
- Do not invent events, people, or intel IDs.
- Keep each paragraph to 3-5 sentences.
- Respond ONLY with a JSON object in this exact shape, nothing else:
{"paragraphs": ["paragraph 1 text", "paragraph 2 text", "paragraph 3 text"]}`

function buildDataPrompt(data: WeeklyData): string {
  const lines: string[] = []

  lines.push('=== INTEL REPORTS (past 7 days) ===')
  if (data.intel.length === 0) {
    lines.push('(no new intel this week)')
  } else {
    for (const i of data.intel) {
      lines.push(`ID: ${i.id} | Tag: ${i.tag}`)
      lines.push(`Title: ${i.title}`)
      lines.push(`Excerpt: ${i.excerpt}`)
      lines.push('---')
    }
  }

  lines.push('\n=== ACTIVE VOTES ===')
  if (data.votes.length === 0) {
    lines.push('(no active votes)')
  } else {
    for (const v of data.votes) {
      lines.push(`Title: ${v.title}`)
      lines.push(`Context: ${v.description}`)
      lines.push(`Responses: ${v.responseCount}`)
      lines.push(`Options: ${v.optionLabels.join(' / ')}`)
      lines.push('---')
    }
  }

  lines.push('\n=== MEMBER ACTIVITY (recent comments) ===')
  if (data.comments.length === 0) {
    lines.push('(no recent member comments)')
  } else {
    for (const c of data.comments) {
      const avatar = c.authorAvatarUrl ?? ''
      lines.push(`Author: ${c.authorName} | avatar_url: ${avatar}`)
      lines.push(`On: ${c.subjectType}/${c.subjectId}`)
      lines.push(`Comment: "${c.body}"`)
      lines.push('---')
    }
  }

  return lines.join('\n')
}

async function callClaude(data: WeeklyData): Promise<string[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: NARRATIVE_PROMPT,
    messages: [{ role: 'user', content: buildDataPrompt(data) }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  // Strip any markdown code fences Claude might add
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned) as { paragraphs: string[] }
  return parsed.paragraphs.filter(Boolean)
}

// ── Token → HTML rendering ───────────────────────────────────────────────────

function renderPersonInline(name: string, avatarUrl: string): string {
  const img = avatarUrl
    ? `<img src="${avatarUrl}" width="16" height="16" ` +
      `style="width:16px;height:16px;border-radius:50%;display:inline;` +
      `vertical-align:middle;margin:0 3px 2px 1px;object-fit:cover;" />`
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

function renderParagraphHtml(text: string): string {
  let html = text
  html = html.replace(
    /<ref-person name="([^"]*)" avatar="([^"]*)"\s*\/>/g,
    (_, name, avatar) => renderPersonInline(name, avatar)
  )
  html = html.replace(
    /<ref-intel id="([^"]*)" title="([^"]*)"\s*\/>/g,
    (_, id, title) => renderIntelLink(id, title)
  )
  return html
}

function narrativeToHtml(paragraphs: string[]): string {
  return paragraphs
    .map((p, i) => {
      const isLast = i === paragraphs.length - 1
      const style = isLast ? PARA_STYLE.replace('margin:0 0 16px;', 'margin:0;') : PARA_STYLE
      return `<p style="${style}">${renderParagraphHtml(p)}</p>`
    })
    .join('\n')
}

// ── Narrative section HTML wrapper ────────────────────────────────────────────

function wrapNarrativeSection(innerHtml: string): string {
  return `
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.12);overflow:hidden;">
    <div style="height:1px;background:rgba(255,107,53,0.08);"></div>
    <div style="padding:22px 24px 24px;">
      <div style="font-size:8px;letter-spacing:0.32em;color:rgba(255,107,53,0.42);margin-bottom:18px;">— THIS WEEK IN THE COLLECTIVE —</div>
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
      // Graceful fallback
      paragraphs = [
        'The Collective has been active this week across multiple fronts — new intelligence has been filed, observers have weighed in on critical decisions, and field activity continues to expand.',
        'Members are encouraged to review the latest reports and cast their votes on open questions currently before the group.',
        'More updates to follow. Stay connected.',
      ]
    }

    const narrativeHtml = wrapNarrativeSection(narrativeToHtml(paragraphs))
    const weekLabel = new Date().toISOString().slice(0, 10)

    return { narrativeHtml, weekLabel }
  },
  ['weekly-newsletter'],
  { revalidate: 6 * 60 * 60 } // 6 hours
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
  <!-- ── HEADER ── -->
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.18);padding:0;overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:22px 28px 20px;">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:11px;">
                <img src="https://putopia.vercel.app/assets/vi-icon.png"
                     height="36" alt=""
                     style="height:36px;width:auto;display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <img src="https://putopia.vercel.app/assets/vi-wordmark.png"
                     height="24" alt="MULTIVERSE COLLECTIVE"
                     style="height:24px;width:auto;display:block;" />
              </td>
            </tr>
          </table>
          <div style="font-size:8px;letter-spacing:0.32em;color:rgba(245,245,245,0.28);margin-top:9px;">
            WEEKLY NEWSLETTER
          </div>
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

export const EMAIL_HEADER_UNREGISTERED = `
  <!-- ── HEADER ── -->
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.18);padding:0;overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:22px 28px 20px;">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:11px;">
                <img src="https://putopia.vercel.app/assets/vi-icon.png"
                     height="36" alt=""
                     style="height:36px;width:auto;display:block;" />
              </td>
              <td style="vertical-align:middle;">
                <img src="https://putopia.vercel.app/assets/vi-wordmark.png"
                     height="24" alt="MULTIVERSE COLLECTIVE"
                     style="height:24px;width:auto;display:block;" />
              </td>
            </tr>
          </table>
          <div style="font-size:8px;letter-spacing:0.32em;color:rgba(245,245,245,0.28);margin-top:9px;">
            WEEKLY TRANSMISSION
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="height:10px;"></td></tr>`

export const EMAIL_FOOTER = `
  <tr><td style="height:24px;"></td></tr>

  <!-- ── FOOTER ── -->
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

// ── CTA blocks ────────────────────────────────────────────────────────────────

export const CTA_DIRECT = `
  <tr><td style="height:16px;"></td></tr>

  <!-- ── CTA: GROUP A — direct purchase ── -->
  <tr><td style="background:linear-gradient(160deg,#1A0E2A,#0F1430);border:1px solid rgba(255,107,53,0.45);overflow:hidden;">
    <div style="height:2px;background:linear-gradient(90deg,#E85D04,#FF6B35,#DC2F02);"></div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="210" style="vertical-align:top;padding:0;overflow:hidden;">
          <img src="https://putopia.vercel.app/voyager-pack/voyager-hero.png"
               width="210" alt="Initial Voyager Pack"
               style="width:210px;display:block;" />
        </td>
        <td style="vertical-align:middle;padding:24px 24px 24px 22px;">
          <div style="font-size:7px;letter-spacing:0.28em;color:rgba(255,107,53,0.6);margin-bottom:9px;">◈ INITIAL VOYAGER PACK ◈</div>
          <div style="font-size:15px;font-weight:700;letter-spacing:0.07em;color:#F5F5F5;margin-bottom:14px;line-height:1.3;">
            YOUR VOYAGER<br/>STATUS IS READY.
          </div>
          <div style="margin-bottom:5px;font-size:10px;color:rgba(245,245,245,0.55);letter-spacing:0.06em;line-height:1;">Physical Badge</div>
          <div style="margin-bottom:5px;font-size:10px;color:rgba(245,245,245,0.55);letter-spacing:0.06em;line-height:1;">Access Card</div>
          <div style="margin-bottom:18px;font-size:10px;color:rgba(245,245,245,0.55);letter-spacing:0.06em;line-height:1;">Full Network Access</div>
          <a href="https://putopia.vercel.app/voyager-pack"
             style="display:block;text-align:center;background:linear-gradient(135deg,#E85D04,#FF6B35);color:#060A1A;font-family:'Space Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.18em;text-decoration:none;padding:12px 14px;margin-bottom:12px;">
            [ ACTIVATE NOW ]
          </a>
          <div style="text-align:center;">
            <a href="https://putopia.vercel.app/voyager-pack"
               style="font-size:9px;letter-spacing:0.1em;color:rgba(255,107,53,0.5);text-decoration:none;border-bottom:1px solid rgba(255,107,53,0.22);">
              Learn more about this item →
            </a>
          </div>
        </td>
      </tr>
    </table>
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,107,53,0.2),transparent);"></div>
  </td></tr>`

export const CTA_TASK_GATED = `
  <tr><td style="height:16px;"></td></tr>

  <!-- ── CTA: GROUP B — task gated ── -->
  <tr><td style="background:#0A0E27;border:1px solid rgba(232,160,32,0.35);overflow:hidden;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(232,160,32,0.5),transparent);"></div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="210" style="vertical-align:top;padding:0;overflow:hidden;">
          <img src="https://putopia.vercel.app/voyager-pack/voyager-hero.png"
               width="210" alt="Initial Voyager Pack — locked until assessment complete"
               style="width:210px;display:block;filter:grayscale(55%);opacity:0.55;" />
        </td>
        <td style="vertical-align:middle;padding:24px 24px 24px 22px;">
          <div style="font-size:7px;letter-spacing:0.28em;color:rgba(232,160,32,0.6);margin-bottom:9px;">◈ YOUR PATH TO VOYAGER ◈</div>
          <div style="font-size:15px;font-weight:700;letter-spacing:0.07em;color:#F5F5F5;margin-bottom:14px;line-height:1.3;">
            ACTIVATE YOUR<br/>VOYAGER STATUS.
          </div>
          <div style="font-size:11px;color:rgba(245,245,245,0.5);line-height:1.75;margin-bottom:18px;">
            Complete the Collective&#39;s field assessment tasks to unlock the Initial Voyager Pack and activate your status.
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

export const CTA_UNREGISTERED = `
  <tr><td style="height:20px;"></td></tr>

  <!-- ── CTA: Unregistered — apply for access ── -->
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.25);overflow:hidden;text-align:center;padding:36px 28px 32px;">
    <div style="font-size:8px;letter-spacing:0.30em;color:rgba(255,107,53,0.45);margin-bottom:14px;">◈ JOIN THE COLLECTIVE ◈</div>
    <div style="font-size:18px;font-weight:700;color:#F5F5F5;letter-spacing:0.06em;margin-bottom:12px;line-height:1.3;">
      The workspace is<br/>open to new members.
    </div>
    <div style="font-size:11px;color:rgba(245,245,245,0.45);line-height:1.8;margin-bottom:24px;max-width:380px;margin-left:auto;margin-right:auto;">
      The Multiverse Collective is an active, invitation-only research network.
      Apply now to gain access to our internal console, mission briefings, and field data.
    </div>
    <a href="https://putopia.vercel.app"
       style="display:inline-block;background:linear-gradient(135deg,#E85D04,#FF6B35);color:#060A1A;font-family:'Space Mono',monospace;font-size:13px;font-weight:700;letter-spacing:0.18em;text-decoration:none;padding:16px 36px;">
      APPLY FOR ACCESS →
    </a>
  </td></tr>`

/** Unregistered teaser narrative — vague, no intel specifics */
export function buildUnregisteredNarrativeHtml(): string {
  const inner = `
    <p style="${PARA_STYLE}">
      This week, the Collective's internal workspace has seen a notable increase in field activity.
      Reports are being filed, deliberations are underway, and members across the network have been contributing
      observations from their respective monitoring stations.
    </p>
    <p style="margin:0;font-size:12px;color:rgba(245,245,245,0.72);line-height:1.95;letter-spacing:0.01em;font-family:'Space Mono',ui-monospace,monospace;">
      The details of these transmissions are accessible only to verified members of the Collective.
      If you have been considering joining, this is an active week to do so.
    </p>`
  return `
  <tr><td style="background:#0A0E27;border:1px solid rgba(255,107,53,0.12);overflow:hidden;">
    <div style="height:1px;background:rgba(255,107,53,0.08);"></div>
    <div style="padding:22px 24px 24px;">
      <div style="font-size:8px;letter-spacing:0.32em;color:rgba(255,107,53,0.42);margin-bottom:18px;">— THIS WEEK IN THE COLLECTIVE —</div>
      ${inner}
    </div>
  </td></tr>`
}

const PARA_STYLE =
  'margin:0 0 16px;font-size:12px;color:rgba(245,245,245,0.72);' +
  'line-height:1.95;letter-spacing:0.01em;font-family:\'Space Mono\',ui-monospace,monospace;'
