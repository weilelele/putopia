#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const UI_FILE = /^src\/.*\.(?:css|scss|sass|tsx|jsx)$/

const RULES = [
  {
    id: 'no-gradients',
    test: /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i,
    message: 'Use a flat canonical surface; gradients are prohibited.',
  },
  {
    id: 'no-glow-or-shadow',
    test: /(?:box|text)-shadow\s*:(?!\s*none\b)/i,
    message: 'Use spacing, borders, and flat surface contrast; shadows/glow are prohibited.',
  },
  {
    id: 'no-blur-or-glass',
    test: /(?:backdrop-filter\s*:|filter\s*:\s*[^;]*(?:blur|drop-shadow)\s*\()/i,
    message: 'Blur, glass, and drop-shadow effects are prohibited.',
  },
  {
    id: 'no-cyan',
    test: /\b(?:cyan|aqua)\b|#(?:00ffff|22d4e0)\b|rgba?\(\s*0\s*,\s*255\s*,\s*255\b/i,
    message: 'Cyan is not part of the current brand palette.',
  },
  {
    id: 'no-obsolete-palette',
    test: /#(?:050810|ff5a1f|0a0e27)\b/i,
    message: 'Use canonical design tokens instead of an obsolete palette value.',
  },
  {
    id: 'courier-prime-only',
    test: /(?:font-family|fontFamily)\s*[:=]\s*(?![^;\n]*(?:var\(--font-(?:mono|body|display)\)|inherit))/i,
    message: 'Use the canonical Courier Prime font token or inherit it.',
  },
]

function parseArgs(argv) {
  const baseIndex = argv.indexOf('--base')
  return { base: baseIndex >= 0 ? argv[baseIndex + 1] : null }
}

function readDiff(base) {
  const args = ['diff', '--unified=0', '--no-ext-diff']
  if (base) args.push(`${base}...HEAD`)
  else {
    try {
      const cached = execFileSync('git', ['diff', '--cached', '--quiet'], { stdio: 'ignore' })
      void cached
    } catch {
      args.push('--cached')
    }
  }
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
}

export function inspectAddedUiLines(diff) {
  const failures = []
  let file = null
  let newLine = 0

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      file = line.slice(6)
      continue
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(line)
    if (hunk) {
      newLine = Number(hunk[1])
      continue
    }
    if (!file || !UI_FILE.test(file) || line.startsWith('---')) continue
    if (line.startsWith('+')) {
      const source = line.slice(1)
      for (const rule of RULES) {
        // These legacy-named tokens are explicitly orange in the design spec.
        const checkedSource = rule.id === 'no-cyan'
          ? source.replace(/var\(--bd-cyan(?:-2)?\)/g, 'var(--orange-border)')
          : source
        if (rule.test.test(checkedSource)) {
          failures.push({ file, line: newLine, rule: rule.id, message: rule.message })
        }
      }
      newLine += 1
    } else if (!line.startsWith('-')) {
      newLine += 1
    }
  }

  return failures
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { base } = parseArgs(process.argv.slice(2))
  const failures = inspectAddedUiLines(readDiff(base))

  if (failures.length === 0) {
    console.log('Design guidance check passed.')
  } else {
    console.error('Design guidance check failed:\n')
    for (const failure of failures) {
      console.error(`${failure.file}:${failure.line} [${failure.rule}] ${failure.message}`)
    }
    process.exitCode = 1
  }
}
