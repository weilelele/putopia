// Edit this file to update device status, type, and information.
// For image: place image file in /public/devices/ and set imagePath to "/devices/filename.jpg"
// If no image is available, leave imagePath as null to show the default pattern.

export type DeviceStatus = 'AVAILABLE' | 'NEEDS REPAIR' | 'IN USE' | 'UNKNOWN'
export type DeviceKnowledge = 'known' | 'unknown'

export interface Device {
  id: string
  name: string           // device name/designation
  batchId?: string       // for unknown devices grouped by batch
  knowledge: DeviceKnowledge
  location: string       // geographic region
  description: string    // brief description
  imagePath: string | null  // e.g. "/devices/unit-7.jpg" or null for default
  // For known devices:
  status?: DeviceStatus
  currentUser?: string   // voyager name if IN USE
  // For unknown devices:
  explorationProgress?: number  // 0-100
}

export const devices: Device[] = [
  // UNKNOWN DEVICES
  { id: "uk-1", knowledge: "unknown", name: "Signal Source Alpha", location: "Northern Europe", description: "Intermittent transmissions detected. Source confirmed organic in origin. No direct contact established.", imagePath: null, explorationProgress: 23 },
  { id: "uk-2", knowledge: "unknown", name: "Batch 7 — Eastern Cluster", batchId: "BATCH-07", location: "East Asia", description: "Three units detected operating in proximity. Signal patterns suggest coordinated activity.", imagePath: null, explorationProgress: 61 },
  { id: "uk-3", knowledge: "unknown", name: "Deep Channel Emitter", location: "South America", description: "High-frequency emissions from an unidentified unit. Quantum signature does not match known models.", imagePath: null, explorationProgress: 8 },
  // KNOWN DEVICES
  { id: "kn-1", knowledge: "known", name: "Unit 001 — The Originator", location: "Berlin, Germany", description: "The oldest known Console in the Collective's records. Previously held for 20 years by a German Voyager. Now in active rotation.", imagePath: null, status: "IN USE", currentUser: "Voyager Luke" },
  { id: "kn-2", knowledge: "known", name: "Unit 012 — The Observer", location: "Shanghai, China", description: "Gifted between friends. Established the first confirmed cross-temporal quantum link on record.", imagePath: null, status: "IN USE", currentUser: "Voyager Page" },
  { id: "kn-3", knowledge: "known", name: "Unit 019 — The Wanderer", location: "Tokyo, Japan", description: "Recovered from an abandoned postal locker. Functional. Awaiting assignment.", imagePath: null, status: "AVAILABLE" },
  { id: "kn-4", knowledge: "known", name: "Unit 023 — The Broken Eye", location: "London, UK", description: "Screen calibration failure after extended deep-channel exposure. Under restoration.", imagePath: null, status: "NEEDS REPAIR" },
]
