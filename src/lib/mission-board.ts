const WEEK_MS = 7 * 24 * 60 * 60 * 1000
// Midnight on Monday in Shanghai, expressed in UTC.
const FIRST_EDITION = Date.parse('2026-11-08T16:00:00Z')

const series = {
  REC: { start: 118, name: 'Maren Solberg', avatar: '/assets/mission-board/maren.jpg' },
  CNT: { start: 74, name: 'Ryo Tanaka', avatar: '/assets/mission-board/ryo.jpg' },
  OBS: { start: 203, name: 'Valentina Cruz', avatar: '/assets/mission-board/valentina.jpg' },
} as const

type Series = keyof typeof series
type MissionImage = { src: string; alt: string; width: number; height: number }

type Scenario = {
  series: Series
  frequency: number
  teaser: `${string}{frequency}${string}`
  preview: string
  briefing: string
  followUp: string
}

const editions: readonly (readonly Scenario[])[] = [
  [
    {
      series: 'REC', frequency: 1100,
      teaser: '{frequency} went dark. Two lights faced inland.',
      preview: 'The world near Frequency {frequency} has gone quiet. Our last clear image showed two lighthouses, both facing inland. The direction of those lights is how we’ll know whether it’s the one we lost.',
      briefing: 'Sweep 0.2 on either side of {frequency}, one step at a time. Note where the shoreline holds and whether both lights face inland. Report the clearest Frequency even if the lights do not match.',
      followUp: 'If a harbor resolves, compare a second Band. Record whether the two lights still face inland from that angle.',
    },
    {
      series: 'CNT', frequency: 1046,
      teaser: 'At {frequency}, a ridge stood up. The lights stayed on.',
      preview: 'What looked like a ridge rose out of the water and walked away. The lights along its back stayed on. If someone lives up there, I’d like to know how they signal to one another.',
      briefing: 'At {frequency}, compare two available Bands for signs the lights are being used deliberately. If the world supports voice, try one short greeting and wait. Note whether anything changes, including if the lights continue as before.',
      followUp: 'Watch one full cycle of the lights before attempting contact. Note the order in which they turn on.',
    },
    {
      series: 'OBS', frequency: 882,
      teaser: 'A street-shaped blur surfaced near {frequency}.',
      preview: 'There’s a faint signal near Frequency {frequency}. One shape looks like a street on a map from our world, but we can’t tell what’s around it. Are we looking at a town, a few roads, or something else?',
      briefing: 'Sweep one step to either side of {frequency}. At the clearest setting, compare any available Bands. Describe the surroundings in a few sentences: roads, buildings, open land or anything moving. Give the Frequency and Band for each clear detail.',
      followUp: 'If a junction or a sign is legible, include it as a clue about the setting and say what remains unclear.',
    },
  ],
  [
    {
      series: 'REC', frequency: 973,
      teaser: 'The station at {frequency} dropped out.',
      preview: 'The old station signal had three clocks over one platform. The middle clock never moved. We have a new trace near {frequency}, but the clocks are still indistinct.',
      briefing: 'Sweep from 0.2 below {frequency} to 0.2 above it. Compare available Bands and note which setting shows all three clocks. Record whether the middle clock moves across two observations.',
      followUp: 'If you find the platform, record another fixed feature that could distinguish it from a similar station.',
    },
    {
      series: 'CNT', frequency: 1124,
      teaser: 'At {frequency}, a light on each bank. Is one answering the other?',
      preview: 'A figure at the end of a bridge leaves a light on after everyone else has gone. A second light sometimes appears on the near bank. I’d wait to see whether the two lights are related.',
      briefing: 'At {frequency}, compare Bands for a view of each bank. Observe the order in which the lights appear and go out. If voice is supported and the exchange has ended, try one greeting and wait.',
      followUp: 'Record a cycle where the second light never appears. Compare the first figure’s behavior with a cycle where it does.',
    },
    {
      series: 'OBS', frequency: 936,
      teaser: 'Unconfirmed signal near {frequency}. Rows of desks, maybe.',
      preview: 'A faint image near Frequency {frequency} shows rows of low shapes behind a window. They could be desks. A wider view would help us tell what kind of place this is and whether anyone is there.',
      briefing: 'Check {frequency} and the settings one step on either side. Compare the available Bands at the clearest setting. Describe the building, what surrounds it and any signs of activity. Note which view supports your best guess.',
      followUp: 'If there’s an interior Band, check for one feature that helps identify how the building is used.',
    },
  ],
  [
    {
      series: 'REC', frequency: 1214,
      teaser: 'The stairwell at {frequency} no longer resolves.',
      preview: 'The earlier record shows an iron stairwell with a rail that stops one step before the landing. The stairwell is gone from the old setting. There is a weak return near {frequency}.',
      briefing: 'Sweep one step to either side of {frequency}. If a stairwell resolves, compare the top step and rail in the available Bands. Report where the rail ends and the clearest Frequency.',
      followUp: 'If the rail is obscured, note the shape and position of the landing and check it against another Band.',
    },
    {
      series: 'CNT', frequency: 944,
      teaser: 'At {frequency}, an island raises a flag each time a boat leaves.',
      preview: 'A flag goes up on the island when a boat leaves the opposite shore. I’d like to know whether anyone on the boat looks back before we try to make ourselves known.',
      briefing: 'At {frequency}, follow one crossing across the available Bands. Note any deliberate gesture from the boat. If the world supports voice and the crew is stationary, try a short greeting once and wait.',
      followUp: 'Watch an empty stretch of water for the same length of time. Note whether the flag rises without a boat.',
    },
    {
      series: 'OBS', frequency: 1093,
      teaser: 'A weak signal near {frequency} shows shapes adrift.',
      preview: 'There’s a flicker near Frequency {frequency} that looks like objects moving in water. We can’t see enough of the banks to tell whether it’s a river, a canal or a flooded street.',
      briefing: 'Find the clearest setting near {frequency} and compare any available Bands. Describe the water, the edges of the channel and any signs of buildings or activity. Record which Frequency and Band gave you the clearest view of the setting.',
      followUp: 'If a Band shows what’s upstream, note whether the channel opens into a larger body of water or continues through built structures.',
    },
  ],
]

