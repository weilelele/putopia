/** Shared with the Voyager directory: first letters of space-separated names, max two. */
export function memberInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).map(word => word[0]).join('').toUpperCase().slice(0, 2) || 'V'
}
