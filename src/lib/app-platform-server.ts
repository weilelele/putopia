import { headers } from 'next/headers'
import { isIOSNativeApp } from '@/lib/app-platform'

/** True when the current request comes from the iOS app's web view. */
export async function isIOSNativeRequest() {
  return isIOSNativeApp((await headers()).get('user-agent') ?? '')
}
