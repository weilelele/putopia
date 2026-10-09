// Country codes accepted by installed Stripe Checkout SDK, excluding unknown ZZ.
const countries = new Set('AC AD AE AF AG AI AL AM AO AQ AR AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CV CW CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IS IT JE JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SZ TA TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VN VU WF WS XK YE YT ZA ZM ZW'.split(' '))
export function initiationShippingCountries(raw: string | undefined): string[] | null {
  if (!raw) return null
  const list = raw.split(',').map(value => value.trim())
  if (!list.length || list.some(value => !countries.has(value)) || new Set(list).size !== list.length) return null
  return list
}
export function initiationPolicyError(config: {
  termsApproved?: string; fulfillmentApproved?: string; shippingPolicy?: string; taxPolicy?: string;
  countries?: string; siteUrl?: string; termsUrl?: string;
}): string | null {
  if (config.termsApproved !== 'true' || config.fulfillmentApproved !== 'true') return 'Initiation delivery policy and final terms have not been approved.'
  if (config.shippingPolicy !== 'included' || config.taxPolicy !== 'included') return 'Checkout currently supports only shipping and taxes included in the fixed total. Additional charges require a payment integration update.'
  if (config.countries?.trim() !== 'US') return 'Approved delivery regions are not configured correctly.'
  try {
    const site = new URL(config.siteUrl ?? '')
    const terms = new URL(config.termsUrl ?? '')
    if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash || site.pathname !== '/' ||
      terms.origin !== site.origin || terms.username || terms.password || terms.pathname !== '/terms/initiation' || terms.search || terms.hash) return 'A secure canonical site and final Initiation terms URL are required.'
  } catch { return 'A secure canonical site and final Initiation terms URL are required.' }
  return null
}

/** Contiguous 48 states and Washington DC; excludes territories and military addresses. */
const mainlandStates = new Set('AL AZ AR CA CO CT DE DC FL GA ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '))
export function isInitiationShippingRegion(address: { country?: string | null; state?: string | null }): boolean {
  return address.country === 'US' && mainlandStates.has(address.state?.trim().toUpperCase() ?? '')
}
