import { describe, expect, it } from 'vitest'
import { inspectAddedUiLines } from '../scripts/check-design-diff.mjs'

function cssDiff(source: string) {
  return `+++ b/src/app/example.css\n@@ -0,0 +1 @@\n+${source}\n`
}

describe('design guidance checks', () => {
  it('allows explicit shadow removal regardless of whitespace', () => {
    for (const value of ['none', ' none', '   none']) {
      expect(inspectAddedUiLines(cssDiff(`box-shadow:${value};`))).toEqual([])
    }
    expect(inspectAddedUiLines(cssDiff('box-shadow: inset 2px 0 0 orange;')))
      .toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'no-glow-or-shadow' })]))
  })

  it('allows the documented orange border aliases but still rejects cyan', () => {
    expect(inspectAddedUiLines(cssDiff('border-color: var(--bd-cyan);'))).toEqual([])
    expect(inspectAddedUiLines(cssDiff('border-color: var(--bd-cyan-2);'))).toEqual([])
    for (const source of ['color: cyan;', 'color: #00ffff;', 'color: var(--cyan);']) {
      expect(inspectAddedUiLines(cssDiff(source)))
        .toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'no-cyan' })]))
    }
  })

  it('continues rejecting gradients and blur in newly added UI lines', () => {
    expect(inspectAddedUiLines(cssDiff('background: linear-gradient(red, blue);')))
      .toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'no-gradients' })]))
    expect(inspectAddedUiLines(cssDiff('filter: blur(4px);')))
      .toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'no-blur-or-glass' })]))
  })
})
