import 'server-only'

import adaptationSchema from '@/lib/story-adaptation.schema.json'
import contentPlanSchema from '@/lib/story-content-plan.schema.json'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const DEFAULT_CODEX_PATH = '/Applications/ChatGPT.app/Contents/Resources/codex'
const OUTPUT_SCHEMAS = {
  adaptation: adaptationSchema,
  contentPlan: contentPlanSchema,
} as const

export async function runStructuredCodex<T>(input: {
  prompt: string
  schema: keyof typeof OUTPUT_SCHEMAS
  timeoutMs?: number
}): Promise<T> {
  const workspace = process.cwd()
  const configuredPath = process.env.CODEX_CLI_PATH
  const codexPath = configuredPath
    || (existsSync(DEFAULT_CODEX_PATH) ? DEFAULT_CODEX_PATH : 'codex')
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'putopia-story-lab-'))
  const outputFile = path.join(temporaryDirectory, 'result.json')
  const schemaPath = path.join(temporaryDirectory, 'schema.json')

  try {
    await writeFile(schemaPath, JSON.stringify(OUTPUT_SCHEMAS[input.schema]), 'utf8')
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        codexPath,
        [
          'exec',
          '--ephemeral',
          '--sandbox',
          'read-only',
          '--ask-for-approval',
          'never',
          '--color',
          'never',
          '--output-schema',
          schemaPath,
          '--output-last-message',
          outputFile,
          '-C',
          workspace,
          '-',
        ],
        {
          cwd: workspace,
          env: process.env,
          stdio: ['pipe', 'ignore', 'pipe'],
        },
      )

      let diagnostics = ''
      const maxDiagnosticsLength = 40_000
      const timeout = setTimeout(() => {
        child.kill('SIGTERM')
        reject(new Error('Codex did not complete this Story Lab task within five minutes.'))
      }, input.timeoutMs ?? 300_000)

      child.stderr.on('data', (chunk: Buffer) => {
        diagnostics = `${diagnostics}${chunk.toString()}`.slice(-maxDiagnosticsLength)
      })
      child.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
      child.on('close', (code) => {
        clearTimeout(timeout)
        if (code !== 0) {
          reject(new Error(diagnostics.trim() || `Codex exit code: ${code}`))
          return
        }
        resolve()
      })
      child.stdin.end(input.prompt)
    })

    const output = await readFile(outputFile, 'utf8')
    return JSON.parse(output) as T
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true })
  }
}
