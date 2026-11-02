import { describe, expect, it } from 'vitest'
import {
  PARALLAX_ARRAY_CYCLE_MS, PARALLAX_ARRAY_EXAMPLES, PARALLAX_ARRAY_UNITS, PARALLAX_ARRAY_VOTE_MARKS,
  parallaxArrayCaption, parallaxArrayDissolve, parallaxArrayFrame, parallaxArraySignal, parallaxArrayUnitSummary, parallaxArrayVotes,
} from './parallax-array'

const lengths = PARALLAX_ARRAY_EXAMPLES.map(example => example.text.length)

describe('Parallax Array units', () => {
  it('lists London online and the US Bay Area not yet online', () => {
    expect(PARALLAX_ARRAY_UNITS.map(unit => [unit.city, unit.online])).toEqual([['LONDON', true], ['US BAY AREA', false]])
    expect(parallaxArrayUnitSummary()).toBe('London is online. US Bay Area is not yet online.')
  })
})

describe('Parallax Array briefing scene', () => {
  it('types the observation, releases it, then runs three rounds with votes between them', () => {
    const stages: string[] = []
    for (let t = 0; t < PARALLAX_ARRAY_CYCLE_MS; t += 50) {
      const frame = parallaxArrayFrame(t, lengths)
      const label = frame.stage === 'round' || frame.stage === 'vote' ? `${frame.stage}${frame.round}` : frame.stage
      if (stages.at(-1) !== label) stages.push(label)
    }
    expect(stages).toEqual(['typing', 'release', 'round1', 'vote1', 'round2', 'vote2', 'round3', 'continue', 'fade'])
    expect(parallaxArrayFrame(2600, lengths).typed).toBeGreaterThan(0)
    expect(parallaxArrayFrame(5000, lengths).typed).toBe(lengths[0])
  })

  it('gathers more of the world each round but never a clean picture', () => {
    let previous = 0
    for (let t = 0; t < 22_800; t += 50) {
      const signal = parallaxArraySignal(parallaxArrayFrame(t, lengths))
      expect(signal.reveal).toBeGreaterThanOrEqual(previous - 1e-9)
      expect(signal.noise).toBeGreaterThan(.2)
      expect(signal.grain).toBeLessThanOrEqual(26)
      previous = signal.reveal
    }
    expect(parallaxArraySignal(parallaxArrayFrame(PARALLAX_ARRAY_CYCLE_MS - 1, lengths)).reveal).toBeLessThan(.05)
  })

  it('captions each moment and rotates examples', () => {
    expect(parallaxArrayCaption(parallaxArrayFrame(5000, lengths), 'LONDON')).toBe('SENT TO LONDON')
    expect(parallaxArrayCaption(parallaxArrayFrame(12_000, lengths), 'LONDON')).toBe('ROUND II · RECEIVING')
    expect(parallaxArrayCaption(parallaxArrayFrame(10_000, lengths), 'LONDON')).toBe('ROUND I · VOYAGERS VOTE')
    expect(PARALLAX_ARRAY_EXAMPLES.map((_, i) => parallaxArrayFrame(i * PARALLAX_ARRAY_CYCLE_MS + 100, lengths).example)).toEqual([0, 1])
  })

  it('lights vote marks one by one between rounds and keeps them until the example fades', () => {
    let previous = 0
    for (let t = 0; t < 22_800; t += 50) {
      const votes = parallaxArrayVotes(parallaxArrayFrame(t, lengths))
      expect(votes).toBeGreaterThanOrEqual(previous)
      expect(votes).toBeLessThanOrEqual(PARALLAX_ARRAY_VOTE_MARKS)
      previous = votes
    }
    expect(parallaxArrayVotes(parallaxArrayFrame(8000, lengths))).toBe(0)
    expect(parallaxArrayVotes(parallaxArrayFrame(20_000, lengths))).toBe(23)
    expect(parallaxArrayVotes(parallaxArrayFrame(PARALLAX_ARRAY_CYCLE_MS - 1, lengths))).toBeLessThan(1)
  })

  it('dissolves the observation from left to right', () => {
    expect([0, 50, 99].map(i => parallaxArrayDissolve(i, 100, .2))).toEqual(['static', 'kept', 'kept'])
    expect([0, 50, 99].map(i => parallaxArrayDissolve(i, 100, .5))).toEqual(['gone', 'static', 'kept'])
    expect([0, 50, 99].map(i => parallaxArrayDissolve(i, 100, 1))).toEqual(['gone', 'gone', 'gone'])
  })
})
