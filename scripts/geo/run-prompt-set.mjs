#!/usr/bin/env node
/**
 * Runs the fixed GEO prompt set (docs/marketing/geo/07-measurement.zh.md §2)
 * against the model APIs whose keys are configured, and writes:
 *   geo-runs/<date>/raw.jsonl      full answers + source URLs
 *   geo-runs/<date>/scorecard.csv  scorecard rows; auto-fills mention/citation
 *                                  columns, leaves accuracy/competitors for a human
 *
 * Keys come only from the local environment and are never written anywhere:
 *   OPENAI_API_KEY      (+ GEO_OPENAI_MODEL)      OpenAI Responses API + web_search
 *   PERPLEXITY_API_KEY  (+ GEO_PERPLEXITY_MODEL)  Perplexity Sonar
 *   GEMINI_API_KEY      (+ GEO_GEMINI_MODEL)      Gemini + Google Search grounding
 *   ANTHROPIC_API_KEY   (+ GEO_ANTHROPIC_MODEL)   Claude Messages API + web_search
 *
 * Usage:
 *   node scripts/geo/run-prompt-set.mjs --dry-run
 *   node scripts/geo/run-prompt-set.mjs [--engines openai,perplexity] [--prompts P01,P46]
 *                                       [--samples 3] [--out geo-runs/2026-11-24]
 *
 * Requests run one at a time to stay inside rate limits. API answers differ
 * from the consumer apps; keep them in a separate scorecard (see the doc §3.2).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DOC = path.join(ROOT, 'docs/marketing/geo/07-measurement.zh.md')
const OUR_DOMAIN = 'multiverseco.org'
const BRAND_RE = /multiverse\s+collective|multiverse\s+console|multiverseco\.org/i

const COLUMNS = [
  'run_month', 'run_date', 'checker', 'engine', 'mode', 'logged_in', 'location',
  'prompt_id', 'category', 'core', 'prompt', 'sample', 'mentioned', 'position',
  'list_size', 'mention_type', 'cited_our_url', 'our_cited_urls',
  'other_cited_domains', 'accuracy', 'accuracy_notes', 'sentiment',
  'competitors', 'answer_link', 'screenshot', 'notes',
]

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const args = { dryRun: false, samples: 1, engines: null, prompts: null, out: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--samples') args.samples = Math.max(1, Number.parseInt(argv[++i], 10) || 1)
    else if (a === '--engines') args.engines = argv[++i].split(',').map((s) => s.trim())
    else if (a === '--prompts') args.prompts = argv[++i].split(',').map((s) => s.trim().toUpperCase())
    else if (a === '--out') args.out = argv[++i]
    else throw new Error(`Unknown argument: ${a}`)
  }
  return args
}

// ---------------------------------------------------------------- prompt set

function parsePromptTable(markdown) {
  const rows = []
  const re = /^\|\s*(P\d{2,})\s*\|\s*([a-z_]+)\s*\|\s*(★?)\s*\|\s*(.+?)\s*\|\s*$/
  for (const line of markdown.split('\n')) {
    const m = line.match(re)
    if (m) rows.push({ id: m[1], category: m[2], core: m[3] === '★', prompt: m[4] })
  }
  return rows
}

// ---------------------------------------------------------------- engines

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

const ENGINES = {
  openai: {
    code: 'openai_api',
    key: 'OPENAI_API_KEY',
    model: () => process.env.GEO_OPENAI_MODEL || 'gpt-5',
    async ask(prompt, model) {
      const data = await postJson(
        'https://api.openai.com/v1/responses',
        { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        { model, input: prompt, tools: [{ type: 'web_search' }] },
      )
      let text = ''
      const urls = []
      for (const item of data.output ?? []) {
        if (item.type !== 'message') continue
        for (const part of item.content ?? []) {
          if (part.type !== 'output_text') continue
          text += part.text
          for (const ann of part.annotations ?? []) if (ann.url) urls.push(ann.url)
        }
      }
      return { text, urls }
    },
  },

  perplexity: {
    code: 'perplexity_api',
    key: 'PERPLEXITY_API_KEY',
    model: () => process.env.GEO_PERPLEXITY_MODEL || 'sonar',
    async ask(prompt, model) {
      const data = await postJson(
        'https://api.perplexity.ai/chat/completions',
        { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
        { model, messages: [{ role: 'user', content: prompt }] },
      )
      const text = data.choices?.[0]?.message?.content ?? ''
      const urls = [
        ...(data.citations ?? []),
        ...(data.search_results ?? []).map((r) => r.url),
      ].filter(Boolean)
      return { text, urls }
    },
  },

  gemini: {
    code: 'gemini_api',
    key: 'GEMINI_API_KEY',
    model: () => process.env.GEO_GEMINI_MODEL || 'gemini-2.5-flash',
    async ask(prompt, model) {
      const data = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { 'x-goog-api-key': process.env.GEMINI_API_KEY },
        { contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }] },
      )
      const cand = data.candidates?.[0]
      const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('')
      // Grounding URIs are Google redirect links; the chunk title carries the source domain.
      const urls = (cand?.groundingMetadata?.groundingChunks ?? [])
        .map((c) => (c.web?.title && !/^https?:/.test(c.web.title) ? `https://${c.web.title}/` : c.web?.uri))
        .filter(Boolean)
      return { text, urls }
    },
  },

  anthropic: {
    code: 'anthropic_api',
    key: 'ANTHROPIC_API_KEY',
    model: () => process.env.GEO_ANTHROPIC_MODEL || 'claude-opus-5-5',
    async ask(prompt, model) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const client = new Anthropic()
      const messages = [{ role: 'user', content: prompt }]
      let text = ''
      const urls = []
      // Server-side web search can pause a long turn; continue it a few times.
      for (let turn = 0; turn < 4; turn++) {
        const response = await client.beta.messages.create({
          model,
          max_tokens: 16000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          tools: [{
            type: 'web_search_20260209',
            name: 'web_search',
            max_uses: 5,
            user_location: { type: 'approximate', country: 'US' },
          }],
          messages,
        })
        if (response.stop_reason === 'refusal') return { text, urls, note: 'refused' }
        for (const block of response.content) {
          if (block.type === 'text') {
            text += block.text
            for (const c of block.citations ?? []) if (c.url) urls.push(c.url)
          } else if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
            for (const r of block.content) if (r.url) urls.push(r.url)
          }
        }
        if (response.stop_reason !== 'pause_turn') break
        messages.push({ role: 'assistant', content: response.content })
      }
      return { text, urls }
    },
  },
}

// ---------------------------------------------------------------- scoring

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Numbered / bulleted list items, in order. A crude stand-in for "the recommendation list". */
function listItems(text) {
  return text
    .split('\n')
    .filter((line) => /^\s*(?:\d+[.)]|[-*•])\s+\S/.test(line))
}

