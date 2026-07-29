export const IOS_NATIVE_USER_AGENT_TOKEN = 'MultiverseCollective/'

export function isIOSNativeApp(userAgent: string) {
  return userAgent.includes(IOS_NATIVE_USER_AGENT_TOKEN)
}
