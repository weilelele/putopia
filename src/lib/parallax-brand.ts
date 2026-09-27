/** Public naming only. Existing device IDs, tables and asset bindings stay stable. */
export function parallaxArrayName(name: string): string {
  return name.replace(/\bdreamcatchers\b/gi, 'Parallax Arrays').replace(/\bdreamcatcher\b/gi, 'Parallax Array')
}
