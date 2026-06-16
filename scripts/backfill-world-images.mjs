/**
 * Backfill script: re-host world cover images that point at an EXTERNAL host
 * onto our own Supabase Storage (bucket `world-images`), then repoint image_path.
 *
 * Why: some early/imported worlds have image_path on a third-party CDN
 * (cdn-youhuamian.pufflearn.com) that is slow / intermittently unreachable from
 * the live site, so the covers fail to load in browsers. User-uploaded covers
 * already live in `world-images`; this only touches the external ones.
 *
 * For each world whose image_path host != our Supabase host:
 *   1. Download the image
 *   2. Compress if large (PNG / >1.5MB → WebP, max width 1600)
 *   3. Upload to world-images/<worldId>/cover.<ext> (upsert)
 *   4. Update worlds.image_path to the Supabase public URL
 *
 * Run from the project root:  node scripts/backfill-world-images.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
import { readFile } from 'fs/promises'
const require = createRequire(import.meta.url)
const sharp = require('sharp')

const envText = await readFile('.env.local', 'utf8').catch(() => '')
for (const line of envText.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const ourHost = new URL(SUPABASE_URL).host

const LARGE = 1.5 * 1024 * 1024

function isExternal(url) {
  try { return new URL(url).host !== ourHost } catch { return false }
}

async function main() {
  const { data: worlds, error } = await supabase
    .from('worlds')
    .select('id, name, image_path')
    .not('image_path', 'is', null)

  if (error) { console.error('DB fetch failed:', error.message); process.exit(1) }

  const targets = (worlds ?? []).filter((w) => w.image_path && isExternal(w.image_path))
  if (!targets.length) { console.log('Nothing to re-host — all covers are already on our storage.'); return }

  console.log(`Re-hosting ${targets.length} external cover(s)…\n`)

  for (const w of targets) {
    process.stdout.write(`  ${w.id} (${w.name}) … `)
    try {
      const res = await fetch(w.image_path, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!res.ok) throw new Error(`fetch ${res.status}`)
      let buf = Buffer.from(await res.arrayBuffer())
      const srcType = res.headers.get('content-type') || ''

      let ext, contentType
      if (srcType.includes('png') || buf.length > LARGE) {
        buf = await sharp(buf).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
        ext = 'webp'; contentType = 'image/webp'
      } else if (srcType.includes('webp')) {
        ext = 'webp'; contentType = 'image/webp'
      } else {
        ext = 'jpg'; contentType = 'image/jpeg'
      }

      const path = `${w.id}/cover.${ext}`
      const { error: upErr } = await supabase.storage
        .from('world-images')
        .upload(path, buf, { contentType, upsert: true })
      if (upErr) throw new Error(`upload: ${upErr.message}`)

      const { data: { publicUrl } } = supabase.storage.from('world-images').getPublicUrl(path)
      const { error: updErr } = await supabase.from('worlds').update({ image_path: publicUrl }).eq('id', w.id)
      if (updErr) throw new Error(`db update: ${updErr.message}`)

      console.log(`done (${(buf.length / 1024).toFixed(0)} KB → ${ext})`)
    } catch (e) {
      console.log(`FAILED — ${e.message}`)
    }
  }

  console.log('\nDone.')
}

main()