const additionalMissions: Record<Series, Scenario> = {
  REC: {
    series: 'REC', frequency: 1126,
    teaser: 'The north quay dropped out near {frequency}.',
    preview: 'The archive shows a tide gauge mounted upside down on the north quay. A weak return near {frequency} puts the shoreline in roughly the right place.',
    briefing: 'Sweep 0.2 to either side of {frequency}. Compare the gauge and nearest mooring post across any available Bands. Note the strongest setting and whether the scale reads from bottom to top.',
    followUp: 'If you can’t see the scale, record where the gauge sits relative to the edge of the quay.',
  },
  CNT: {
    series: 'CNT', frequency: 928,
    teaser: 'At {frequency}, a ferry answers a light on the far bank.',
    preview: 'On a late crossing, the ferry lights up after a single lamp comes on ashore. The timing could be deliberate. We have only seen part of the exchange near {frequency}.',
    briefing: 'Start near {frequency} and watch both banks if the Bands allow it. If there is a quiet interval after the ferry docks and the world supports voice, offer one greeting and note any change.',
    followUp: 'Record an ordinary crossing first so you have something to compare with the one you observed after speaking.',
  },
  OBS: {
    series: 'OBS', frequency: 898,
    teaser: 'A faint signal near {frequency} shows a line at a hatch.',
    preview: 'Near Frequency {frequency}, shapes seem to line up at a low hatch. Something pale moves through the opening. We have enough to go looking, but we don’t yet know what sort of place this is.',
    briefing: 'Find the clearest setting near {frequency} and check for a Band that shows the surrounding area. Give a first description of the place and what appears to be happening at the hatch. Include the Frequency and one detail that supports your description.',
    followUp: 'Note where the line comes from if any available Band shows it.',
  },
}

