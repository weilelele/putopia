/** Shared copy and pure validation for the five-question Voyager profile. */
export const VOYAGER_PROFILE_VERSION = 'voyager-profile-v1'
export const PAID_PACK_STATUSES = ['paid', 'preparing', 'shipped', 'delivered'] as const
export const US_STATES = 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming'.split('|')
export const JAPAN_PREFECTURES = 'Hokkaido|Aomori|Iwate|Miyagi|Akita|Yamagata|Fukushima|Ibaraki|Tochigi|Gunma|Saitama|Chiba|Tokyo|Kanagawa|Niigata|Toyama|Ishikawa|Fukui|Yamanashi|Nagano|Gifu|Shizuoka|Aichi|Mie|Shiga|Kyoto|Osaka|Hyogo|Nara|Wakayama|Tottori|Shimane|Okayama|Hiroshima|Yamaguchi|Tokushima|Kagawa|Ehime|Kochi|Fukuoka|Saga|Nagasaki|Kumamoto|Oita|Miyazaki|Kagoshima|Okinawa'.split('|')
export const PROFILE_QUESTIONS = [
  {
    label: 'OUR SHARED MISSION',
    prompt: 'What is the primary mission of the Multiverse Collective?',
    options: ['To prove the existence of time travel', 'To identify, observe, and establish contact with parallel worlds', 'To develop transportation for interstellar travel', 'To create a digital replica of our own world'],
    feedback: 'Our shared mission is to identify, observe, and establish contact with parallel worlds. Every Voyager contributes a unique perspective.',
  },
  {
    label: 'THE MULTIVERSE CONSOLE',
    prompt: 'What does owning a Multiverse Console enable you to do?',
    options: ['Browse the Collective’s public archives', 'Officially begin observing and intervening in parallel worlds', 'Travel physically between parallel worlds', 'Replace the observations of other Voyagers'],
    feedback: 'The Multiverse Console marks the beginning of your active observation: with it, you can formally join the Multiverse Collective and begin exploring and intervening in parallel worlds.',
  },
  { label: 'YOUR LOCATION', prompt: 'Where in this world are you based?' },
  { label: 'YOUR WORK', prompt: 'What work do you do in this world (including work unknown to others)?' },
  { label: 'YOUR OBSERVATION', prompt: 'What parallel world have you recently glimpsed or come to believe might exist? Describe that world, as well as one detail that makes you think of it.' },
] as const

export type VoyagerIntake = {
  mission: string
  console: string
  country: 'United States' | 'Japan' | 'Other'
  otherCountry: string
  region: string
  work: string
  observation: string
  shareObservation: boolean
}
export const EMPTY_INTAKE: VoyagerIntake = { mission: '', console: '', country: 'United States', otherCountry: '', region: '', work: '', observation: '', shareObservation: false }

export function intakeStepError(value: VoyagerIntake, step: number): string | null {
  if (step < 2) return ['a', 'b', 'c', 'd'].includes(step === 0 ? value.mission : value.console) ? null : 'Choose an answer to continue.'
  if (step === 2) {
    if (!['United States', 'Japan', 'Other'].includes(value.country)) return 'Select your country.'
    if (value.country === 'Other' && (!value.otherCountry.trim() || value.otherCountry.trim().length > 100)) return 'Enter your country (up to 100 characters).'
    const regions = value.country === 'United States' ? US_STATES : value.country === 'Japan' ? JAPAN_PREFECTURES : null
    if (regions ? !regions.includes(value.region) : !value.region.trim() || value.region.trim().length > 100) return 'Enter or select your state or region.'
  }
  if (step === 3 && (!value.work.trim() || value.work.trim().length > 300)) return 'Enter your work (up to 300 characters).'
  if (step === 4 && (!value.observation.trim() || value.observation.trim().length > 2000)) return 'Enter your observation (up to 2,000 characters).'
  return null
}

export function parseVoyagerIntake(raw: unknown): VoyagerIntake | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (['mission', 'console', 'country', 'otherCountry', 'region', 'work', 'observation'].some(key => typeof value[key] !== 'string') || typeof value.shareObservation !== 'boolean') return null
  const result = Object.fromEntries(Object.entries(EMPTY_INTAKE).map(([key]) => [key, typeof value[key] === 'string' ? value[key].trim() : value[key]])) as VoyagerIntake
  return Array.from({ length: 5 }, (_, i) => intakeStepError(result, i)).some(Boolean) ? null : result
}

export function isPaidVoyagerPack(order: { status: string; product_type: string | null }): boolean {
  return (order.product_type === null || order.product_type === 'voyager_pack') && PAID_PACK_STATUSES.some(status => status === order.status)
}
