// Runs every supabase/tests/*.mjs against an in-memory PGlite (PostgreSQL/WASM).
// Each test gets the installed module path as argv[2]; no env, network or shared database.
// Usage: npm run test:sql [-- name-filter ...]
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pglite = fileURLToPath(import.meta.resolve('@electric-sql/pglite'))
const dir = fileURLToPath(new URL('../supabase/tests/', import.meta.url))
const filters = process.argv.slice(2)
const tests = readdirSync(dir).filter(f => f.endsWith('.mjs')).filter(f => !filters.length || filters.some(x => f.includes(x))).sort()
if (!tests.length) { console.error('No SQL tests matched.'); process.exit(1) }

const failed = []
for (const test of tests) {
  const started = Date.now()
  const { status, stdout, stderr } = spawnSync(process.execPath, [dir + test, pglite], { encoding: 'utf8', env: { PATH: process.env.PATH } })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  if (status === 0) {
    console.log(`✓ ${test} (${seconds}s)`)
  } else {
    failed.push(test)
    // PGlite's bundled source is printed on uncaught errors; keep only the useful tail.
    console.log(`✗ ${test} (${seconds}s)\n${(stdout + stderr).trim().split('\n').slice(-40).map(line => line.length > 400 ? line.slice(0, 400) + '…' : line).join('\n')}`)
  }
}
console.log(`\n${tests.length - failed.length}/${tests.length} SQL tests passed`)
if (failed.length) process.exit(1)
