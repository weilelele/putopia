import { audioClarity, worldDefinitions, type DeviceState, type LinkValues, type MissionState } from './index'
export type MissionAction = { type: 'preview-rule'; worldId: string; ruleId: number } | { type: 'select-world'; worldId: string } | { type: 'select-device'; deviceId: string } | { type: 'send-energy'; worldId: string; bandId: string; text?: string; deviceId?: string; sample?: number } | { type: 'add-note'; worldId: string; reportId: string; note: string; deviceId?: string } | { type: 'reset' } | { type: 'advance-time'; seconds: number } | { type: 'set-sample'; sample: number | null } | { type: 'load-scenario'; scenario: 'fresh' | 'audio' | 'catch-up' | 'overload' } | { type: 'add-device' }
export function createDevice(id: string, now: number, state?: MissionState): DeviceState { return { id, name: id, userName: id === 'Unit-01' ? 'Ada' : id === 'Unit-02' ? 'Lin' : 'New voyager', energy: 10, recoveredAt: now, worlds: Object.fromEntries(worldDefinitions.map(d => [d.id, { uplink: Math.min(d.initial.uplink, state?.worlds[d.id].uplink ?? d.initial.uplink), downlink: Math.min(d.initial.downlink, state?.worlds[d.id].downlink ?? d.initial.downlink) }])) } }
export function createInitialState(now = 0): MissionState { return { revision: 0, activeWorldId: worldDefinitions[0].id, activeDeviceId: 'Unit-01', now, wallUpdatedAt: now, probabilitySample: null, feedback: 'Select a Band, then hold for three seconds.', devices: { 'Unit-01': createDevice('Unit-01', now), 'Unit-02': createDevice('Unit-02', now) }, worlds: Object.fromEntries(worldDefinitions.map(d => [d.id, { ...d.initial, id: d.id, currentEventId: d.initialEvent, currentEventTitle: d.events[d.initialEvent], enabledEventIds: [d.initialEvent], reports: [], consumedRuleIds: [], transmissions: [] }])) } }
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n * 100) / 100))
export function reduceMission(previous: MissionState, action: MissionAction, wallTime: number): MissionState {
  let s: MissionState = structuredClone(previous)
  if (action.type === 'reset') s = createInitialState(wallTime)
  s.now += Math.max(0, wallTime - (s.wallUpdatedAt ?? wallTime))
  s.wallUpdatedAt = wallTime
  if (action.type === 'advance-time') s.now += Math.max(0, action.seconds) * 1000
  for (const device of Object.values(s.devices)) { const points = Math.floor((s.now - device.recoveredAt) / 60000); if (points > 0) { device.energy = Math.min(10, device.energy + points); device.recoveredAt += points * 60000 } }
  if (action.type === 'select-world' && s.worlds[action.worldId]) s.activeWorldId = action.worldId
  if (action.type === 'select-device' && s.devices[action.deviceId]) s.activeDeviceId = action.deviceId
  if (action.type === 'set-sample') s.probabilitySample = action.sample === null ? null : clamp(action.sample, 1)
  if (action.type === 'add-device') { const id = `Unit-${String(Object.keys(s.devices).length + 1).padStart(2, '0')}`; s.devices[id] = createDevice(id, s.now, s); s.activeDeviceId = id }
  if (action.type === 'load-scenario') {
    const revision = s.revision
    s = createInitialState(s.now); s.wallUpdatedAt = wallTime; s.revision = revision
    const w = s.worlds[s.activeWorldId]
    if (action.scenario !== 'fresh') { w.uplink = 12; w.downlink = 12; s.devices['Unit-01'].worlds[w.id] = { uplink: 10, downlink: 12 } }
    if (action.scenario === 'audio') { w.currentEventId = 'noticed'; w.currentEventTitle = 'A pause toward the observation position'; w.enabledEventIds = ['noticed']; w.consumedRuleIds = [40] }
    if (action.scenario === 'catch-up') s.devices['Unit-01'].worlds[w.id] = { uplink: 4, downlink: 12 }
    if (action.scenario === 'overload') { s.devices['Unit-01'].worlds[w.id] = { uplink: 12, downlink: 12 }; s.devices['Unit-02'].worlds[w.id] = { uplink: 12, downlink: 12 }; w.transmissions = [1, 2, 3].map(n => ({ deviceId: 'Unit-02', at: s.now - n * 5000 })) }
    s.feedback = `TEST fixture loaded: ${action.scenario}. No historical reports were fabricated.`
  }
  if (action.type === 'preview-rule') {
    const definition = worldDefinitions.find(d => d.id === action.worldId)
    const rule = definition?.rules.find(r => r.id === action.ruleId)
    if (!definition || !rule) return previous
    const w = s.worlds[definition.id]
    const start = rule.id === 40 ? 6 : 12
    s.activeWorldId = definition.id
    Object.assign(w, { uplink: start, downlink: start, currentEventId: rule.eventIds?.[0] ?? 'reading', enabledEventIds: [rule.eventIds?.[0] ?? 'reading'], reports: [], consumedRuleIds: rule.id >= 100 ? [10, 20, 30, 40] : [], transmissions: [] })
    w.currentEventTitle = definition.events[w.currentEventId]
    for (const device of Object.values(s.devices)) device.worlds[w.id] = { uplink: start, downlink: start }
    s.devices[s.activeDeviceId].energy = 10
    const density = rule.minCollective ? rule.minCollective - 1 : rule.minLocal ? rule.minLocal - 1 : 0
    w.transmissions = Array.from({ length: density }, (_, n) => ({ deviceId: rule.minLocal ? s.activeDeviceId : Object.keys(s.devices).find(id => id !== s.activeDeviceId) ?? s.activeDeviceId, at: s.now - (n + 1) * 5000 }))
    s.probabilitySample = 0
    const result = reduceMission(s, { type: 'send-energy', worldId: w.id, bandId: 'b1', text: rule.keyword, sample: 0 }, wallTime)
    result.feedback = `TEST PREVIEW — prepared prerequisites and executed rule ${rule.id}. Current world's previous test history was replaced. ${result.feedback}`
    result.revision = previous.revision + 1
    return result
  }
  if (action.type === 'add-note') { const report = s.worlds[action.worldId]?.reports.find(r => r.id === action.reportId); if (report?.deviceId === (action.deviceId ?? s.activeDeviceId)) report.note = action.note.slice(0, 2000) }
  if (action.type === 'send-energy') {
    const d = worldDefinitions.find(d => d.id === action.worldId)
    const w = s.worlds[action.worldId]; const device = s.devices[action.deviceId ?? s.activeDeviceId]
    const band = d?.bands.find(b => b.id === action.bandId)
    if (!d || !w || !device || !band || band.remarks || device.worlds[w.id].downlink < band.unlockDownlink || device.energy < 1) { s.feedback = 'Transmission unavailable: select an accessible observation Band and check energy.' }
    else {
      const before = { ...device.worlds[w.id] }; const collectiveBefore: LinkValues = { uplink: w.uplink, downlink: w.downlink }; const eventId = w.currentEventId
      device.energy--; device.recoveredAt = s.now
      w.transmissions = w.transmissions.filter(t => t.at > s.now - 60000); w.transmissions.push({ deviceId: device.id, at: s.now })
      const local = w.transmissions.filter(t => t.deviceId === device.id).length, total = w.transmissions.length
      const clarity = audioClarity(d, before.uplink), sample = s.probabilitySample ?? action.sample ?? 0.5
      const rule = [...d.rules].sort((a, b) => a.id - b.id).find(r => !(r.oneShot && w.consumedRuleIds.includes(r.id)) && (!r.bandIds || r.bandIds.includes(band.id)) && (!r.eventIds || r.eventIds.includes(eventId)) && (r.minUplink === undefined || before.uplink >= r.minUplink) && (r.minLocal === undefined || local >= r.minLocal) && (r.minCollective === undefined || total >= r.minCollective) && (r.maxCollective === undefined || total <= r.maxCollective) && (!r.keyword || (clarity > 0 && (action.text ?? '').toLowerCase().includes(r.keyword) && sample < clarity / 100)))
      if (rule) {
        for (const axis of ['uplink', 'downlink'] as const) { if (rule.oneShot || collectiveBefore[axis] - before[axis] <= 1) w[axis] = clamp(w[axis] + rule.collective[axis], d.limit[axis]); device.worlds[w.id][axis] = clamp(before[axis] + rule.personal[axis], w[axis]); for (const unit of Object.values(s.devices)) unit.worlds[w.id][axis] = Math.min(unit.worlds[w.id][axis], w[axis]) }
        if (rule.oneShot) w.consumedRuleIds.push(rule.id)
        w.enabledEventIds = [...new Set([...w.enabledEventIds.filter(id => !rule.removeEvents?.includes(id)), ...(rule.addEvents ?? [])])]
        if (rule.nextEvent) { w.currentEventId = rule.nextEvent; w.currentEventTitle = d.events[rule.nextEvent] }
        if (w.reports.filter(r => r.ruleId === rule.id).length < rule.reportLimit) w.reports.unshift({ id: `${w.id}-${rule.id}-${s.revision + 1}`, worldId: w.id, ruleId: rule.id, deviceId: device.id, userName: device.userName, title: rule.title, body: `${rule.body} Event state shown with a generated fixed-camera still; no animation.`, createdAt: new Date(s.now).toISOString(), note: '', bandId: band.id, before, after: { ...device.worlds[w.id] }, collectiveBefore, collectiveAfter: { uplink: w.uplink, downlink: w.downlink }, eventId })
      }
      s.lastTransmission = { id: `${s.revision + 1}`, worldId: w.id, deviceId: device.id, before, after: { ...device.worlds[w.id] }, audioClarity: clarity, sample, ruleId: rule?.id }
      s.feedback = `Energy sent. ${rule ? `Rule ${rule.id}: ${rule.title}.` : 'No rule matched.'} Density: Unit ${local}, collective ${total}/minute. Audio ${clarity}%; sample ${sample.toFixed(2)}. Actual values settled.`
    }
  }
  s.revision = previous.revision + 1
  return s
}
