/**
 * Signal Tasks IMAGE processing pipeline (server-only).
 *
 * Source image URL (Cosmo) → crop a small sub-region (shape + area ratio) → apply a
 * named glitch filter to degrade clarity → upload to the Supabase `signal-assets`
 * bucket. Runs at authoring time. Video/audio live in ./av.ts.
 *
 * Filter presets:
 *  - signal_decay  : pixelate + gaussian noise + scanlines (CRT signal loss)
 *  - chromatic     : RGB channel split / colour aberration
 *  - glitch_art    : horizontal slice displacement + channel ghosting (datamosh look)
 *  - static_noise  : heavy grain / TV static over a desaturated base
 */
import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase/server'
import { DEFAULT_CROP } from './presets'
import type { CropConfig, FilterPreset } from './presets'

// re-export so existing server-side imports from '@/lib/signal/process' keep working
export { DEFAULT_CROP, FILTER_PRESETS } from './presets'
export type { CropConfig, CropShape, FilterPreset } from './presets'

/** longest output edge — keeps file sizes (esp. circle PNGs) sane. */
const MAX_OUT = 640

export interface ProcessedAsset {
  path: string
  url: string
  box: { left: number; top: number; width: number; height: number }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function parseAspect(aspect?: string): number {
  if (!aspect) return 1
  const [w, h] = aspect.split(':').map(Number)
  if (!w || !h) return 1
  return w / h
}

export function computeBox(
  srcW: number,
  srcH: number,
  cfg: CropConfig,
): { left: number; top: number; width: number; height: number } {
  const ratio = clamp(cfg.areaRatio || DEFAULT_CROP.areaRatio, 0.02, 0.9)
  const targetArea = srcW * srcH * ratio

  let w: number
  let h: number
  if (cfg.shape === 'rect') {
    const ar = parseAspect(cfg.aspect)
    w = Math.sqrt(targetArea * ar)
    h = targetArea / w
  } else {
    w = Math.sqrt(targetArea)
    h = w
  }

  w = clamp(Math.round(w), 8, srcW)
  h = clamp(Math.round(h), 8, srcH)

  let left: number
  let top: number
  if (cfg.position && cfg.position !== 'random') {
    left = clamp(Math.round(cfg.position.x * srcW - w / 2), 0, srcW - w)
    top = clamp(Math.round(cfg.position.y * srcH - h / 2), 0, srcH - h)
  } else {
    left = Math.floor(Math.random() * (srcW - w + 1))
    top = Math.floor(Math.random() * (srcH - h + 1))
  }
  return { left, top, width: w, height: h }
}

// ── overlay helpers ───────────────────────────────────────────────────────────
function noiseInput(w: number, h: number, sigma: number) {
  return {
    create: {
      width: w,
      height: h,
      channels: 3 as const,
      background: { r: 0, g: 0, b: 0 },
      noise: { type: 'gaussian' as const, mean: 0, sigma },
    },
  }
}

function scanlineSvg(w: number, h: number, intensity: number): Buffer {
  const opacity = (0.1 + 0.3 * intensity).toFixed(3)
  const lines: string[] = []
  for (let y = 0; y < h; y += 3) {
    lines.push(`<rect x="0" y="${y}" width="${w}" height="1" fill="#000" opacity="${opacity}"/>`)
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${lines.join('')}</svg>`,
  )
}

function circleMaskSvg(w: number, h: number): Buffer {
  const r = Math.min(w, h) / 2
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<circle cx="${w / 2}" cy="${h / 2}" r="${r}" fill="#fff"/></svg>`,
  )
}

// ── filter presets (each returns a PNG buffer; one composite() per pipeline) ──
async function fSignalDecay(buf: Buffer, w: number, h: number, i: number): Promise<Buffer> {
  const small = Math.max(6, Math.round(w * (1 - 0.55 * i)))
  return sharp(buf)
    .resize(small, null, { kernel: 'nearest' })
    .resize(w, h, { kernel: 'nearest' })
    .modulate({ saturation: 1 + 0.3 * i, brightness: 1 - 0.05 * i })
    .composite([
      { input: noiseInput(w, h, 8 + 42 * i), blend: 'overlay' },
      { input: scanlineSvg(w, h, i), blend: 'over' },
    ])
    .png()
    .toBuffer()
}

async function fChromatic(buf: Buffer, w: number, h: number, i: number): Promise<Buffer> {
  const shift = clamp(Math.round(w * 0.03 * i), 0, 30)
  if (shift === 0) return sharp(buf).png().toBuffer()
  const r = await sharp(buf).linear([1, 0, 0], [0, 0, 0]).toBuffer()
  const g = await sharp(buf).linear([0, 1, 0], [0, 0, 0]).toBuffer()
  const b = await sharp(buf).linear([0, 0, 1], [0, 0, 0]).toBuffer()
  const cw = w + 2 * shift
  const merged = await sharp({
    create: { width: cw, height: h, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      { input: r, left: 0, top: 0, blend: 'add' },
      { input: g, left: shift, top: 0, blend: 'add' },
      { input: b, left: 2 * shift, top: 0, blend: 'add' },
    ])
    .extract({ left: shift, top: 0, width: w, height: h })
    .png()
    .toBuffer()
  // faint scanlines for extra signal feel
  return sharp(merged)
    .composite([{ input: scanlineSvg(w, h, i * 0.4), blend: 'over' }])
    .png()
    .toBuffer()
}

async function fGlitchArt(buf: Buffer, w: number, h: number, i: number): Promise<Buffer> {
  const n = 6 + Math.round(14 * i)
  const stripH = Math.ceil(h / n)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comps: any[] = []
  for (let s = 0; s < n; s++) {
    const top = s * stripH
    if (top >= h) break
    const hh = Math.min(stripH, h - top)
    const strip = await sharp(buf).extract({ left: 0, top, width: w, height: hh }).toBuffer()
    const shifted = Math.random() < 0.45
    const dx = shifted ? clamp(Math.round(Math.random() * w * 0.25 * i), 0, w - 1) : 0
    comps.push({ input: strip, left: dx, top })
    if (shifted && Math.random() < 0.5) {
      const ghost = await sharp(buf)
        .extract({ left: 0, top, width: w, height: hh })
        .linear([1.4, 0, 0], [0, 0, 0])
        .toBuffer()
      comps.push({ input: ghost, left: clamp(dx + Math.round(w * 0.05), 0, w - 1), top, blend: 'add' })
    }
  }
  comps.push({ input: noiseInput(w, h, 6 + 24 * i), left: 0, top: 0, blend: 'overlay' })
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: 5, g: 5, b: 8 } } })
    .composite(comps)
    .modulate({ saturation: 1 + 0.2 * i })
    .png()
    .toBuffer()
}

