export const missionCategories = [
  { id: 'observation', label: 'Emergency Observation', description: 'Observe urgent changes in another world.' },
  { id: 'intervention', label: 'Intervention Attempt', description: 'Attempt contact across worlds.' },
  { id: 'frequency', label: 'Frequency Exploration', description: 'Locate a channel’s frequency.' },
] as const

export type MissionCategory = typeof missionCategories[number]['id']

export function canAccessMissionBoard(role: string | null | undefined) {
  return role === 'voyager' || role === 'architect'
}
