import { describe, expect, it } from 'vitest'
import { audioClarity, bandClarity, worldDefinitions } from './index'
import { createDevice, createInitialState, reduceMission, type MissionAction } from './engine'
const step = (s: ReturnType<typeof createInitialState>, a: MissionAction) => reduceMission(s, a, 0)
const send: MissionAction = { type: 'send-energy', worldId: 'shepherdess', bandId: 'b1', sample: 0 }
const fixture = (scenario: 'fresh' | 'audio' | 'catch-up' | 'overload') => step(createInitialState(), { type: 'load-scenario', scenario })
describe('mission unique-rule engine', () => {
  it('executes only smallest matching rule; fixed effects do not stack with a one-shot', () => {
    const s = step(fixture('overload'), send), w = s.worlds.shepherdess
    expect(s.lastTransmission?.ruleId).toBe(10)
    expect(w.uplink).toBe(9); expect(w.downlink).toBe(7)
    expect(w.reports.map(r => r.ruleId)).toEqual([10]); expect(w.currentEventId).toBe('retreat')
  })
  it('consumes a one-shot once, while repeatable effects produce only one report', () => {
    let s = step(fixture('overload'), send)
    s = step(s, send)
    expect(s.lastTransmission?.ruleId).toBe(100)
    const after = s.worlds.shepherdess.downlink
    s = step(s, send)
    expect(s.worlds.shepherdess.downlink).toBeLessThan(after)
    expect(s.worlds.shepherdess.consumedRuleIds).toEqual([10])
    expect(s.worlds.shepherdess.reports.filter(r => r.ruleId === 100)).toHaveLength(1)
  })
  it('checks uplink and downlink catch-up separately using pre-send values', () => {
    const s = step(fixture('catch-up'), send)
    expect(s.worlds.shepherdess.uplink).toBe(12)
    expect(s.worlds.shepherdess.downlink).toBe(13)
    expect(s.devices['Unit-01'].worlds.shepherdess).toEqual({ uplink: 5, downlink: 13 })
  })
  it('initializes newcomers from configured initial values, capped by collective', () => {
    let s = fixture('audio')
    expect(createDevice('new', 0, s).worlds.shepherdess).toEqual({ uplink: 4, downlink: 4 })
    s.worlds.shepherdess.downlink = 2
    s = step(s, { type: 'add-device' })
    expect(s.devices[s.activeDeviceId].worlds.shepherdess).toEqual({ uplink: 4, downlink: 2 })
  })
  it('clips every personal value on collective loss and does not return losses after recovery', () => {
    let s = step(fixture('overload'), send)
    expect(s.devices['Unit-02'].worlds.shepherdess).toEqual({ uplink: 9, downlink: 7 })
    s = step(s, { type: 'advance-time', seconds: 61 })
    s = step(s, send)
    expect(s.worlds.shepherdess.downlink).toBe(8)
    expect(s.devices['Unit-02'].worlds.shepherdess.downlink).toBe(7)
  })
  it('relocks Bands based on actual values and blocks locked/Remarks transmissions', () => {
    let s = step(fixture('overload'), send)
    const b2 = worldDefinitions[0].bands[1]
    expect(bandClarity(b2, s.devices['Unit-01'].worlds.shepherdess.downlink)).toBe(0)
    const energy = s.devices['Unit-01'].energy
    s = step(s, { ...send, type: 'send-energy', bandId: 'b2' })
    s = step(s, { ...send, type: 'send-energy', bandId: 'remarks' })
    expect(s.devices['Unit-01'].energy).toBe(energy)
    expect(s.worlds.shepherdess.transmissions).toHaveLength(4)
  })
  it('uses a single audio probability sample; failure falls back and does not consume the content rule', () => {
    let s = step(fixture('audio'), { ...send, type: 'send-energy', text: 'book', sample: 0.99 })
    expect(s.lastTransmission?.ruleId).toBe(110)
    expect(s.worlds.shepherdess.consumedRuleIds).not.toContain(30)
    s = step(s, { type: 'advance-time', seconds: 61 })
    s = step(s, { ...send, type: 'send-energy', text: 'book', sample: 0 })
    expect(s.lastTransmission?.ruleId).toBe(30)
    expect(s.worlds.shepherdess.currentEventId).toBe('book')
  })
  it('requires a strictly lower sample than clarity and rejects text before audio unlock', () => {
    const s = step(fixture('audio'), { ...send, type: 'send-energy', text: 'book', sample: 0.4 })
    expect(s.lastTransmission?.ruleId).toBe(110)
    const fresh = fixture('fresh'); fresh.worlds.shepherdess.currentEventId = 'noticed'
    expect(step(fresh, { ...send, type: 'send-energy', text: 'book', sample: 0 }).lastTransmission?.ruleId).toBe(110)
  })
  it('keeps transient peaks out of the model and all access predicates', () => {
    const s = createInitialState(); s.devices['Unit-01'].worlds.shepherdess.downlink = 6; s.worlds.shepherdess.downlink = 6
    const after = step(s, send)
    expect(after.devices['Unit-01'].worlds.shepherdess.downlink).toBe(7)
    expect(bandClarity(worldDefinitions[0].bands[1], 7)).toBe(0)
    expect(JSON.stringify(after)).not.toContain('peak')
  })
  it('bounds energy, counts the current send and excludes the 60s boundary', () => {
    let s = fixture('fresh'); s.worlds.shepherdess.transmissions = [{ deviceId: 'Unit-02', at: -60000 }]
    s = step(s, send)
    expect(s.worlds.shepherdess.transmissions).toHaveLength(1)
    expect(s.devices['Unit-01'].energy).toBe(9)
    s = step(s, { type: 'advance-time', seconds: 600 })
    expect(s.devices['Unit-01'].energy).toBe(10)
  })
  it('allows only the report owner to annotate and never changes report facts', () => {
    let s = step(fixture('fresh'), send); const report = s.worlds.shepherdess.reports[0]
    s = step(s, { type: 'add-note', worldId: 'shepherdess', reportId: report.id, note: 'Mine', deviceId: 'Unit-01' })
    s = step(s, { type: 'add-note', worldId: 'shepherdess', reportId: report.id, note: 'Other', deviceId: 'Unit-02' })
    expect(s.worlds.shepherdess.reports[0].note).toBe('Mine')
    expect(s.worlds.shepherdess.reports[0].body).toBe(report.body)
  })
  it('distinguishes local repetition from shared density', () => {
    let s = step(fixture('fresh'), send)
    s = step(s, send)
    expect(s.lastTransmission?.ruleId).toBe(105)
    const other = step(step(fixture('fresh'), send), { ...send, type: 'send-energy', deviceId: 'Unit-02' })
    expect(other.lastTransmission?.ruleId).toBe(110)
  })
  it('serial settlement preserves two concurrent-intent sends and a single first report', () => {
    const first = step(fixture('fresh'), send)
    const second = step(first, { ...send, type: 'send-energy', deviceId: 'Unit-02' })
    expect(second.revision).toBe(first.revision + 1)
    expect(second.devices['Unit-01'].energy).toBe(9)
    expect(second.devices['Unit-02'].energy).toBe(9)
    expect(second.worlds.shepherdess.transmissions).toHaveLength(2)
    expect(second.worlds.shepherdess.reports.filter(r => r.ruleId === 110)).toHaveLength(1)
  })
  it('supports a full playable quiet ending after spaced progress and overload', () => {
    let s = fixture('fresh')
    for (let i = 0; i < 10; i++) { s = step(s, send); s = step(s, { type: 'advance-time', seconds: 61 }) }
    expect(audioClarity(worldDefinitions[0], s.devices['Unit-01'].worlds.shepherdess.uplink)).toBeGreaterThan(0)
    s = step(s, { ...send, type: 'send-energy', text: 'book', sample: 0 })
    expect(s.worlds.shepherdess.currentEventId).toBe('book')
    for (let i = 0; i < 3; i++) s = step(s, send)
    expect(s.worlds.shepherdess.currentEventId).toBe('retreat')
    s = step(s, { type: 'advance-time', seconds: 61 })
    // Restore audio via actual spaced energy if overload reduced it below threshold.
    while (s.devices['Unit-01'].worlds.shepherdess.uplink < 10) { s = step(s, send); s = step(s, { type: 'advance-time', seconds: 61 }) }
    s = step(s, { ...send, type: 'send-energy', text: 'give you space', sample: 0 })
    expect(s.worlds.shepherdess.currentEventId).toBe('quiet')
  })
})

// Preview buttons must exercise the normal rule resolver, including priority.
describe('rule preview fixtures', () => {
  for (const worldId of ['shepherdess', 'robot-library']) {
    for (const ruleId of [10, 20, 30, 40, 100, 105, 110]) {
      it(`previews ${worldId} rule ${ruleId} through normal settlement`, () => {
        const state = reduceMission(createInitialState(100000), { type: 'preview-rule', worldId, ruleId }, 100000)
        expect(state.lastTransmission?.ruleId).toBe(ruleId)
        expect(state.worlds[worldId].reports).toHaveLength(1)
        expect(state.worlds[worldId].reports[0].ruleId).toBe(ruleId)
        expect(state.devices[state.activeDeviceId].energy).toBe(9)
        expect(state.feedback).toContain('TEST PREVIEW')
      })
    }
  }
})
