import { describe, expect, it } from 'vitest'
import { canReportFromConsoles, resolveDeviceStatus } from './device-reporter'

const record = (status: string) => ({ order: { status } }) as Parameters<typeof canReportFromConsoles>[0][number]

describe('canReportFromConsoles', () => {
  it('requires a delivered device', () => {
    expect(canReportFromConsoles([])).toBe(false)
    expect(canReportFromConsoles([record('paid'), record('shipped')])).toBe(false)
    expect(canReportFromConsoles([record('shipped'), record('delivered')])).toBe(true)
  })
})

describe('resolveDeviceStatus', () => {
  it('is true from a delivered device or a back-office grant, and names the source', () => {
    expect(resolveDeviceStatus({ granted: false, consoles: [] })).toEqual({ has: false, source: null })
    expect(resolveDeviceStatus({ granted: false, consoles: [record('delivered')] })).toEqual({ has: true, source: 'purchase' })
    expect(resolveDeviceStatus({ granted: true, consoles: [record('paid')] })).toEqual({ has: true, source: 'granted' })
    expect(resolveDeviceStatus({ granted: true, consoles: [record('delivered')] })).toEqual({ has: true, source: 'purchase' })
  })
})
