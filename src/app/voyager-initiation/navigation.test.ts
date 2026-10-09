import { describe, expect, it } from 'vitest'
import { consoleDevicePath, deviceSourcePath, initiationLoginPath, initiationReturnPath } from './navigation'

describe('Initiation Device return intent', () => {
  it('preserves only public Device browsing destinations', () => {
    expect(deviceSourcePath('/devices/batches/kyoto-one')).toBe('/devices/batches/kyoto-one')
    expect(deviceSourcePath('/devices/')).toBe('/devices')
    for (const source of ['https://other.test/devices', '//other.test/devices', '/devices/claim', '/devices/my-consoles', '/devices/batches/../claim', '/devices/batches/kyoto-one?claim=true', '/profile']) {
      expect(deviceSourcePath(source)).toBeNull()
    }
  })
  it('returns to the source Device batch even when claim is already allocated', () => {
    expect(consoleDevicePath('/devices/batches/kyoto-one', '/devices/my-consoles')).toBe('/devices/batches/kyoto-one')
    expect(consoleDevicePath(null, '/devices/claim')).toBe('/devices')
    expect(consoleDevicePath(null, '/devices/batches/kyoto-one')).toBe('/devices/batches/kyoto-one')
  })
  it('carries the same intent through the login redirect', () => {
    const source = '/devices/batches/kyoto-one'
    const login = new URL(initiationLoginPath(source), 'https://example.test')
    expect(login.searchParams.get('redirect')).toBe(initiationReturnPath(source))
    expect(new URL(login.searchParams.get('redirect')!, login.origin).searchParams.get('from')).toBe(source)
  })
})
