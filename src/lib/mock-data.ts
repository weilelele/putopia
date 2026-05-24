export interface IntelEntry {
  id: string
  title: string
  content: string
  timestamp: string
  tag: 'NOTICE' | 'DEVICE' | 'ORG'
  classified: boolean
}

export interface Device {
  id: string
  name: string
  codename: string
  location: string
  intro: string
  type: 'unknown' | 'known'
  // unknown only
  explorationProgress?: number
  // known only
  status?: 'AVAILABLE' | 'NEEDS REPAIR' | 'IN USE'
  usedBy?: string // voyager id
  usedByName?: string
}

/** @deprecated voyagerProfiles removed — use getAllVoyagers() from @/lib/actions/profile */
export interface VoyagerProfile {
  id: string
  name: string
  initials: string
  bio: string
  observationDays: number
  worldsDiscovered: number
  joinDate: string
  links?: {
    x?: string
    instagram?: string
    linkedin?: string
  }
  avatarColor: string
}

export interface LogEntry {
  id: string
  voyagerId: string
  voyagerName: string
  voyagerInitials: string
  voyagerColor: string
  date: string
  title: string
  excerpt: string
  videoUrl?: string
  tags: string[]
}

export interface World {
  id: string
  name: string
  nameEn: string
  discoverer: string
  discoveryDate: string
  gradientFrom: string
  gradientTo: string
  description: string
}

// INTEL DATA
export const intelData: IntelEntry[] = [
  {
    id: 'INT-001',
    title: 'Parallel World Signal — First Confirmed Detection',
    content: 'The intercepted signal operates at a variant band of 7.83Hz. Preliminary analysis confirms the existence of a parallel world node. The signal origin region has been flagged as Priority A for observation. All Voyagers must complete device calibration within 72 hours.',
    timestamp: '2026-04-28T09:00:00Z',
    tag: 'DEVICE',
    classified: true,
  },
  {
    id: 'INT-002',
    title: 'Putopia Collective — Q3 Architect Council Meeting Notes',
    content: 'The Architect Council has approved three new known device nodes, located in Shanghai, Taipei, and Seoul. The Council also resolved to extend the next application window through the end of June 2026. New candidates must meet a minimum of 30 observation days on record.',
    timestamp: '2026-04-15T14:30:00Z',
    tag: 'ORG',
    classified: false,
  },
  {
    id: 'INT-003',
    title: 'Device ECHO-7 — Anomalous Activity Report',
    content: 'The ECHO-7 unit in Beijing recorded frequency drift between April 3 and April 7. Drift amplitude exceeded the threshold of ±0.04Hz. The Voyager currently operating the device has submitted an anomaly log. The technical team is assessing whether temporary suspension of use is required.',
    timestamp: '2026-04-10T11:15:00Z',
    tag: 'DEVICE',
    classified: true,
  },
  {
    id: 'INT-004',
    title: 'New Member Briefing — Joining the Putopia Collective',
    content: 'Welcome to all new applicants. The Collective was established in 2023 with a mission of systematic observation and documentation of parallel worlds. Applicants must complete the basic questionnaire before entering the candidate queue. Upon becoming a Voyager, you will receive device access rights and log publication privileges.',
    timestamp: '2026-03-20T08:00:00Z',
    tag: 'NOTICE',
    classified: false,
  },
  {
    id: 'INT-005',
    title: 'World Archive Expansion — Phase Two Announcement',
    content: 'With catalogued parallel worlds now exceeding 200 nodes, the archive system will complete its Phase Two expansion in May 2026. All Voyagers will be able to upload high-resolution observation data to the new nodes. Legacy format files must be migrated before April 30.',
    timestamp: '2026-03-05T16:45:00Z',
    tag: 'ORG',
    classified: false,
  },
  {
    id: 'INT-006',
    title: 'URGENT: VEIL-3 Zone Access Lockdown',
    content: 'Following an unexplained mass of anomalous material detected in the VEIL-3 region, the Council has suspended all device access to that zone effective immediately. Affected Voyagers will receive alternative device assignment plans. The lockdown is expected to remain in effect until the anomaly assessment is complete.',
    timestamp: '2026-05-01T03:30:00Z',
    tag: 'DEVICE',
    classified: true,
  },
]

