const WEEK_MS = 7 * 24 * 60 * 60 * 1000
// Midnight on Monday in Shanghai, expressed in UTC.
const FIRST_EDITION = Date.parse('2026-11-08T16:00:00Z')

const series = {
  REC: { start: 118, name: 'Maren Solberg', avatar: '/assets/mission-board/maren.jpg' },
  CNT: { start: 74, name: 'Ryo Tanaka', avatar: '/assets/mission-board/ryo.jpg' },
  OBS: { start: 203, name: 'Valentina Cruz', avatar: '/assets/mission-board/valentina.jpg' },
} as const

type Series = keyof typeof series
type Scenario = {
  series: Series
  frequency: number
  teaser: string
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
      teaser: 'A ridge stood up. The lights stayed on.',
      preview: 'What looked like a ridge rose out of the water and walked away. The lights along its back stayed on. If someone lives up there, I’d like to know how they signal to one another.',
      briefing: 'At {frequency}, compare two available Bands for signs the lights are being used deliberately. If the world supports voice, try one short greeting and wait. Note whether anything changes, including if the lights continue as before.',
      followUp: 'Watch one full cycle of the lights before attempting contact. Note the order in which they turn on.',
    },
    {
      series: 'OBS', frequency: 882,
      teaser: 'A familiar street shows up near {frequency}.',
      preview: 'A blurred map surfaced near Frequency {frequency}. One road follows the same bend as a street in our world. Even half a street name would give us something to check.',
      briefing: 'Sweep one step to either side of {frequency} and compare the available Bands. Report the clearest letters, the Frequency and where the road bends. Send a partial match as soon as you see one.',
      followUp: 'If the street name is unreadable, look for a route number or a distinctive junction and write down exactly what you can see.',
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
      teaser: 'Someone leaves a light burning across the bridge.',
      preview: 'A figure at the end of a bridge leaves a light on after everyone else has gone. A second light sometimes appears on the near bank. I’d wait to see whether the two lights are related.',
      briefing: 'At {frequency}, compare Bands for a view of each bank. Observe the order in which the lights appear and go out. If voice is supported and the exchange has ended, try one greeting and wait.',
      followUp: 'Record a cycle where the second light never appears. Compare the first figure’s behavior with a cycle where it does.',
    },
    {
      series: 'OBS', frequency: 936,
      teaser: 'A classroom looks busy from the empty street.',
      preview: 'From the street, a school window shows a classroom full of people. The corridor looks empty. We need one detail that appears in both views.',
      briefing: 'At {frequency}, compare the street view with an interior Band if one is available. Identify a fixed feature visible in both. Record where the people are visible and which Band you were on.',
      followUp: 'Check whether writing on the board stays fixed when the people move.',
    },
    {
      series: 'OBS', frequency: 898,
      teaser: 'One postmark looks like a mark from our archive.',
      preview: 'Letters are going into a small kiosk. One stamp resembles a mark from our archive, but we haven’t read it clearly enough to compare.',
      briefing: 'At {frequency}, check the available Bands for a legible stamp. Note the first clear letter or shape and where it appears on the envelope.',
      followUp: 'Watch whether letters with that mark are sorted into the same slot.',
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
      teaser: 'An island raises a flag each time a boat leaves.',
      preview: 'A flag goes up on the island when a boat leaves the opposite shore. I’d like to know whether anyone on the boat looks back before we try to make ourselves known.',
      briefing: 'At {frequency}, follow one crossing across the available Bands. Note any deliberate gesture from the boat. If the world supports voice and the crew is stationary, try a short greeting once and wait.',
      followUp: 'Watch an empty stretch of water for the same length of time. Note whether the flag rises without a boat.',
    },
    {
      series: 'OBS', frequency: 1093,
      teaser: 'Numbered objects drift past in groups of three.',
      preview: 'The numbers on objects in the river sometimes appear twice. If you can catch a repeat, we can start to tell whether it’s the same object or a second one carrying the same number.',
      briefing: 'At {frequency}, hold the riverbank Band through two groups. Record any repeated number, the objects it appears on and the order they pass.',
      followUp: 'Try an upstream Band if one is available. Note whether the repeated number can be seen before the first bend.',
    },
  ],
]

function getEdition(now: number) {
  const week = Math.max(0, Math.floor((now - FIRST_EDITION) / WEEK_MS))
  const cycle = Math.floor(week / editions.length)
  const counts = { REC: 0, CNT: 0, OBS: 0 }
  const missions = editions[week % editions.length].map(scenario => {
    const type = scenario.series
    const { start, ...author } = series[type]
    const number = start + week * 2 + counts[type]++
    const frequency = ((scenario.frequency + (cycle * 13) % 421) / 10).toFixed(1)
    const withFrequency = (value: string) => value.replaceAll('{frequency}', frequency)
    return {
      id: `${type}-${String(number).padStart(3, '0')}`,
      author,
      teaser: withFrequency(scenario.teaser),
      preview: withFrequency(scenario.preview),
      briefing: withFrequency(cycle % 2 ? scenario.briefing + ' ' + scenario.followUp : scenario.briefing),
    }
  })
  return { startsAt: new Date(FIRST_EDITION + week * WEEK_MS).toISOString(), missions }
}

export function getPublicMissionEdition(now = Date.now()) {
  const { startsAt, missions } = getEdition(now)
  return {
    startsAt,
    missions: missions.map(({ id, author, teaser, preview }) => ({ id, author, teaser, preview })),
  }
}

export function getCurrentMissionBriefing(id: string, now = Date.now()) {
  return getEdition(now).missions.find(mission => mission.id === id)?.briefing ?? null
}

export type MissionEdition = ReturnType<typeof getPublicMissionEdition>
