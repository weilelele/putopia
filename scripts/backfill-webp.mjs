/**
 * Backfill script: convert existing video signal_task_assets to animated WebP.
 *
 * For each video row where display_url IS NULL:
 *   1. Download the MP4 from processed_url
 *   2. Convert to animated WebP via ffmpeg
 *   3. Upload to Supabase Storage (signal-assets bucket)
 *   4. Write the public URL back into display_url
 *
 * Run from the project root:
 *   node scripts/backfill-webp.mjs
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, readFile, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const sharp = require('sharp')
import { readFile as readFileSys } from 'fs/promises'

// Parse .env.local manually (no dotenv dependency needed)
const envText = await readFileSys('.env.local', 'utf8').catch(() => '')
for (const line of envText.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const pexec = promisify(execFile)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function safeUnlink(path) {
  try { await unlink(path) } catch { /* ignore */ }
}

async function convertToWebP(mp4Buffer) {
  // ffmpeg MP4 → GIF (built-in encoder) → sharp GIF → animated WebP
  const srcPath = join(tmpdir(), `bfill-${randomUUID()}.mp4`)
  const gifPath = join(tmpdir(), `bfill-${randomUUID()}.gif`)
  await writeFile(srcPath, mp4Buffer)
  try {
    await pexec('ffmpeg', [
      '-y', '-v', 'error',
      '-i', srcPath,
      '-vf', 'fps=12,scale=320:-2',
      '-loop', '0',
      gifPath,
    ], { maxBuffer: 1024 * 1024 * 128 })
    const gifBuf = await readFile(gifPath)
    return await sharp(gifBuf, { animated: true }).webp({ quality: 75 }).toBuffer()
  } finally {
    await safeUnlink(srcPath)
    await safeUnlink(gifPath)
  }
}

async function main() {
  // Fetch all video rows missing display_url
  const { data: rows, error } = await supabase
    .from('signal_task_assets')
    .select('id, task_id, processed_url')
    .eq('media', 'video')
    .is('display_url', null)

  if (error) { console.error('DB fetch failed:', error.message); process.exit(1) }
  if (!rows.length) { console.log('Nothing to backfill.'); return }

  console.log(`Backfilling ${rows.length} video asset(s)…\n`)

  for (const row of rows) {
    process.stdout.write(`  ${row.id} … `)
    try {
      // 1. Download MP4
      const res = await fetch(row.processed_url)
      if (!res.ok) throw new Error(`fetch ${res.status}`)
      const mp4 = Buffer.from(await res.arrayBuffer())

      // 2. Convert to animated WebP
      const webpBuf = await convertToWebP(mp4)

      // 3. Upload to Storage
      const storagePath = `${row.task_id}/${row.id}-d.webp`
      const { error: upErr } = await supabase.storage
        .from('signal-assets')
        .upload(storagePath, webpBuf, {
          contentType: 'image/webp',
          upsert: true,
        })
      if (upErr) throw new Error(`upload: ${upErr.message}`)

      const { data: { publicUrl } } = supabase.storage
        .from('signal-assets')
        .getPublicUrl(storagePath)

      // 4. Write display_url back
      const { error: updErr } = await supabase
        .from('signal_task_assets')
        .update({ display_url: publicUrl })
        .eq('id', row.id)
      if (updErr) throw new Error(`db update: ${updErr.message}`)

      console.log(`done (${(webpBuf.length / 1024).toFixed(0)} KB)`)
    } catch (e) {
      console.log(`FAILED — ${e.message}`)
    }
  }

  console.log('\nDone.')
}

main()