// DEVICE DATA
export const deviceData: Device[] = [
  {
    id: 'DEV-U01',
    name: 'Abyss Mirror',
    codename: 'ABYSS-MIRROR',
    location: 'Yunnan Province, China',
    intro: 'An unnamed signal source located in a high-altitude region. Detected quantum fluctuation patterns share a 70% similarity with known devices. The terrain is complex; no field survey has been conducted. Preliminary satellite data indicates a stable node structure.',
    type: 'unknown',
    explorationProgress: 23,
  },
  {
    id: 'DEV-U02',
    name: 'Phantom Station',
    codename: 'PHANTOM-STATION',
    location: 'Near Reykjavik, Iceland',
    intro: 'Accidentally discovered in late 2025 by Voyager SOLARIS-8 during an aurora observation. Device characteristics remain unknown, but signal strength is unusually stable. Due to geographic constraints, exploration is planned for summer 2026.',
    type: 'unknown',
    explorationProgress: 61,
  },
  {
    id: 'DEV-U03',
    name: 'Fold Point Sigma',
    codename: 'FOLD-SIGMA',
    location: 'Andes Mountains, Peru',
    intro: 'An anomalous energy node discovered within an ancient site. Its signal characteristics closely match known parallel world signatures. Local monitoring station data has been uploaded to the archive and is awaiting Architect Council approval for an exploration plan.',
    type: 'unknown',
    explorationProgress: 8,
  },
  {
    id: 'DEV-K01',
    name: 'Echo Seven',
    codename: 'ECHO-7',
    location: 'Beijing, China',
    intro: 'One of the Collective\'s earliest known devices, with 47 parallel world nodes successfully recorded. Operational stability has been good, though recent frequency drift has been detected and is under technical monitoring.',
    type: 'known',
    status: 'IN USE',
    usedBy: 'VOY-003',
    usedByName: 'Voyager Lingbo',
  },
  {
    id: 'DEV-K02',
    name: 'Prism Deck',
    codename: 'PRISM-DECK',
    location: 'Taipei, Taiwan',
    intro: 'A high-precision signal receiver specializing in low-frequency parallel world signals. Thirty-one world nodes catalogued, predominantly of the Mirror-class type. Device condition is excellent; no current reservations.',
    type: 'known',
    status: 'AVAILABLE',
  },
  {
    id: 'DEV-K03',
    name: 'Dawn Post',
    codename: 'DAWN-POST',
    location: 'Seoul, South Korea',
    intro: 'A newly constructed device. Hardware installation is complete; the software calibration system still requires repair. Once restored, it is expected to become one of the Collective\'s strongest signal-receiving nodes in East Asia.',
    type: 'known',
    status: 'NEEDS REPAIR',
  },
  {
    id: 'DEV-K04',
    name: 'Silent Sentinel',
    codename: 'SILENT-SENTINEL',
    location: 'Sydney, Australia',
    intro: 'The primary observation node in the Southern Hemisphere. Its geographic advantage allows reception of signals in blind spots undetectable by Northern Hemisphere devices. Twenty-two unique world nodes have been recorded. Currently operated by one Voyager.',
    type: 'known',
    status: 'IN USE',
    usedBy: 'VOY-006',
    usedByName: 'Voyager Hoshino',
  },
]

