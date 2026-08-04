import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BATCH_NAMES: Record<string, string> = {
  cologne: 'Cologne Batch',
  guizhou: 'Guizhou Batch',
  'ash-market': 'Ash Market Batch',
}

const DEFAULT_CODEX_PATH = '/Applications/ChatGPT.app/Contents/Resources/codex'

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

function runCodex(prompt: string) {
  return new Promise<{ output: string; diagnostics: string }>((resolve, reject) => {
    const workspace = process.cwd()
    const configuredPath = process.env.CODEX_CLI_PATH
    const codexPath = configuredPath || (existsSync(DEFAULT_CODEX_PATH) ? DEFAULT_CODEX_PATH : 'codex')
    const child = spawn(
      codexPath,
      [
        'exec',
        '--ephemeral',
        '--sandbox',
        'workspace-write',
        '--ask-for-approval',
        'never',
        '--color',
        'never',
        '-C',
        workspace,
        '-',
      ],
      {
        cwd: workspace,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    )

    let stdout = ''
    let stderr = ''
    const maxOutputLength = 40_000
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('Codex did not complete this revision within five minutes.'))
    }, 300_000)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = `${stdout}${chunk.toString()}`.slice(-maxOutputLength)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-maxOutputLength)
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `Codex exit code: ${code}`))
        return
      }
      resolve({
        output: stdout.trim() || 'Codex completed the revision.',
        diagnostics: stderr.trim(),
      })
    })

    child.stdin.end(prompt)
  })
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Codex revision in Batch Story Lab is available only in local development.' },
      { status: 403 }
    )
  }

  const user = await verifyArchitect()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { batchId?: string; suggestion?: string }
  const batchId = body.batchId?.trim() ?? ''
  const suggestion = body.suggestion?.trim() ?? ''
  const batchName = BATCH_NAMES[batchId]

  if (!batchName) {
    return NextResponse.json({ error: 'Unknown Batch.' }, { status: 400 })
  }
  if (suggestion.length < 2 || suggestion.length > 4_000) {
    return NextResponse.json(
      { error: 'Revision notes must contain between 2 and 4,000 characters.' },
      { status: 400 }
    )
  }

  const prompt = `You are revising the Multiverse Collective story blueprint for the ${batchName}.

The user submitted this revision request through the local Batch Story Lab:

${suggestion}

Requirements:
1. Read docs/game-design/README.md, docs/game-design/00-overview/zh.md,
   docs/game-design/07-device-archive/zh.md, docs/game-design/08-multiverse-console/zh.md,
   docs/product/device-batch-writing-guide.zh.md, and
   docs/product/device-batch-story-blueprints.zh.md in full.
2. Review the current blueprint with id="${batchId}" in
   src/app/admin/device-batches/blueprints/story-blueprints.ts.
3. Determine which story facts, content nodes, votes, visual direction, or unresolved questions
   the request affects. Perform a continuity check before editing.
4. Modify only:
   - src/app/admin/device-batches/blueprints/story-blueprints.ts
   - docs/product/device-batch-story-blueprints.zh.md
   - Only when a genuinely reusable method emerges:
     docs/product/device-batch-writing-guide.zh.md
5. Do not modify price, inventory, dates, Pack count, logistics, safety commitments, or confirmed
   facts belonging to another Batch.
6. Treat facts explicitly supplied by the user as confirmed. Mark reasonable inferences as current
   estimates, and preserve uncertain material as to be verified.
7. Every vote must state its trigger, genuine scope of influence, fixed boundaries, and result location.
8. Keep every Unit within one Batch identical in color, material expression, and appearance.
9. Keep every user-visible string in story-blueprints.ts in English.
10. Run npx tsc --noEmit and ESLint on the modified TypeScript file.
11. End with a concise English summary of what was accepted, what changed, and what still needs confirmation.

Do not create a commit, push, modify a database, or change any external service.`

  try {
    const result = await runCodex(prompt)
    return NextResponse.json({
      batchId,
      message: result.output,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[batch-story-iteration]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