function scoreAnswer(text, urls) {
  const mentioned = BRAND_RE.test(text)
  const items = listItems(text)
  const idx = items.findIndex((line) => BRAND_RE.test(line))
  const unique = [...new Set(urls)]
  const ours = unique.filter((u) => hostOf(u)?.endsWith(OUR_DOMAIN))
  const otherDomains = [...new Set(unique.map(hostOf).filter((h) => h && !h.endsWith(OUR_DOMAIN)))]
  return {
    mentioned: mentioned ? 'Y' : 'N',
    position: idx >= 0 ? String(idx + 1) : '',
    list_size: items.length ? String(items.length) : '',
    cited_our_url: ours.length ? 'Y' : 'N',
    our_cited_urls: ours.join(' '),
    other_cited_domains: otherDomains.slice(0, 10).join(' '),
  }
}

function csvCell(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// ---------------------------------------------------------------- main

async function main() {
  const args = parseArgs(process.argv.slice(2))
  let prompts = parsePromptTable(fs.readFileSync(DOC, 'utf8'))
  if (prompts.length === 0) throw new Error(`No prompts parsed from ${DOC}`)
  if (args.prompts) prompts = prompts.filter((p) => args.prompts.includes(p.id))

  const wanted = args.engines ?? Object.keys(ENGINES)
  for (const name of wanted) if (!ENGINES[name]) throw new Error(`Unknown engine: ${name}`)
  const engines = wanted.filter((name) => process.env[ENGINES[name].key])
  const skipped = wanted.filter((name) => !engines.includes(name))

  console.log(`Prompts: ${prompts.length} (${prompts.filter((p) => p.core).length} core)`)
  console.log(`Engines with keys: ${engines.join(', ') || '(none)'}`)
  if (skipped.length) console.log(`Skipped (no key): ${skipped.join(', ')}`)
  console.log(`Samples per prompt: ${args.samples}`)
  console.log(`Requests: ${prompts.length * engines.length * args.samples}`)

  if (args.dryRun) {
    for (const p of prompts) console.log(`${p.id}\t${p.category}\t${p.core ? '★' : ' '}\t${p.prompt}`)
    return
  }
  if (engines.length === 0) {
    console.error('No API keys configured; nothing to run. See the header of this script.')
    process.exitCode = 1
    return
  }

  const now = new Date()
  const runDate = now.toISOString().slice(0, 10)
  const outDir = path.resolve(ROOT, args.out ?? path.join('geo-runs', runDate))
  fs.mkdirSync(outDir, { recursive: true })
  const rawPath = path.join(outDir, 'raw.jsonl')
  const csvPath = path.join(outDir, 'scorecard.csv')
  const raw = fs.createWriteStream(rawPath, { flags: 'a' })
  const csvExists = fs.existsSync(csvPath)
  const csv = fs.createWriteStream(csvPath, { flags: 'a' })
  if (!csvExists) csv.write(COLUMNS.join(',') + '\n')

  for (const name of engines) {
    const engine = ENGINES[name]
    const model = engine.model()
    for (const p of prompts) {
      for (let sample = 1; sample <= args.samples; sample++) {
        const base = {
          run_month: runDate.slice(0, 7), run_date: runDate, checker: 'script',
          engine: engine.code, mode: model, logged_in: 'N', location: 'api',
          prompt_id: p.id, category: p.category, core: p.core ? 'Y' : 'N',
          prompt: p.prompt, sample: String(sample),
        }
        let row
        try {
          const { text, urls, note } = await engine.ask(p.prompt, model)
          const score = scoreAnswer(text, urls)
          row = { ...base, ...score, mention_type: score.mentioned === 'Y' ? '' : 'none', notes: note ?? '' }
          raw.write(JSON.stringify({ ...base, model, text, urls }) + '\n')
          console.log(`${engine.code} ${p.id} #${sample}: mentioned=${score.mentioned} cited=${score.cited_our_url}`)
        } catch (err) {
          row = { ...base, notes: `error: ${err.message}`.slice(0, 200) }
          console.error(`${engine.code} ${p.id} #${sample}: ${err.message}`)
        }
        csv.write(COLUMNS.map((c) => csvCell(row[c])).join(',') + '\n')
      }
    }
  }
  raw.end()
  csv.end()
  console.log(`\nWrote ${path.relative(ROOT, csvPath)} and ${path.relative(ROOT, rawPath)}`)
  console.log('Fill accuracy / competitors / sentiment by hand before copying into docs/marketing/geo/scorecards/.')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
