export type DeviceCheckoutResult = {
  url?: string
  error?: string
  reused?: boolean
}

/** Parse API errors without exposing an HTML proxy/error page to the user. */
export async function readDeviceCheckoutResult(response: Response): Promise<DeviceCheckoutResult> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Checkout service returned an unexpected response (HTTP ${response.status}). Please try again later.`,
    )
  }

  try {
    return (await response.json()) as DeviceCheckoutResult
  } catch {
    throw new Error(
      `Checkout service returned an unreadable response (HTTP ${response.status}). Please try again later.`,
    )
  }
}
