export type SearchableCosmoChannel = {
  channelId: string
  name: string
  freq: number | null
}

export function matchesWorldflowCosmoChannel(query: string, channel: SearchableCosmoChannel) {
  const normalized = query.trim().toLocaleLowerCase('zh-CN')
  if (!normalized) return true
  return (
    channel.name.toLocaleLowerCase('zh-CN').includes(normalized) ||
    channel.channelId.toLocaleLowerCase('zh-CN').includes(normalized) ||
    (channel.freq !== null && String(channel.freq).includes(normalized))
  )
}
