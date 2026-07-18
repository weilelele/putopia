import { describe, it, expect } from 'vitest'
import {
  isCapacitorAccess,
  isStandaloneNavAccess,
  isDisplayModeQuery,
} from './no-raw-platform-check.mjs'

describe('no-raw-platform-check: isCapacitorAccess', () => {
  it('flags any Capacitor property access (covers casts)', () => {
    expect(isCapacitorAccess('Capacitor')).toBe(true)
  })
  it('ignores unrelated properties', () => {
    expect(isCapacitorAccess('Plugins')).toBe(false)
    expect(isCapacitorAccess('location')).toBe(false)
    expect(isCapacitorAccess(null)).toBe(false)
  })
})

describe('no-raw-platform-check: isStandaloneNavAccess', () => {
  it('flags navigator.standalone', () => {
    expect(isStandaloneNavAccess('navigator', 'standalone')).toBe(true)
  })
  it('ignores standalone on other objects and other navigator props', () => {
    expect(isStandaloneNavAccess('row', 'standalone')).toBe(false)
    expect(isStandaloneNavAccess('navigator', 'userAgent')).toBe(false)
  })
})

describe('no-raw-platform-check: isDisplayModeQuery', () => {
  it('flags display-mode media queries', () => {
    expect(isDisplayModeQuery('(display-mode: standalone)')).toBe(true)
    expect(isDisplayModeQuery('(display-mode:fullscreen)')).toBe(true)
  })
  it('ignores other media queries and non-strings', () => {
    expect(isDisplayModeQuery('(min-width: 768px)')).toBe(false)
    expect(isDisplayModeQuery('(prefers-color-scheme: dark)')).toBe(false)
    expect(isDisplayModeQuery(42)).toBe(false)
    expect(isDisplayModeQuery(null)).toBe(false)
  })
})
