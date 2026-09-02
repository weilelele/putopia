import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { listDeviceLibraryEntries } from '@/lib/device-library-repository'

/* ─── Types ───────────────────────────────────────────────── */
interface GitFile { path: string; content: string }

/* ─── GitHub API helper ───────────────────────────────────── */
async function gh(path: string, method = 'GET', body?: object) {
  const token = process.env.GITHUB_WIKI_TOKEN
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization:          `Bearer ${token}`,
      Accept:                 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type':         'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub API ${method} ${path} → ${res.status}: ${err.slice(0, 200)}`)
  }
  return res.json()
}

/* ─── Slug helper ─────────────────────────────────────────── */
function slug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

/* ─── Markdown formatters ─────────────────────────────────── */
function fmtDate(iso: string) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—'
}

function intelMd(e: {
  title: string; tag: string; timestamp: string; classified: boolean
  content: string; publisher_name: string | null
}) {
  return [
    `# ${e.title}`,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Tag | \`${e.tag}\` |`,
    `| Date | ${fmtDate(e.timestamp)} |`,
    `| Publisher | ${e.publisher_name ?? '—'} |`,
    `| Clearance | ${e.classified ? '🔒 CLASSIFIED' : '✅ PUBLIC'} |`,
    '',
    '---',
    '',
    e.content,
    '',
  ].join('\n')
}

function worldMd(w: {
  name: string; name_en: string; discoverer_name: string
  discovery_date: string; description: string; is_verified: boolean
}) {
  return [
    `# ${w.name}`,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| English Name | ${w.name_en} |`,
    `| Discoverer | ${w.discoverer_name} |`,
    `| Discovery Date | ${fmtDate(w.discovery_date)} |`,
    `| Verified | ${w.is_verified ? '✅ Yes' : '⏳ Pending'} |`,
    '',
    '---',
    '',
    w.description,
    '',
  ].join('\n')
}

function deviceMd(d: {
  name: string; location: string; knowledge: string
  status: string | null; description: string; exploration_progress: number
}) {
  return [
    `# ${d.name}`,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Location | ${d.location} |`,
    `| Classification | ${d.knowledge === 'known' ? '✅ Known' : '🔍 Unknown'} |`,
    `| Status | ${d.status ?? '—'} |`,
    d.knowledge === 'unknown' ? `| Exploration | ${d.exploration_progress}% |` : '',
    '',
    '---',
    '',
    d.description,
    '',
  ].filter(l => l !== '').join('\n')
}

