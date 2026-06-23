/**
 * Browser-side video processing via ffmpeg.wasm — the architect's browser crops +
 * glitches a Cosmo clip into an animated WebP (auto-loops as <img>), which a
 * server action then uploads. This sidesteps Vercel serverless having no ffmpeg
 * binary (Next.js #53791): ffmpeg.wasm is a WASM module, nothing to spawn.
 *
 * Single-threaded core → no COOP/COEP headers needed (just slower).
 */
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { CropConfig, FilterPreset } from './presets'

const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd'

let _ff: FFmpeg | null = null
let _loading: Promise<FFmpeg> | null = null

/** Load (once) and cache the ffmpeg.wasm instance. */
export async function getFFmpeg(): Promise<FFmpeg> {
  if (_ff) return _ff
  if (!_loading) {
    _loading = (async () => {
      const ff = new FFmpeg()
      await ff.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      _ff = ff
      return ff
    })()
  }
  return _loading
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function parseAspect(aspect?: string): number {
  if (!aspect) return 1
  const [w, h] = aspect.split(':').map(Number)
  return !w || !h ? 1 : w / h
}

// Mirrors the server filtergraph (src/lib/signal/av.ts videoGlitchChain).
function glitchChain(filter: FilterPreset, i: number): string {
  const noise = Math.round(8 + 30 * i)
  const sat = (1 + 0.3 * i).toFixed(2)
  const rh = Math.round(4 + 8 * i)
  switch (filter) {
    case 'chromatic':
      return `rgbashift=rh=-${rh}:bh=${rh},noise=alls=${Math.round(noise * 0.5)}:allf=t,eq=saturation=${sat}`
    case 'glitch_art':
      return `scale=iw/3:ih/3:flags=neighbor,scale=iw*3:ih*3:flags=neighbor,rgbashift=rh=-${rh * 2}:bh=${rh * 2},noise=alls=${noise}:allf=t`
    case 'static_noise':
      return `noise=alls=${Math.round(noise * 2)}:allf=t,eq=saturation=${(1 - 0.4 * i).toFixed(2)}`
    case 'signal_decay':
    default:
      return `scale=iw/3:ih/3:flags=neighbor,scale=iw*3:ih*3:flags=neighbor,noise=alls=${noise}:allf=t,eq=saturation=${sat}`
  }
}

export interface WasmClip {
  data: Uint8Array
  ext: string
  mime: string
}

/**
 * Crop + glitch a clip into an animated image. Tries animated WebP; falls back to
 * GIF if the core lacks the webp encoder. `srcUrl` should be same-origin (proxy)
 * to avoid CORS. Square/circle render square; rect honours aspect.
 */
export async function processForgeVideo(srcUrl: string, cfg: Partial<CropConfig>, durSec: number): Promise<WasmClip> {
  const ff = await getFFmpeg()
  const inName = 'in.mp4'
  await ff.writeFile(inName, await fetchFile(srcUrl))

  const ratio = clamp(cfg.areaRatio || 1 / 6, 0.02, 0.9).toFixed(4)
  const glitch = glitchChain(cfg.filter ?? 'signal_decay', clamp((cfg.glitchIntensity ?? 50) / 100, 0, 1))
  const dur = String(clamp(durSec ?? 4, 1, 15))

  let crop: string
  let scale: string
  if (cfg.shape === 'rect') {
    const ar = parseAspect(cfg.aspect)
    crop = `crop=w='min(iw,sqrt(iw*ih*${ratio}*${ar}))':h='min(ih,sqrt(iw*ih*${ratio}/${ar}))'`
    scale = 'scale=320:-2'
  } else {
    crop = `crop=w='min(min(iw,ih),sqrt(iw*ih*${ratio}))':h='min(min(iw,ih),sqrt(iw*ih*${ratio}))'`
    scale = 'scale=320:320' // square output → circle mask (320²) fits exactly
  }
  const baseVf = `${crop},${glitch},fps=12,${scale}`

  // Circle: overlay a 320² mask (dark corners, transparent centre) so the square
  // crop reads as a circle on the dark UI — same idea as the server pipeline.
  let hasMask = false
  if (cfg.shape === 'circle') {
    try {
      await ff.writeFile('mask.png', await cornerMaskPng(320))
      hasMask = true
    } catch { /* canvas unavailable → fall back to a plain square */ }
  }

  const encode = async (mask: boolean, ext: 'webp' | 'gif'): Promise<Uint8Array> => {
    const out = `out.${ext}`
    if (mask) {
      await ff.exec(['-y', '-t', dur, '-i', inName, '-i', 'mask.png', '-filter_complex', `[0:v]${baseVf}[v0];[v0][1:v]overlay=0:0[v]`, '-map', '[v]', '-loop', '0', '-an', out])
    } else {
      await ff.exec(['-y', '-t', dur, '-i', inName, '-vf', baseVf, '-loop', '0', '-an', out])
    }
    const data = (await ff.readFile(out)) as Uint8Array
    if (!data?.length) throw new Error(`empty ${ext}`)
    return data
  }

  // Try (mask) webp → (mask) gif → plain webp → plain gif, so a missing webp
  // encoder or a circle-overlay hiccup still yields an animated result.
  const attempts: Array<[boolean, 'webp' | 'gif']> = hasMask
    ? [[true, 'webp'], [true, 'gif'], [false, 'webp'], [false, 'gif']]
    : [[false, 'webp'], [false, 'gif']]
  for (const [mask, ext] of attempts) {
    try {
      const data = await encode(mask, ext)
      return { data, ext, mime: ext === 'webp' ? 'image/webp' : 'image/gif' }
    } catch { /* try next */ }
  }
  throw new Error('ffmpeg.wasm produced no output')
}

/** 320² PNG: dark (#070912) corners with a transparent centre circle, drawn in a
 *  browser canvas — overlaid so a square video crop reads as a circle. */
async function cornerMaskPng(size: number): Promise<Uint8Array> {
  if (typeof document === 'undefined') throw new Error('no canvas')
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.fillStyle = '#070912'
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  )
  return new Uint8Array(await blob.arrayBuffer())
}

