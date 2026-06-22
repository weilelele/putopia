/**
 * Signal Tasks VIDEO / AUDIO processing (server-only, ffmpeg).
 *
 * - Video puzzles: crop a sub-region of a Cosmo clip + apply a glitch filtergraph →
 *   short muted MP4.
 * - Audio puzzles: extract a short clip from a video's audio track → MP3. ~25% of
 *   Cosmo videos have NO audio track, so callers must skip those (probeHasAudio).
 *
 * Uses the bundled static binaries (ffmpeg-static / ffprobe-static) by default, so
 * it runs on Vercel serverless (no system ffmpeg) and in local dev alike. The
 * binaries are force-included into the function bundle via next.config
 * `outputFileTracingIncludes`. Override with FFMPEG_PATH / FFPROBE_PATH.
 */
import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, readFile, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import type { CropConfig, FilterPreset } from './presets'

/** Page background colour — circular video crops paint the corners with this so
 *  they read as a circle on the dark UI. */
const BG = '#070912'

// Vercel serverless has no system ffmpeg, so default to the bundled static
// binaries (these also work in local dev — no system install needed). Override
// via FFMPEG_PATH / FFPROBE_PATH, or fall back to PATH if the packages are gone.
const FFMPEG = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg'
const FFPROBE = process.env.FFPROBE_PATH || ffprobeStatic?.path || 'ffprobe'

const pexec = promisify(execFile)

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

async function fetchToTemp(url: string, ext: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`source fetch failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const path = join(tmpdir(), `sig-${randomUUID()}.${ext}`)
  await writeFile(path, buf)
  return path
}

async function safeUnlink(path: string) {
  try {
    await unlink(path)
  } catch {
    /* ignore */
  }
}

/** True if the video file has at least one audio stream. */
export async function probeHasAudio(path: string): Promise<boolean> {
  try {
    const { stdout } = await pexec(FFPROBE, [
      '-v', 'error',
      '-select_streams', 'a',
      '-show_entries', 'stream=codec_name',
      '-of', 'csv=p=0',
      path,
    ])
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

async function probeVideoMeta(path: string): Promise<{ width: number; height: number; duration: number }> {
  const { stdout } = await pexec(FFPROBE, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height:format=duration',
    '-of', 'json',
    path,
  ])
  const j = JSON.parse(stdout)
  const s = j.streams?.[0] ?? {}
  return {
    width: Number(s.width) || 0,
    height: Number(s.height) || 0,
    duration: Number(j.format?.duration) || 0,
  }
}

/** Map a filter preset to an ffmpeg video filter chain (applied after crop). */
function videoGlitchChain(filter: FilterPreset, i: number): string {
  const noise = Math.round(8 + 30 * i)
  const sat = (1 + 0.3 * i).toFixed(2)
  const rh = Math.round(4 + 8 * i)
  switch (filter) {
    case 'chromatic':
      return `rgbashift=rh=-${rh}:bh=${rh},noise=alls=${Math.round(noise * 0.5)}:allf=t,eq=saturation=${sat}`
    case 'glitch_art':
      // pixelate + strong channel shift + temporal noise
      return `scale=iw/3:ih/3:flags=neighbor,scale=iw*3:ih*3:flags=neighbor,rgbashift=rh=-${rh * 2}:bh=${rh * 2},noise=alls=${noise}:allf=t`
    case 'static_noise':
      return `noise=alls=${Math.round(noise * 2)}:allf=t,eq=saturation=${(1 - 0.4 * i).toFixed(2)}`
    case 'signal_decay':
    default:
      return `scale=iw/3:ih/3:flags=neighbor,scale=iw*3:ih*3:flags=neighbor,noise=alls=${noise}:allf=t,eq=saturation=${sat}`
  }
}

const clamp01 = (v: number) => clamp(v, 0, 1)
const LONGEST_EDGE = 480

function parseAspect(aspect?: string): number {
  if (!aspect) return 1
  const [w, h] = aspect.split(':').map(Number)
  if (!w || !h) return 1
  return w / h
}

/** A square PNG painted with the page bg, with a transparent centre circle — used
 *  as an ffmpeg overlay so a video crop reads as a circle on the dark UI. */
async function cornerMaskPng(size: number): Promise<Buffer> {
  const r = size / 2
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<defs><mask id="m"><rect width="${size}" height="${size}" fill="#fff"/>` +
      `<circle cx="${r}" cy="${r}" r="${r}" fill="#000"/></mask></defs>` +
      `<rect width="${size}" height="${size}" fill="${BG}" mask="url(#m)"/></svg>`,
  )
  return sharp(svg).png().toBuffer()
}

export interface VideoClipResult {
  /** Glitched MP4 — store as the canonical asset (exports, social media, admin preview). */
  buffer: Buffer
  contentType: 'video/mp4'
  ext: 'mp4'
  box: { left: number; top: number; width: number; height: number }
  /** Animated WebP derived from the MP4 — use as `<img>` on the frontend.
   *  Auto-loops without any play button. Null if WebP conversion failed. */
  displayBuffer: Buffer | null
  displayContentType: 'image/webp'
  displayExt: 'webp'
}

/**
 * Crop + glitch a short clip from a Cosmo video. `circle` is rendered by overlaying
 * a corner mask (transparent centre circle) so the crop reads as a circle on the
 * dark UI; `rect` honours cfg.aspect; otherwise square.
 *
 * Returns a muted MP4 (canonical) + an animated WebP (frontend display).
 */