function storyMd(s: {
  title: string; author_name: string; date: string
  tags: string[]; excerpt: string; content: string
}) {
  return [
    `# ${s.title}`,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Author | ${s.author_name} |`,
    `| Date | ${fmtDate(s.date)} |`,
    `| Tags | ${s.tags.join(', ')} |`,
    '',
    '---',
    '',
    `> ${s.excerpt}`,
    '',
    s.content,
    '',
  ].join('\n')
}

/* ─── Auth guard ──────────────────────────────────────────── */
async function verifyArchitect() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data } = await admin.from('voyager_profiles').select('role').eq('id', user.id).single()
  return data?.role === 'architect'
}

/* ─── POST /api/wiki/sync ─────────────────────────────────── */
export async function POST(request: NextRequest) {
  // Allow bypass via secret header for GitHub Actions cron
  const cronSecret = request.headers.get('x-cron-secret')
  const isAuthorizedCron = cronSecret && cronSecret === process.env.CRON_SECRET

  if (!isAuthorizedCron) {
    const ok = await verifyArchitect()
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return await runSync()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[wiki/sync] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function runSync() {
  const repo  = process.env.GITHUB_WIKI_REPO!   // e.g. "weilelele/multiverse-wiki"
  const admin = createAdminClient()
  const now   = new Date().toISOString()

  /* ── Fetch all content ── */
  const [
    { data: intel },
    { data: worlds },
    devices,
    { data: stories },
  ] = await Promise.all([
    admin.from('intel').select('*').order('timestamp', { ascending: false }),
    admin.from('worlds').select('*').order('discovery_date', { ascending: true }),
    listDeviceLibraryEntries(),
    admin.from('stories').select('*').eq('is_published', true).order('date', { ascending: false }),
  ])

  const intelList   = intel   ?? []
  const worldsList  = worlds  ?? []
  const devicesList = devices ?? []
  const storiesList = stories ?? []

  /* ── Build file tree ── */
  const files: GitFile[] = []

  // Intel
  for (const e of intelList) {
    files.push({
      path:    `intel/${slug(e.title)}.md`,
      content: intelMd(e),
    })
  }

  // Worlds
  for (const w of worldsList) {
    files.push({
      path:    `worlds/${slug(w.name)}.md`,
      content: worldMd(w),
    })
  }

  // Devices
  for (const d of devicesList) {
    files.push({
      path:    `devices/${slug(d.name)}.md`,
      content: deviceMd(d),
    })
  }

  // Stories / Logs
  for (const s of storiesList) {
    files.push({
      path:    `logs/${slug(s.title)}.md`,
      content: storyMd(s),
    })
  }

  // README index
  files.push({
    path: 'README.md',
    content: buildReadme(intelList, worldsList, devicesList, storiesList, now),
  })

  // Sync metadata
  files.push({
    path: '_sync.json',
    content: JSON.stringify({
      last_sync:    now,
      intel_count:   intelList.length,
      worlds_count:  worldsList.length,
      devices_count: devicesList.length,
      logs_count:    storiesList.length,
      source:        'Putopia Supabase DB',
    }, null, 2),
  })

  /* ── Push to GitHub via Git Data API (single commit) ── */
  // 1. Get current HEAD commit SHA
  const refData   = await gh(`/repos/${repo}/git/ref/heads/main`)
  const headSha   = refData.object.sha
  const treeData  = await gh(`/repos/${repo}/git/commits/${headSha}`)
  const baseTree  = treeData.tree.sha

  // 2. Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (f) => {
      const blob = await gh(`/repos/${repo}/git/blobs`, 'POST', {
        content:  Buffer.from(f.content, 'utf-8').toString('base64'),
        encoding: 'base64',
      })
      return { path: f.path, mode: '100644', type: 'blob', sha: blob.sha }
    })
  )

  // 3. Create tree
  const newTree = await gh(`/repos/${repo}/git/trees`, 'POST', {
    base_tree: baseTree,
    tree:      treeItems,
  })

  // 4. Create commit
  const newCommit = await gh(`/repos/${repo}/git/commits`, 'POST', {
    message: `sync: ${now.slice(0, 10)} — ${intelList.length} intel · ${worldsList.length} worlds · ${devicesList.length} devices · ${storiesList.length} logs`,
    tree:    newTree.sha,
    parents: [headSha],
  })

  // 5. Update branch ref
  await gh(`/repos/${repo}/git/refs/heads/main`, 'PATCH', {
    sha: newCommit.sha,
  })

  return NextResponse.json({
    ok:      true,
    commit:  newCommit.sha.slice(0, 7),
    files:   files.length,
    counts: {
      intel:   intelList.length,
      worlds:  worldsList.length,
      devices: devicesList.length,
      logs:    storiesList.length,
    },
    synced_at: now,
  })
}

/* ─── README builder ──────────────────────────────────────── */
function buildReadme(
  intel: { title: string; tag: string; timestamp: string; classified: boolean }[],
  worlds: { name: string; discoverer_name: string; discovery_date: string }[],
  devices: { name: string; location: string; knowledge: string }[],
  stories: { title: string; author_name: string; date: string }[],
  syncedAt: string,
) {
  const rows = (arr: string[][]) =>
    arr.map(r => `| ${r.join(' | ')} |`).join('\n')

  return `# Multiverse Collective — Knowledge Base

> Auto-synced from the Multiverse Collective platform.
> Last updated: **${syncedAt.slice(0, 16).replace('T', ' ')} UTC**

---

## Intel Feed (${intel.length} entries)

| Title | Tag | Date | Clearance |
|-------|-----|------|-----------|
${rows(intel.map(e => [
  `[${e.title}](intel/${slug(e.title)}.md)`,
  `\`${e.tag}\``,
  e.timestamp.slice(0, 10),
  e.classified ? '🔒' : '✅',
]))}

---

## Parallel Worlds (${worlds.length} discovered)

| World | Discoverer | Discovery Date |
|-------|------------|----------------|
${rows(worlds.map(w => [
  `[${w.name}](worlds/${slug(w.name)}.md)`,
  w.discoverer_name,
  w.discovery_date,
]))}

---

## Devices (${devices.length} catalogued)

| Device | Location | Classification |
|--------|----------|----------------|
${rows(devices.map(d => [
  `[${d.name}](devices/${slug(d.name)}.md)`,
  d.location,
  d.knowledge === 'known' ? '✅ Known' : '🔍 Unknown',
]))}

---

## Voyager Logs (${stories.length} published)

| Title | Author | Date |
|-------|--------|------|
${rows(stories.map(s => [
  `[${s.title}](logs/${slug(s.title)}.md)`,
  s.author_name,
  s.date,
]))}

---

*This wiki is maintained by the Multiverse Collective Architect Council.*
*Source: Supabase · Synced via Putopia platform*
`
}