async function fStaticNoise(buf: Buffer, w: number, h: number, i: number): Promise<Buffer> {
  return sharp(buf)
    .modulate({ saturation: 1 - 0.5 * i, brightness: 1 + 0.03 * i })
    .composite([
      { input: noiseInput(w, h, 20 + 70 * i), blend: 'overlay' },
      { input: noiseInput(w, h, 15 + 50 * i), blend: 'screen' },
      { input: scanlineSvg(w, h, i), blend: 'over' },
    ])
    .png()
    .toBuffer()
}

async function applyFilter(
  buf: Buffer,
  w: number,
  h: number,
  filter: FilterPreset,
  i: number,
): Promise<Buffer> {
  switch (filter) {
    case 'chromatic':
      return fChromatic(buf, w, h, i)
    case 'glitch_art':
      return fGlitchArt(buf, w, h, i)
    case 'static_noise':
      return fStaticNoise(buf, w, h, i)
    case 'signal_decay':
    default:
      return fSignalDecay(buf, w, h, i)
  }
}

/** Fetch + crop + glitch. Output WebP, or PNG (alpha) for circle crops. */
export async function renderCrop(
  sourceUrl: string,
  cfg: CropConfig,
): Promise<{ buffer: Buffer; contentType: string; ext: string; box: ProcessedAsset['box'] }> {
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`source fetch failed: ${res.status}`)
  const srcBuf = Buffer.from(await res.arrayBuffer())

  const meta = await sharp(srcBuf).metadata()
  const srcW = meta.width ?? 0
  const srcH = meta.height ?? 0
  if (!srcW || !srcH) throw new Error('could not read source dimensions')

  const box = computeBox(srcW, srcH, cfg)
  const i = clamp(cfg.glitchIntensity ?? 50, 0, 100) / 100

  // extract region, then cap longest edge to MAX_OUT
  let region = await sharp(srcBuf).extract(box).toBuffer()
  let w = box.width
  let h = box.height
  if (Math.max(w, h) > MAX_OUT) {
    const scale = MAX_OUT / Math.max(w, h)
    w = Math.round(w * scale)
    h = Math.round(h * scale)
    region = await sharp(region).resize(w, h).toBuffer()
  }

  const filtered = await applyFilter(region, w, h, cfg.filter ?? 'signal_decay', i)

  let buffer: Buffer
  let contentType: string
  let ext: string
  if (cfg.shape === 'circle') {
    buffer = await sharp(filtered)
      .composite([{ input: circleMaskSvg(w, h), blend: 'dest-in' }])
      .png()
      .toBuffer()
    contentType = 'image/png'
    ext = 'png'
  } else {
    buffer = await sharp(filtered).webp({ quality: Math.round(72 - 32 * i) }).toBuffer()
    contentType = 'image/webp'
    ext = 'webp'
  }

  return { buffer, contentType, ext, box }
}

/** Upload a processed buffer to the signal-assets bucket; returns path + public URL. */
export async function uploadProcessed(
  taskId: string,
  assetKey: string,
  buffer: Buffer,
  contentType: string,
  ext: string,
): Promise<{ path: string; url: string }> {
  const supabase = createAdminClient()
  const path = `signal/${taskId}/${assetKey}.${ext}`
  const { error } = await supabase.storage
    .from('signal-assets')
    .upload(path, buffer, { contentType, upsert: true })
  if (error) throw new Error(`upload failed: ${error.message}`)
  const { data } = supabase.storage.from('signal-assets').getPublicUrl(path)
  return { path, url: data.publicUrl }
}

/** Full image pipeline: source URL → cropped + glitched → uploaded. */
export async function processImageAsset(
  taskId: string,
  assetKey: string,
  sourceUrl: string,
  cfg: CropConfig,
): Promise<ProcessedAsset> {
  const { buffer, contentType, ext, box } = await renderCrop(sourceUrl, cfg)
  const { path, url } = await uploadProcessed(taskId, assetKey, buffer, contentType, ext)
  return { path, url, box }
}
