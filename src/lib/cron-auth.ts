/** A missing secret must disable a job, especially on shared-data previews. */
export function isCronAuthorized(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  return Boolean(secret?.trim()) && authorization === `Bearer ${secret}`
}