/**
 * Extract a short mono audio clip from a video, in the browser. Tries mp3 → m4a →
 * wav (first encoder the wasm core supports wins). Returns null when the clip has
 * no audio track (every attempt fails on the strict audio-stream map), so callers
 * can skip it — mirrors the server's probeHasAudio behaviour without ffprobe.
 */
export async function processForgeAudio(srcUrl: string, durSec: number): Promise<WasmClip | null> {
  const ff = await getFFmpeg()
  const inName = 'in.mp4'
  await ff.writeFile(inName, await fetchFile(srcUrl))
  const dur = String(clamp(durSec ?? 4, 1, 15))

  const attempts: Array<{ out: string; ext: string; mime: string; codec: string[] }> = [
    { out: 'out.mp3', ext: 'mp3', mime: 'audio/mpeg', codec: ['-c:a', 'libmp3lame', '-b:a', '96k'] },
    { out: 'out.m4a', ext: 'm4a', mime: 'audio/mp4', codec: ['-c:a', 'aac', '-b:a', '96k'] },
    { out: 'out.wav', ext: 'wav', mime: 'audio/wav', codec: [] },
  ]
  for (const a of attempts) {
    try {
      // strict `-map 0:a:0` → a video with no audio errors out and we move on;
      // if even wav fails the clip genuinely has no audio track.
      await ff.exec(['-y', '-ss', '0', '-t', dur, '-i', inName, '-vn', '-map', '0:a:0', '-ac', '1', '-ar', '44100', ...a.codec, a.out])
      const data = (await ff.readFile(a.out)) as Uint8Array
      if (data?.length > 64) return { data, ext: a.ext, mime: a.mime }
    } catch { /* try next encoder, or (on the last) treat as no-audio */ }
  }
  return null // no audio track
}
