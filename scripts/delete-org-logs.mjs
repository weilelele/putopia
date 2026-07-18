/**
 * Delete the auto-generated "The Organization" posts from the Voyager Logs
 * (the `stories` table). These are the `signal-day-*` / `signal-inv-*` entries
 * the app used to cross-post whenever a signal day was published or a world
 * entered tuning — that behaviour has been removed (see signal-tasks.ts), and
 * the feed already filters them out (see lib/actions/stories.ts). This script
 * physically removes the existing rows.
 *
 * SAFETY:
 *   - Targets ONLY rows where author_name = 'The Organization'.
 *     Real Voyager logs (Page Chen, Luke Brandner, …) are never touched.
 *   - Dry-run by default: prints what WOULD be deleted and exits.
 *   - Pass --confirm to actually delete.
 *
 * ⚠️  This writes to the PRODUCTION Supabase database. Review the dry-run
 *     output first, then re-run with --confirm.
 *
 * Usage:
 *   node scripts/delete-org-logs.mjs            # dry run (no changes)
 *   node scripts/delete-org-logs.mjs --confirm  # perform the delete
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_AUTHOR = 'The Organization'
const confirm = process.argv.includes('--confirm')

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: targets, error: selErr } = await sb
  .from('stories')
  .select('id, title, date')
  .eq('author_name', SYSTEM_AUTHOR)
  .order('date', { ascending: false })

if (selErr) {
  console.error('Select failed:', selErr.message)
  process.exit(1)
}

console.log(`Found ${targets.length} "${SYSTEM_AUTHOR}" post(s):`)
for (const r of targets) console.log(`  ${r.date} | ${r.id} | ${r.title}`)

if (!targets.length) {
  console.log('Nothing to delete.')
  process.exit(0)
}

if (!confirm) {
  console.log('\nDRY RUN — no rows deleted. Re-run with --confirm to delete the above.')
  process.exit(0)
}

const { error: delErr, count } = await sb
  .from('stories')
  .delete({ count: 'exact' })
  .eq('author_name', SYSTEM_AUTHOR)

if (delErr) {
  console.error('Delete failed:', delErr.message)
  process.exit(1)
}

console.log(`\nDeleted ${count ?? targets.length} row(s).`)