const weeklyMedia: Partial<Record<string, MissionImage>> = {
  'CNT-076': {
    src: '/assets/mission-board/cnt-076-console-film-soft.webp',
    alt: 'The Console’s round screen shows a fuzzy amber light over the dark outline of a bridge.',
    width: 720,
    height: 540,
  },
  'OBS-205': {
    src: '/assets/mission-board/obs-205-console-film-soft.webp',
    alt: 'The Console’s round screen shows a faint window-like blur and a few indistinct shapes.',
    width: 720,
    height: 540,
  },
}

function pickExtraSeries(week: number): Series | undefined {
  // Mix the calendar week once so a reload or another viewer gets the same edition.
  let seed = week + 3
  seed = Math.imul(seed ^ (seed >>> 16), 0x21f0aaad)
  seed = Math.imul(seed ^ (seed >>> 15), 0x735a2d97)
  const roll = ((seed ^ (seed >>> 15)) >>> 0) % 6
  return (['REC', 'CNT', 'OBS'] as const)[roll - 3]
}

function formatFrequency(tenths: number) {
  return (tenths / 10).toFixed(1)
}

function getEdition(now: number) {
  const week = Math.max(0, Math.floor((now - FIRST_EDITION) / WEEK_MS))
  const cycle = Math.floor(week / editions.length)
  const counts = { REC: 0, CNT: 0, OBS: 0 }
  const core = editions[week % editions.length]
  const extra = pickExtraSeries(week)
  const scenarios = extra ? [...core, additionalMissions[extra]] : core
  // Filter after assigning numbers so withdrawing an assignment cannot reassign its ID.
  const missions = scenarios.map(scenario => {
    const type = scenario.series
    const { start, ...author } = series[type]
    const number = start + week * 2 + counts[type]++
    const actualFrequency = scenario.frequency + (cycle * 13) % 421
    const frequency = formatFrequency(actualFrequency)
    const [before, after] = scenario.teaser.split('{frequency}')
    const teaserFrequency = type === 'CNT'
      ? `${formatFrequency(actualFrequency - 1)}–${formatFrequency(actualFrequency + 1)}`
      : frequency
    const id = `${type}-${String(number).padStart(3, '0')}`
    const withFrequency = (value: string) => value.replaceAll('{frequency}', frequency)
    return {
      id,
      series: type,
      author,
      teaser: { before, frequency: teaserFrequency, after },
      preview: withFrequency(scenario.preview),
      image: weeklyMedia[id],
      briefing: withFrequency(cycle % 2 ? scenario.briefing + ' ' + scenario.followUp : scenario.briefing),
    }
  }).filter(mission => mission.id !== 'OBS-206')
  return { startsAt: new Date(FIRST_EDITION + week * WEEK_MS).toISOString(), missions }
}

export function getPublicMissionEdition(now = Date.now()) {
  const { startsAt, missions } = getEdition(now)
  return {
    startsAt,
    missions: missions.map(({ id, series, author, teaser, preview, image }) => ({
      id, series, author, teaser, preview, image,
    })),
  }
}

export function getArchivedMissionPreview(id: string, now = Date.now()) {
  const match = /^(REC|CNT|OBS)-(\d{3,})$/.exec(id)
  if (!match) return undefined
  const type = match[1] as Series
  // Each series reserves two consecutive numbers per week, including the optional fourth mission.
  const week = Math.floor((Number(match[2]) - series[type].start) / 2)
  const startsAt = FIRST_EDITION + week * WEEK_MS
  if (week < 0 || !(startsAt + WEEK_MS <= now)) return undefined
  return getPublicMissionEdition(startsAt).missions.find(mission => mission.id === id)
}

export function getCurrentMissionBriefing(id: string, now = Date.now()) {
  return getEdition(now).missions.find(mission => mission.id === id)?.briefing ?? null
}

export type MissionEdition = ReturnType<typeof getPublicMissionEdition>
