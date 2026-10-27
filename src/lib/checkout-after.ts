import 'server-only'
import { after } from 'next/server'

/** Keep optional delivery work alive after the response, without delaying checkout or exposing its errors. */
export function afterCheckout(task: () => Promise<unknown>, failureMessage: string) {
  after(async () => {
    try { await task() }
    catch { console.warn(failureMessage) }
  })
}