// VOYAGER PROFILES — replaced by real DB via getAllVoyagers()
// Kept as empty array so any remaining imports don't break at build time
export const voyagerProfiles: VoyagerProfile[] = [
  {
    id: 'VOY-001',
    name: 'Lu Mingyuan',
    initials: 'LM',
    bio: 'Former physics researcher who joined the Collective in 2024. Specializes in high-dimensional signal analysis. The first within Putopia to record a Mirror-7 class world. Believes the existence of parallel worlds is not theory, but proven reality.',
    observationDays: 487,
    worldsDiscovered: 12,
    joinDate: '2024-02-14',
    links: { x: 'https://x.com', linkedin: 'https://linkedin.com' },
    avatarColor: '#E8A020',
  },
  {
    id: 'VOY-002',
    name: 'Selene Marsh',
    initials: 'SM',
    bio: 'Digital artist and signal interpreter from London. Specializes in visualizing parallel world data as generative art. Has contributed 8 unique world records to the archive.',
    observationDays: 312,
    worldsDiscovered: 8,
    joinDate: '2024-06-30',
    links: { instagram: 'https://instagram.com', x: 'https://x.com' },
    avatarColor: '#D4601A',
  },
  {
    id: 'VOY-003',
    name: 'Lingbo',
    initials: 'LB',
    bio: 'An observer who moves between technology and the metaphysical, currently based in Beijing. Specializes in nighttime observation and has recorded multiple Dark Current class world nodes. Currently operating ECHO-7 for long-term tracking.',
    observationDays: 209,
    worldsDiscovered: 6,
    joinDate: '2024-11-03',
    links: { x: 'https://x.com' },
    avatarColor: '#4D8C3F',
  },
  {
    id: 'VOY-004',
    name: 'Tariq Osei',
    initials: 'TO',
    bio: 'Software engineer and amateur astronomer from Accra. Joined the Collective after detecting an anomalous signal pattern during a meteor shower observation.',
    observationDays: 156,
    worldsDiscovered: 3,
    joinDate: '2025-01-19',
    links: { linkedin: 'https://linkedin.com', x: 'https://x.com' },
    avatarColor: '#E8A020',
  },
  {
    id: 'VOY-005',
    name: 'Shen Zhimeng',
    initials: 'SZ',
    bio: 'Writer and signal poet. Translates parallel world observation data into poetic language. Author of the published collection "Voices of the Fold." Believes every world carries its own unique narrative frequency.',
    observationDays: 441,
    worldsDiscovered: 9,
    joinDate: '2024-03-08',
    links: { instagram: 'https://instagram.com' },
    avatarColor: '#C43020',
  },
  {
    id: 'VOY-006',
    name: 'Hoshino Nozomu',
    initials: 'HN',
    bio: 'Independent researcher from Japan, currently based in Sydney. Has conducted in-depth research on Fold-class world nodes and is operating SILENT-SENTINEL for a Southern Hemisphere-focused observation project.',
    observationDays: 278,
    worldsDiscovered: 7,
    joinDate: '2024-08-12',
    links: { x: 'https://x.com', instagram: 'https://instagram.com' },
    avatarColor: '#E8A020',
  },
  {
    id: 'VOY-007',
    name: 'Mira Volkov',
    initials: 'MV',
    bio: 'Astrophysicist based in Moscow. Brings academic rigor to signal interpretation. Has developed the Collective\'s primary calibration protocol still in use today.',
    observationDays: 621,
    worldsDiscovered: 15,
    joinDate: '2023-11-01',
    links: { linkedin: 'https://linkedin.com' },
    avatarColor: '#C4A96A',
  },
  {
    id: 'VOY-008',
    name: 'Ye Cheng',
    initials: 'YC',
    bio: 'Architectural designer with a unique perspective on the relationship between spatial folding and parallel worlds. Responsible for the physical site planning of several Collective device nodes, while maintaining a personal observation record.',
    observationDays: 188,
    worldsDiscovered: 4,
    joinDate: '2025-02-28',
    links: { instagram: 'https://instagram.com', linkedin: 'https://linkedin.com' },
    avatarColor: '#4D8C3F',
  },
]

// LOG ENTRIES
export const logEntries: LogEntry[] = [
  {
    id: 'LOG-001',
    voyagerId: 'VOY-007',
    voyagerName: 'Mira Volkov',
    voyagerInitials: 'MV',
    voyagerColor: '#C4A96A',
    date: '2026-05-08',
    title: 'Prism Deck Night Observation: First Contact with Mirror-Omega Node',
    excerpt: 'The signal arrived softly that night, like a single ripple spreading across still water. At 00:43, the instrument readings suddenly stabilized — a curve shape I had never seen before. I knew it was something new. The contours of another world slowly emerged on screen. Its sky was orange, cloudless, with a single vertical column of light suspended above the horizon...',
    tags: ['MIRROR CLASS', 'FIRST RECORD', 'PRISM DECK'],
  },
  {
    id: 'LOG-002',
    voyagerId: 'VOY-003',
    voyagerName: 'Lingbo',
    voyagerInitials: 'LB',
    voyagerColor: '#4D8C3F',
    date: '2026-04-29',
    title: 'Observation Notes During the ECHO-7 Anomaly',
    excerpt: 'During the days of device drift, I did not stop recording. The instability of the frequency brought an unexpected discovery — within the ±0.04Hz flutter band, a faint signal was hidden, one that had always been filtered out. I isolated that frequency band and listened for three hours on repeat. It was another language, or more precisely, another system of symbols...',
    tags: ['ECHO-7', 'ANOMALY OBS', 'DARK CURRENT'],
    videoUrl: 'https://example.com/log002',
  },
  {
    id: 'LOG-003',
    voyagerId: 'VOY-005',
    voyagerName: 'Shen Zhimeng',
    voyagerInitials: 'SZ',
    voyagerColor: '#C43020',
    date: '2026-04-17',
    title: 'Thirteenth Contact: A Poetic Report on the Silent World',
    excerpt: 'Silence is not emptiness. Silence is language at extreme density, waiting for someone who can decode it to appear. That world had no sound, but my instruments recorded complete vibration data. I translated them into words: the folds of the mountains are sentences, the branching of rivers are punctuation. This is a poem without sound, written for all who believe in another kind of existence...',
    tags: ['POETIC LOG', 'SILENT CLASS', 'CREATIVE'],
  },
  {
    id: 'LOG-004',
    voyagerId: 'VOY-006',
    voyagerName: 'Hoshino Nozomu',
    voyagerInitials: 'HN',
    voyagerColor: '#E8A020',
    date: '2026-04-05',
    title: 'The Southern Blind Spot: Verifying SILENT-SENTINEL\'s Unique Advantage',
    excerpt: 'Three months ago I had a feeling: the Northern Hemisphere devices were missing something. Last night\'s data confirmed it. Within the signal window at 34° South latitude, I captured two nodes that have never been recorded before. Their signatures are entirely unlike the Fold-class — more like static snapshots that the parallel universe left behind at this position...',
    tags: ['SILENT-SENTINEL', 'SOUTHERN HEMI', 'FOLD CLASS'],
    videoUrl: 'https://example.com/log004',
  },
  {
    id: 'LOG-005',
    voyagerId: 'VOY-001',
    voyagerName: 'Lu Mingyuan',
    voyagerInitials: 'LM',
    voyagerColor: '#E8A020',
    date: '2026-03-22',
    title: 'High-Dimensional Signal Analysis: Fourth Breakthrough Record',
    excerpt: 'My training in physics taught me to let numbers speak, but this record left me speechless. When the signal from the 47th node fully unfolded, I saw a world whose physical constants were almost identical to ours — with one critical difference: the speed of light there is 0.003% slower than ours. What does this mean? I need time to think...',
    tags: ['HIGH-DIM SIGNAL', 'PHYSICS CONSTANT', 'MIRROR-7'],
  },
]