export async function renderVideoClip(
  videoUrl: string,
  cfg: CropConfig,
  opts: { durSec?: number } = {},
): Promise<VideoClipResult> {
  const dur = clamp(opts.durSec ?? 4, 1, 15)
  const src = await fetchToTemp(videoUrl, 'mp4')
  const out = join(tmpdir(), `sig-${randomUUID()}.mp4`)
  let maskPath: string | null = null
  let outWebp: string | null = null
  try {
    // No ffprobe on Vercel — express the crop via the input dims (iw/ih) and let
    // ffmpeg compute it (commas inside the expressions are single-quoted so the
    // filtergraph parser doesn't treat them as filter separators). Square/circle:
    // a centred square of the requested area, scaled to a fixed 480² so the
    // circle mask has a known size. Rect: honour the aspect, cap the long edge.
    const ratio = clamp(cfg.areaRatio || 1 / 6, 0.02, 0.9).toFixed(4)
    const glitch = videoGlitchChain(cfg.filter ?? 'signal_decay', clamp01((cfg.glitchIntensity ?? 50) / 100))

    let chain: string
    if (cfg.shape === 'rect') {
      const ar = parseAspect(cfg.aspect)
      const cw = `min(iw,sqrt(iw*ih*${ratio}*${ar}))`
      const ch = `min(ih,sqrt(iw*ih*${ratio}/${ar}))`
      chain = `crop=w='${cw}':h='${ch}',${glitch},scale=${LONGEST_EDGE}:-2`
    } else {
      const side = `min(min(iw,ih),sqrt(iw*ih*${ratio}))` // ffmpeg min() is binary
      chain = `crop=w='${side}':h='${side}',${glitch},scale=${LONGEST_EDGE}:${LONGEST_EDGE}`
    }

    // Take the opening seconds — no probe means no random in-point.
    const args = ['-y', '-v', 'error', '-t', String(dur), '-i', src]
    if (cfg.shape === 'circle') {
      maskPath = join(tmpdir(), `sig-${randomUUID()}.png`)
      await writeFile(maskPath, await cornerMaskPng(LONGEST_EDGE)) // output is LONGEST_EDGE²
      args.push('-i', maskPath, '-filter_complex', `[0:v]${chain}[v0];[v0][1:v]overlay=0:0[v]`, '-map', '[v]')
    } else {
      args.push('-vf', chain)
    }
    args.push(
      '-an',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '28', '-movflags', '+faststart',
      out,
    )

    await pexec(FFMPEG, args, { maxBuffer: 1024 * 1024 * 64 })
    const buffer = await readFile(out)

    // Convert the glitched MP4 → animated WebP for frontend display.
    // Strategy: ffmpeg MP4→GIF (built-in encoder, no extra libs needed), then
    // sharp GIF→animated WebP (smaller, full-color, auto-loops as <img>).
    let displayBuffer: Buffer | null = null
    try {
      outWebp = join(tmpdir(), `sig-${randomUUID()}.gif`) // reuse var for cleanup
      await pexec(FFMPEG, [
        '-y', '-v', 'error',
        '-i', out,
        '-vf', 'fps=12,scale=320:-2',
        '-loop', '0',
        outWebp,
      ], { maxBuffer: 1024 * 1024 * 128 })
      const gifBuf = await readFile(outWebp)
      displayBuffer = await sharp(gifBuf, { animated: true })
        .webp({ quality: 75 })
        .toBuffer()
    } catch (e) {
      // WebP conversion is best-effort — MP4 is always available as fallback
      console.warn('[signal/av] WebP conversion failed (non-fatal):', (e as Error).message)
    }

    return {
      buffer,
      contentType: 'video/mp4',
      ext: 'mp4',
      box: { left: 0, top: 0, width: 0, height: 0 }, // unknown without a probe; not used for display
      displayBuffer,
      displayContentType: 'image/webp',
      displayExt: 'webp',
    }
  } finally {
    await safeUnlink(src)
    await safeUnlink(out)
    if (maskPath) await safeUnlink(maskPath)
    if (outWebp) await safeUnlink(outWebp)
  }
}

/**
 * Extract a short audio clip from a video. Returns null if the video has no audio
 * track. Output is mono MP3.
 */
export async function extractAudioClip(
  videoUrl: string,
  opts: { durSec?: number } = {},
): Promise<{ buffer: Buffer; contentType: string; ext: string } | null> {
  const dur = opts.durSec ?? 4
  const src = await fetchToTemp(videoUrl, 'mp4')
  const out = join(tmpdir(), `sig-${randomUUID()}.mp3`)
  try {
    if (!(await probeHasAudio(src))) return null
    const meta = await probeVideoMeta(src)
    const start = meta.duration > dur ? Math.random() * (meta.duration - dur) : 0
    await pexec(
      FFMPEG,
      [
        '-y', '-v', 'error',
        '-ss', start.toFixed(2),
        '-t', String(dur),
        '-i', src,
        '-vn', '-ac', '1', '-ar', '44100', '-b:a', '96k',
        out,
      ],
      { maxBuffer: 1024 * 1024 * 32 },
    )
    const buffer = await readFile(out)
    return { buffer, contentType: 'audio/mpeg', ext: 'mp3' }
  } finally {
    await safeUnlink(src)
    await safeUnlink(out)
  }
}
