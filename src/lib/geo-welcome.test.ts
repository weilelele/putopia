import { describe, expect, it } from 'vitest'
import { welcomeFactLine } from './geo-welcome'

describe('welcome fact line', () => {
  it('reuses the approved share sentence', () => {
    expect(welcomeFactLine()).toBe('Multiverse Collective is a hardware-based sci-fi game: claim the Multiverse Console, decode signals, explore parallel worlds and try to change their course.')
  })

  it('falls back to the full share text when the sentence is missing', () => {
    expect(welcomeFactLine('Something else.')).toBe('Something else.')
  })
})
