import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Lazy getter — reads env var at request time, not at module load time.
// Module-level init causes "Could not resolve authentication method" in
// Next.js App Router because env vars aren't injected yet when the module loads.
function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

/* ─── Auth guard ─────────────────────────────────────────── */
async function verifyArchitect() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('voyager_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'architect' ? user : null
}

/* ─── POST /api/studio/generate ─────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    return await handleGenerate(request)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[studio] Unhandled error:', msg)
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 })
  }
}

async function handleGenerate(request: NextRequest) {
  const user = await verifyArchitect()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { brief, platforms, contentType, referenceId } = await request.json() as {
    brief: string
    platforms: string[]
    contentType: string
    referenceId?: string
  }

  if (!brief?.trim() || !platforms?.length) {
    return NextResponse.json({ error: 'brief and platforms are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  /* ── Fetch knowledge base ── */
  const [{ data: intelRows }, { data: worldRows }, { data: deviceRows }] = await Promise.all([
    admin.from('intel')
      .select('title, content, tag')
      .eq('classified', false)
      .order('timestamp', { ascending: false })
      .limit(8),
    admin.from('worlds')
      .select('name, description, discoverer_name, discovery_date')
      .order('created_at', { ascending: false })
      .limit(10),
    admin.from('devices')
      .select('name, location, description, knowledge, status')
      .eq('knowledge', 'known')
      .limit(6),
  ])

  /* ── Fetch optional reference entry ── */
  let refContent = ''
  if (referenceId) {
    if (referenceId.startsWith('w-')) {
      // World reference
      const wid = referenceId.slice(2)
      const { data: w } = await admin.from('worlds').select('name, description, discoverer_name, discovery_date').eq('id', wid).single()
      if (w) refContent = `REFERENCE — PARALLEL WORLD:\nName: ${w.name}\nDiscovered by: ${w.discoverer_name} on ${w.discovery_date}\n${w.description}`
    } else if (referenceId.startsWith('d-')) {
      // Device reference
      const did = referenceId.slice(2)
      const { data: d } = await admin.from('devices').select('name, location, description, knowledge, status').eq('id', did).single()
      if (d) refContent = `REFERENCE — DEVICE:\nName: ${d.name}\nLocation: ${d.location}\nStatus: ${d.knowledge} / ${d.status ?? 'unknown'}\n${d.description}`
    } else {
      // Intel reference
      const { data: intel } = await admin.from('intel').select('title, content, tag').eq('id', referenceId).single()
      if (intel) refContent = `REFERENCE — INTEL [${intel.tag}]:\n${intel.title}\n${intel.content}`
    }
  }

  /* ── Build knowledge base string ── */
  const intelSection = (intelRows ?? [])
    .map(e => `[${e.tag}] ${e.title}\n${e.content}`)
    .join('\n\n---\n\n')

  const worldsSection = (worldRows ?? [])
    .map(w => `${w.name} — ${w.description} (first contact: ${w.discoverer_name}, ${w.discovery_date})`)
    .join('\n')

  const devicesSection = (deviceRows ?? [])
    .map(d => `${d.name} @ ${d.location} [${d.status ?? 'unknown'}] — ${d.description}`)
    .join('\n')

  /* ══════════════════════════════════════════════════════
     SYSTEM PROMPT — marked for Anthropic Prompt Caching
     This block is re-used across every generation request.
     The knowledge base rarely changes, so cache hit rate
     will be high after the first call.
  ══════════════════════════════════════════════════════ */
  const systemPrompt = `You are the official social media voice of Multiverse Collective — a decentralized, centuries-old organization that explores parallel worlds and works to preserve stability across timelines and the current world.

━━ ORGANIZATION ━━

MISSION: Actively explore parallel worlds. Maintain harmony and stability in the current world.

ROLES:
• Voyager — holds a Multiverse Console; observes and interacts with parallel worlds
• Architect — establishes new world connections; develops Console expansion modules

CORE DEVICE — Multiverse Console (MC):
A mysterious parallel-world communication device. ~20 units believed to exist globally. Origin unknown (likely transmitted from another world via quantum energy). Functions: spatial signal detection across frequency bands · quantum energy discharge · transtemporal audio transmission · inner voice reception from intelligent life in other worlds. Modular: accepts energy cartridges and expansion attachments. Each unit carries traces of its previous operators.

KEY LORE:
• The current world's data overload is damaging parallel world connections, destabilizing human emotion globally
• Connections between worlds determine each world's stability — more connections = more order and vitality
• Each Console passed between operators carries embedded memories of prior users
• Establishing a world connection creates a stabilizing energy field around the operator
• Parallel Collective branches likely exist in other worlds but cannot yet communicate with each other

━━ KNOWLEDGE BASE ━━

RECENT INTEL:
${intelSection}

DISCOVERED PARALLEL WORLDS:
${worldsSection}

KNOWN ACTIVE DEVICES:
${devicesSection}

━━ WRITING RULES ━━

VOICE:
• Cryptic but grounded. Poetic but never purple or vague.
• Authoritative — like a transmission from inside the operation, not a press release.
• Every word earns its place. No filler. No exclamation marks unless the moment truly demands it.
• Vocabulary to draw from: signal, frequency, Voyager, Console, parallel world, observation, quantum, transmission, fold, node, uplink, coordinates, anomaly, classified, dispatch.

PLATFORM RULES:

• Instagram [English]
  2–5 sentences. Atmospheric, immersive. Natural line breaks for rhythm.
  Hashtag strategy — pick from these tiers, total 7–10 tags:
    HIGH VOLUME (pick 2–3, drives discovery): #scifiart #mystery #alternativereality
      #quantumphysics #multiverse #spaceart #sciencefiction #conspiracy #paranormal
    MID TIER (pick 3–4, engaged community): #paralleldimensions #dimensionalshift
      #quantumreality #secretsociety #hiddenworld #collectiveconsciousness
      #interdimensional #cosmicmystery #alternateuniverse #voidaesthetic
    BRAND (pick 1–2, always include): #MultiverseCollective #VoyagerLog
  Do NOT make up hashtags that have no real audience. Choose from the lists above.

• X / Twitter [English]
  ≤ 280 characters. One sharp, complete idea. Reads like a signal intercept.
  Hashtags: 0–2 maximum. Only add one if it meaningfully helps reach (e.g. #scifi #mystery).
  Most tweets should have zero hashtags — the copy carries the weight.

• 小红书 / RED [中文]
  语言：全程中文，可保留专有名词英文原文（Multiverse Console、Voyager）。
  标题：15–20 字，抓人，可有悬念或情绪钩子，像在召唤某类特定的人。
  正文：150–300 字，分 3–4 段，每段 2–3 句，段落间空一行。
  Emoji：每段 1 个，全文不超过 5 个，点缀而非堆砌。
  语气：个人化、感性，像 Voyager 真实分享探索体验，不是公告。
  话题标签策略 — 结尾另起一行，共 5–8 个：
    高流量（选 2–3）：#科幻 #平行宇宙 #神秘事件 #宇宙 #量子力学 #未解之谜
    中等（选 2–3）：#平行世界 #维度旅行 #意识探索 #赛博朋克 #科幻美学 #神秘组织
    品牌（必选 1–2）：#多元宇宙集合体 #旅行者日志
  禁止："小编"、"大家好"、"点赞收藏"、自创无人搜索的标签。

IMAGE PROMPT RULES (for LovArt / Midjourney):
• Be specific and directed — shot type, lighting setup, color palette, mood, texture.
• Multiverse Collective aesthetic: deep-space blue (#080C20), off-white (#F5F5F5), and one controlled Pantone 1665 C orange (#E35205). Orange identifies the organization, an active signal, or the path inward; it is never ambient decoration.
• Favor sparse, precise compositions, flat color, sharp edges, generous negative space, restrained surface contrast, and carefully placed documentary or product imagery.
• Avoid cyan, grey as a brand color, gradients, glow, bloom, glass blur, CRT scan lines, HUD rails, generic sci-fi dashboards, cartoonish imagery, and stock-photo styling.`

  /* ── User message (not cached — changes per request) ── */
  const requestedPlatforms = platforms.join(', ')
  const userMessage = [
    refContent ? `${refContent}\n\n` : '',
    `CONTENT TYPE: ${contentType.replace(/_/g, ' ').toUpperCase()}`,
    `REQUESTED PLATFORMS: ${requestedPlatforms}`,
    '',
    `BRIEF:\n${brief.trim()}`,
    '',
    'Respond with ONLY a valid JSON object — no markdown fences, no explanation, nothing else.',
    'Required keys and rules:',
    `  "instagram"         — English caption + hashtags. Write content ONLY if "instagram" is in REQUESTED PLATFORMS, otherwise "".`,
    `  "twitter"           — English tweet, strictly ≤ 280 characters. Write content ONLY if "twitter" is in REQUESTED PLATFORMS, otherwise "".`,
    `  "xiaohongshu_title" — Chinese title, 15–20 characters. Write content ONLY if "xiaohongshu" is in REQUESTED PLATFORMS, otherwise "".`,
    `  "xiaohongshu_body"  — Chinese body with paragraph breaks and #话题 tags. Write content ONLY if "xiaohongshu" is in REQUESTED PLATFORMS, otherwise "".`,
    `  "image_prompt"      — Full LovArt/Midjourney prompt in English, 100–200 words. Always required.`,
    `  "image_prompt_short"— One concise English sentence, ≤ 20 words, describing the image. Always required.`,
  ].filter(Boolean).join('\n')

  /* ── Call Claude with prompt caching ── */
  const response = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        // Cache the knowledge base — invalidates only when DB content changes
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      { role: 'user', content: userMessage },
    ],
  })

  /* ── Parse response ── */
  const raw = response.content[0].type === 'text' ? response.content[0].text : ''

  // Detect truncation before attempting parse
  if (response.stop_reason === 'max_tokens') {
    console.error('[studio] Response truncated. stop_reason=max_tokens. raw length:', raw.length)
    return NextResponse.json({ error: 'Response was too long and got cut off. Try selecting fewer platforms.' }, { status: 500 })
  }

  // Extract JSON — grab from first { to last } to handle any surrounding text
  const start = raw.indexOf('{')
  const end   = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    console.error('[studio] No JSON object found. raw:', raw.slice(0, 500))
    return NextResponse.json({ error: 'Model did not return valid JSON. Please try again.' }, { status: 500 })
  }

  let parsed: Record<string, string>
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch (e) {
    console.error('[studio] JSON.parse failed:', e, '\nraw slice:', raw.slice(start, end + 1).slice(0, 600))
    return NextResponse.json({ error: 'Could not parse model response as JSON. Please try again.' }, { status: 500 })
  }

  /* ── Build Pollinations URL for draft preview ── */
  const previewPrompt = encodeURIComponent(
    `${parsed.image_prompt_short ?? 'minimal archival parallel world artifact'}, deep-space blue background, off-white details, one controlled Pantone 1665 C orange accent, flat color, precise composition, no cyan, no grey brand color, no gradients, no glow, no HUD decoration, no text, no logo`
  )
  const pollinationsUrl =
    `https://image.pollinations.ai/prompt/${previewPrompt}?width=1024&height=1024&model=flux&nologo=true&seed=${Date.now()}`

  return NextResponse.json({
    instagram:          parsed.instagram           ?? '',
    twitter:            parsed.twitter             ?? '',
    xiaohongshu_title:  parsed.xiaohongshu_title  ?? '',
    xiaohongshu_body:   parsed.xiaohongshu_body   ?? '',
    image_prompt:       parsed.image_prompt        ?? '',
    image_prompt_short: parsed.image_prompt_short  ?? '',
    pollinations_url:   pollinationsUrl,
    // expose usage for debugging (cache hit/miss)
    _usage: {
      input_tokens:              response.usage.input_tokens,
      output_tokens:             response.usage.output_tokens,
      cache_creation_input_tokens: (response.usage as unknown as Record<string, number>).cache_creation_input_tokens ?? 0,
      cache_read_input_tokens:     (response.usage as unknown as Record<string, number>).cache_read_input_tokens     ?? 0,
    },
  })
}  // end handleGenerate
