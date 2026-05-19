'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import type { VoyagerProfile, IntelTag } from '@/types/database'

export type GeneratedNews = {
  title: string
  content: string
  imagePrompt: string
}

// Style A — Archive Entry (ORG / DEVICE)
// Dense, objective, encyclopedic. Third-person or collective voice.
// Reads like an internal record filed for future reference.
const SYSTEM_ARCHIVE = `You are the intelligence archivist of Putopia Collective — a private community dedicated to parallel-world observation. Members are called Voyagers; the governing tier is called Architects. Core activities include tracking signal-emitting devices (Consoles), cataloguing parallel worlds, and filing structured intelligence reports (Intel).

Your writing style for archive entries:
- Objective, third-person or collective-voice ("The Collective", "Observers on record")
- Dense with specifics: dates, unit IDs, percentages, locations, status codes
- No rhetorical flourish. No filler phrases. No emotional language.
- Reads like a field report or encyclopaedia entry, not a newsletter
- Sentences are complete but lean. Paragraphs are functional units of information.`

const PROMPT_ARCHIVE = (personaLines: string, idea: string) => `
Generate one Intel entry for the Putopia Collective internal archive.

PUBLISHER
${personaLines}

CORE IDEA
${idea}

REQUIREMENTS
Title: ≤20 words. Factual. Can include em-dash or brackets for sub-classification. No punctuation at end.
Body: 100–180 words. Archive-entry style — objective, dense, structured. Written from the Collective's perspective. Incorporate the publisher's background naturally (their domain, location, or focus) to give the entry a clear authorial source without making it personal or emotional.
Image prompt: English, 20–30 words, cinematic still — a dark atmospheric scene that visually encodes the subject matter (signal, space, observation, architecture). No people. Suitable for Flux image model.

Return strictly as JSON, no markdown fences:
{"title":"...","content":"...","imagePrompt":"..."}`

// Style B — Internal Bulletin (NOTICE)
// Direct, action-oriented. Reads like a formal internal announcement.
// Clear subject, clear implication, occasionally specifies required action.
const SYSTEM_BULLETIN = `You are the communications officer of Putopia Collective — a private community dedicated to parallel-world observation. Members are called Voyagers; the governing tier is called Architects. Core activities include tracking signal-emitting devices (Consoles), cataloguing parallel worlds, and filing structured intelligence reports (Intel).

Your writing style for internal bulletins:
- Formal but efficient. Direct address to the Collective ("All Voyagers", "Effective immediately")
- Leads with the most important fact in the first sentence
- Uses precise institutional language: statuses, deadlines, designations
- May include a single required action at the end (brief, imperative)
- No storytelling. No padding. Like a memo that wastes no one's time.`

const PROMPT_BULLETIN = (personaLines: string, idea: string) => `
Generate one Intel bulletin for the Putopia Collective internal channel.

PUBLISHER
${personaLines}

CORE IDEA
${idea}

REQUIREMENTS
Title: ≤20 words. Can open with a tag like [NOTICE], [UPDATE], or [ALERT] in brackets. Factual and specific.
Body: 80–150 words. Bulletin style — direct, formal, action-relevant. State what happened, what it means, and (if applicable) what Voyagers or Architects should do next. Reflect the publisher's role/domain without making it personal.
Image prompt: English, 20–30 words, cinematic still — a dark atmospheric scene encoding urgency or structure (signal array, control room, orbital station). No people. Suitable for Flux image model.

Return strictly as JSON, no markdown fences:
{"title":"...","content":"...","imagePrompt":"..."}`

// Route style by tag
function getPromptConfig(tag: IntelTag, personaLines: string, idea: string) {
  if (tag === 'NOTICE') {
    return { system: SYSTEM_BULLETIN, user: PROMPT_BULLETIN(personaLines, idea) }
  }
  // ORG and DEVICE → Archive Entry
  return { system: SYSTEM_ARCHIVE, user: PROMPT_ARCHIVE(personaLines, idea) }
}

// Generate news draft via Claude
export async function generateNews(
  idea: string,
  persona: Pick<VoyagerProfile, 'display_name' | 'bio' | 'location'>,
  tag: IntelTag = 'ORG'
): Promise<{ data: GeneratedNews | null; error: string | null }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { data: null, error: 'ANTHROPIC_API_KEY not configured in .env.local' }
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const personaLines = [
    `Name: ${persona.display_name}`,
    persona.bio     ? `Bio: ${persona.bio}`         : null,
    persona.location ? `Location: ${persona.location}` : null,
  ].filter(Boolean).join('\n')

  const { system, user } = getPromptConfig(tag, personaLines, idea)

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { data: null, error: 'Unexpected model output format — please retry' }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedNews
    if (!parsed.title || !parsed.content || !parsed.imagePrompt) {
      return { data: null, error: 'Incomplete generation — please retry' }
    }

    return { data: parsed, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { data: null, error: `Generation failed: ${msg}` }
  }
}

// Fetch all Architect profiles (for publisher selection)
export async function getArchitects(): Promise<VoyagerProfile[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('voyager_profiles')
    .select('*')
    .eq('role', 'architect')
    .order('joined_at', { ascending: true })

  return data ?? []
}
