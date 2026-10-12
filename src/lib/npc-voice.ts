export function validateNpcVoice(value: unknown): string | null {
  return typeof value !== 'string' || value.length > 12000
    ? 'Language and behavior must be at most 12,000 characters.' : null
}
