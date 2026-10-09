/** Public character disclosure lives in the membership-count explanation. */
export function publicMemberBio(bio: string | null | undefined): string {
  return (bio ?? '').replace(/^Official fictional NPC\.\s*/i, '')
}
