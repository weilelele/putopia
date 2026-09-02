export type InstallPromptOutcome = 'accepted' | 'dismissed'

export const PWA_OFFLINE_VIEW_PENDING_KEY = 'pwa:offline-view-pending'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: InstallPromptOutcome
    platform: string
  }>
}
