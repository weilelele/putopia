import { afterEach, describe, expect, it, vi } from 'vitest'
import { captureFirstTouch, getFirstTouch } from './utm'

const STORAGE_KEY = 'putopia_first_touch_utm'

function installBrowser(search: string, stored?: Record<string, unknown>) {
  const values = new Map<string, string>()
  if (stored) values.set(STORAGE_KEY, JSON.stringify(stored))

  vi.stubGlobal('window', { location: { search } })
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('first-touch attribution', () => {
  it('captures Reddit click ID from the landing URL', () => {
    installBrowser('?utm_source=reddit&rdt_cid=3184742045291813272')

    captureFirstTouch()

    expect(getFirstTouch()).toMatchObject({
      utm_source: 'reddit',
      rdt_cid: '3184742045291813272',
    })
  })

  it('keeps first-touch UTM fields but refreshes a later Reddit click ID', () => {
    installBrowser('?utm_source=reddit&rdt_cid=new-click', {
      utm_source: 'instagram',
      utm_campaign: 'first-campaign',
      rdt_cid: 'old-click',
    })

    captureFirstTouch()

    expect(getFirstTouch()).toMatchObject({
      utm_source: 'instagram',
      utm_campaign: 'first-campaign',
      rdt_cid: 'new-click',
    })
  })

  it('upgrades legacy stored attribution that has no Reddit field', () => {
    installBrowser('', { utm_source: 'meta', fbclid: 'fb-click' })

    expect(getFirstTouch()).toEqual({
      utm_source: 'meta',
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      fbclid: 'fb-click',
      rdt_cid: null,
    })
  })
})
