import { isIOSNativeApp } from './app-platform'
import type { DashboardUpdate } from './dashboard-model'

export const COLLECTIVE_INSTALL_TITLE = 'Keep Collective within reach.'
export const COLLECTIVE_INSTALL_DESCRIPTION = 'Don’t miss an update. Save the Collective workspace to your phone.'
export const ANDROID_INSTALL_URL = 'https://www.multiverseco.org/install?source=email'
export type InstallPlatform = 'unknown' | 'android' | 'app' | 'other'

export function getInstallPlatform(userAgent: string, standalone: boolean): InstallPlatform {
  if (standalone || isIOSNativeApp(userAgent)) return 'app'
  return /Android/i.test(userAgent) ? 'android' : 'other'
}

export function androidInstallUpdate(now: Date): DashboardUpdate {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  return {
    id: 'collective-android-install', occurredAt: `${day}T00:00:00Z`, category: 'Intel',
    title: COLLECTIVE_INSTALL_TITLE, description: COLLECTIVE_INSTALL_DESCRIPTION,
    authorName: 'Multiverse Collective', href: '/install',
  }
}