// WORLD RECORDS
export const worldData: World[] = [
  {
    id: 'WLD-001',
    name: 'Amber Zenith',
    nameEn: 'Amber Zenith',
    discoverer: 'Mira Volkov',
    discoveryDate: '2024-01-15',
    gradientFrom: '#E8A020',
    gradientTo: '#C43020',
    description: 'Eternal orange sky with vertical light column structures. Physical laws are highly similar to our own world.',
  },
  {
    id: 'WLD-002',
    name: 'Mirror-Seven',
    nameEn: 'Mirror-Seven',
    discoverer: 'Lu Mingyuan',
    discoveryDate: '2024-03-29',
    gradientFrom: '#C4A96A',
    gradientTo: '#7A6A40',
    description: 'Speed of light is 0.003% slower. Life forms exist but operate under a completely different symbolic language system.',
  },
  {
    id: 'WLD-003',
    name: 'The Silent Realm',
    nameEn: 'The Silent Realm',
    discoverer: 'Shen Zhimeng',
    discoveryDate: '2024-06-10',
    gradientFrom: '#3D3010',
    gradientTo: '#0F0A00',
    description: 'A soundless world. Vibration data is complete but the visible light spectrum carries no signal. Mountain ranges form syntactic structures.',
  },
  {
    id: 'WLD-004',
    name: 'Fold South',
    nameEn: 'Fold South',
    discoverer: 'Hoshino Nozomu',
    discoveryDate: '2025-04-04',
    gradientFrom: '#4D8C3F',
    gradientTo: '#E8A020',
    description: 'A node in the Southern Hemisphere blind spot. Pronounced spatial folding characteristics, presenting as a static snapshot state.',
  },
  {
    id: 'WLD-005',
    name: 'Dark Current Omega',
    nameEn: 'Dark Current Omega',
    discoverer: 'Lingbo',
    discoveryDate: '2025-09-18',
    gradientFrom: '#221800',
    gradientTo: '#5C4A1E',
    description: 'Discovered within the ECHO-7 frequency drift. Communicates using an entirely new symbol system.',
  },
  {
    id: 'WLD-006',
    name: 'Prism Refraction Zone',
    nameEn: 'Prism Refraction Zone',
    discoverer: 'Selene Marsh',
    discoveryDate: '2025-02-22',
    gradientFrom: '#D4601A',
    gradientTo: '#C43020',
    description: 'A multiple-refraction signal source. Visual data presents rainbow-like interference patterns. Signs of life remain uncertain.',
  },
  {
    id: 'WLD-007',
    name: 'Twin Constellation World',
    nameEn: 'Twin Constellation World',
    discoverer: 'Tariq Osei',
    discoveryDate: '2025-11-07',
    gradientFrom: '#E8A020',
    gradientTo: '#4D8C3F',
    description: 'A world with two closely neighboring stars. Biological evolutionary paths have diverged significantly from our own.',
  },
  {
    id: 'WLD-008',
    name: 'Eye of the Void',
    nameEn: 'Eye of the Void',
    discoverer: 'Lu Mingyuan',
    discoveryDate: '2026-01-30',
    gradientFrom: '#0F0A00',
    gradientTo: '#E8A020',
    description: 'A deep dark-matter region. Suspected observation window near the origin of the universe. Data is exceptionally rare.',
  },
]
