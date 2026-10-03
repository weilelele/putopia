#!/usr/bin/env node
// Captures App Store screenshots straight from the portrait web app.
//
//   npm run appstore:screenshots                       # production, all sizes
//   npm run appstore:screenshots -- --base http://localhost:3000
//   npm run appstore:screenshots -- --only console,intel --size 6.9
//
// Only the public primary routes are used (see src/lib/access-policy.ts), so no
// login or secrets are needed. Needs Chrome: set CHROME_PATH, or let it find the
// Playwright / Google Chrome install on this machine.
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// Output pixels = viewport (CSS px) × scale. Apple accepts 6.9" for all iPhones.
const SIZES = {
  '6.9': { width: 440, height: 956, scale: 3 }, // 1320 × 2868 (iPhone 17 Pro Max)
  '6.5': { width: 428, height: 926, scale: 3 }, // 1284 × 2778 (iPhone 14 Plus)
}

// Order = App Store gallery order. `scrollTo` (text) scrolls that heading to the top.
const SCREENS = [
  { id: '01-console', path: '/console' },
  { id: '02-intel', path: '/intel' },
  { id: '03-devices', path: '/devices' },
  { id: '04-worlds-live', path: '/worlds/live' },
  { id: '05-voyagers', path: '/voyagers' },
  { id: '06-updates', path: '/console', scrollTo: 'Updates' },
]

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const base = arg('base', 'https://www.multiverseco.org').replace(/\/$/, '')
const out = arg('out', 'docs/appstore/screenshots')
const only = arg('only', '')?.split(',').filter(Boolean)
const sizes = arg('size', '') ? [arg('size')] : Object.keys(SIZES)

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const cache = join(homedir(), 'Library/Caches/ms-playwright')
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
      const p = join(cache, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
      if (existsSync(p)) return p
    }
  }
  const system = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  if (existsSync(system)) return system
  throw new Error('Chrome not found — set CHROME_PATH')
}

const browser = await chromium.launch({ executablePath: findChrome() })
try {
  for (const key of sizes) {
    const { width, height, scale } = SIZES[key]
    const dir = join(out, key)
    mkdirSync(dir, { recursive: true })
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: scale,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'dark',
    })
    const page = await ctx.newPage()
    for (const s of SCREENS.filter((s) => !only?.length || only.some((o) => s.id.includes(o)))) {
      await page.goto(`${base}${s.path}?source=ios_app`, { waitUntil: 'networkidle', timeout: 60_000 })
      await page.evaluate(() => document.fonts.ready)
      // Give above-the-fold images a bounded window to finish (lazy ones may never load).
      await page.evaluate(() => Promise.race([
        Promise.all([...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight)
          .map((i) => i.decode().catch(() => {}))),
        new Promise((r) => setTimeout(r, 8000)),
      ]))
      if (s.scrollTo) {
        await page.getByText(s.scrollTo, { exact: true }).first().evaluate((el) => {
          el.scrollIntoView({ block: 'start' })
          window.scrollBy(0, -24)
        })
      }
      await page.waitForTimeout(1500) // let entrance animations settle
      const file = join(dir, `${s.id}.png`)
      await page.screenshot({ path: file })
      console.log(`${key}"  ${width * scale}×${height * scale}  ${file}`)
    }
    await ctx.close()
  }
} finally {
  await browser.close()
}
