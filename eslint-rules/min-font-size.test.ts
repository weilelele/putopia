import { describe, it, expect } from 'vitest'
import { toPx, FLOOR_PX } from './min-font-size.mjs'

// Mimic the ESLint Literal nodes the rule inspects.
const num = (value: number) => ({ type: 'Literal', value })
const str = (value: string) => ({ type: 'Literal', value })

describe('min-font-size: toPx', () => {
  it('reads bare numbers as px', () => {
    expect(toPx(num(11))).toBe(11)
    expect(toPx(num(12))).toBe(12)
  })

  it('parses px strings', () => {
    expect(toPx(str('10px'))).toBe(10)
    expect(toPx(str('12px'))).toBe(12)
  })

  it('converts rem to px at 16px/rem', () => {
    expect(toPx(str('0.75rem'))).toBe(12) // the floor token
    expect(toPx(str('0.6rem'))).toBeCloseTo(9.6)
    expect(toPx(str('0.7rem'))).toBeCloseTo(11.2)
  })

  it('ignores non-analysable values', () => {
    expect(toPx(str('var(--fs-caption)'))).toBeNull()
    expect(toPx(str('clamp(2rem, 8vw, 4.5rem)'))).toBeNull()
    expect(toPx(str('1em'))).toBeNull()
    expect(toPx(str('80%'))).toBeNull()
    expect(toPx({ type: 'Identifier', name: 'size' })).toBeNull()
  })
})

describe('min-font-size: floor', () => {
  it('separates allowed from sub-floor sizes', () => {
    const px = (n: { type: string; value: unknown }) => toPx(n)
    expect(px(num(12))! < FLOOR_PX).toBe(false) // 12px is allowed
    expect(px(num(11))! < FLOOR_PX).toBe(true)
    expect(px(str('0.75rem'))! < FLOOR_PX).toBe(false)
    expect(px(str('0.55rem'))! < FLOOR_PX).toBe(true)
  })
})
