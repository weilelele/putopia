/** Pure submission rule; the database RPCs enforce the same one (schema_v113). */
export const OBSERVATION_ACCESS_ERROR = 'Only Voyagers and members with a paid order can submit observations.'

export function canSubmitObservation(role: string | null | undefined, hasPaidOrder: boolean): boolean {
  if (!role) return false
  return role === 'voyager' || role === 'architect' || hasPaidOrder
}
