/** Only the retired device discussions and Parallax Array chats are closed. */
export function isRetiredChatSubject(subject: string): boolean {
  return subject === 'device' || subject === 'device_batch' || subject === 'dreamcatcher'
}
