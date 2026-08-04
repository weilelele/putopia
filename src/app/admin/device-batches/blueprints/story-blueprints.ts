export type StoryBlueprint = {
  id: string
  index: string
  name: string
  workingTitle: string
  location: string
  period: string
  emotionalCore: string
  story: string
  engine: string
  palette: {
    name: string
    value: string
  }[]
  paletteStatus: string
  moodAdvice: string[]
  visualDirection: string[]
  confirmed: string[]
  estimates: string[]
  questions: string[]
  phases: {
    label: string
    objective: string
    contents: string[]
  }[]
  contentMap: {
    code: string
    phase: string
    audience: string
    type: string
    title: string
    purpose: string
    action: string
    recovery: string
  }[]
  votes: {
    code: string
    question: string
    trigger: string
    options: string[]
    fixed: string
    result: string
  }[]
  avoid: string[]
  nextQuestions: string[]
}

export const STORY_BLUEPRINTS: StoryBlueprint[] = [
  {
    id: 'cologne',
    index: '01',
    name: 'Cologne Batch',
    workingTitle: 'The Silent Observatory',
    location: 'Cologne, Germany',
    period: '1960s–1990s · discovered within the past year',
    emotionalCore: 'Faith, time, and long observation',
    story:
      'Beginning in the 1960s, a Catholic priest in Cologne used a Multiverse Console to observe parallel worlds. Before his death, he left a group of visually identical devices in a church storeroom. Thirty years later, the Collective must restore the devices while determining whether his surviving records preserved signals—or documented a search for what he understood as human salvation.',
    engine:
      'The link between the devices and thirty years of observation records has been lost. Before applying power, the team must rebuild the relationship between Unit numbers, paper records, and historical tuning paths without overwriting what the priest left behind.',
    palette: [],
    paletteStatus: 'Waiting for the approved color specification',
    moodAdvice: [
      'Keep overall saturation low to moderate, allowing the thirty-year sense of preservation to come from material rather than a visual filter.',
      'Use a quiet, inward tonal range. Metal details or the signal light can provide brief moments of spiritual intensity.',
      'Create a clear temperature difference between paper, wood, and metal without making the Console resemble a religious artifact.',
    ],
    visualDirection: [
      'Take evidence from the church storeroom, aged paper, wooden shelving, and materials consistent with the period.',
      'Build the Batch identity through material, numbering, and preservation marks rather than added religious imagery.',
      'Keep every finished Unit visually identical. Historical differences belong in the individual Unit archives.',
    ],
    confirmed: [
      'The Batch was found in a Catholic church storeroom in Cologne.',
      'A Catholic priest kept the devices for an extended period.',
      'His use of the equipment began in the 1960s and continued for roughly thirty years.',
      'The storeroom held a group of visually identical devices.',
    ],
    estimates: [
      'The equipment was not systematically used after the priest died.',
      'Paper records, device numbers, and physical Units may no longer correspond correctly.',
      'Some Units may retain different historical tuning states.',
    ],
    questions: [
      'What were the priest’s name, parish, and exact dates?',
      'Why did he possess an entire group of identical devices?',
      'Were all Units used, or did one serve as the primary Console?',
      'Was “salvation” a personal religious interpretation or a signal-classification method?',
    ],
    phases: [
      {
        label: 'Under Survey',
        objective: 'Establish that this is a long-preserved Batch requiring careful recovery.',
        contents: [
          'First field report: identical devices in the storeroom',
          'Inventory update: device count and paper archive do not match',
          'Archive update: thirty years of signal classification',
          'Test video: the first stable return signal',
        ],
      },
      {
        label: 'Claim Open',
        objective: 'Use the Unit-to-record recovery method as evidence that the Batch is ready.',
        contents: [
          'Publish recoverable quantity, price, and complete distribution plan',
          'Explain how historical tuning data will be preserved',
          'Invite holders to choose which anonymized record category is digitized first',
        ],
      },
      {
        label: 'Distribution in Progress',
        objective: 'Reconnect archive material, historical tuning, and the final Console.',
        contents: [
          'Archive stage: number card, inventory record, and authorized observation pages',
          'Tuning stage: historical dial positions, return-test results, and vote outcome',
          'Console stage: Unit archive and historical-path retest instructions',
        ],
      },
      {
        label: 'Active in Field',
        objective: 'Turn the priest’s long observation into a shared holder-led retest.',
        contents: [
          'Retest historical signal categories in different regions',
          'Compare original records with current reception',
          'Keep religious interpretation separate from verifiable signal facts',
        ],
      },
    ],
    contentMap: [
      {
        code: 'SUR-01',
        phase: 'Under Survey',
        audience: 'Public visitors',
        type: 'First field report',
        title: 'Identical devices in the storeroom',
        purpose: 'Establish place, discovery context, and long-term preservation.',
        action: 'Follow the Batch',
        recovery: 'SUR-02 inventory result',
      },
      {
        code: 'SUR-02',
        phase: 'Under Survey',
        audience: 'Followers',
        type: 'Inventory report',
        title: 'The device count does not match the paper archive',
        purpose: 'Introduce the Batch conflict: records and Units have lost their correspondence.',
        action: 'Review the number comparison',
        recovery: 'SUR-03 archive classification',
      },
      {
        code: 'SUR-03',
        phase: 'Under Survey',
        audience: 'Followers',
        type: 'Archive report',
        title: 'Thirty years of observation categories',
        purpose: 'Explain the priest’s recording method while separating belief from verifiable fact.',
        action: 'None',
        recovery: 'VOTE-01 archive priority',
      },
      {
        code: 'SUR-04',
        phase: 'Under Survey',
        audience: 'Public visitors',
        type: 'Test video',
        title: 'The first Unit produces a stable return',
        purpose: 'Prove that a historical tuning path can be preserved without overwriting it.',
        action: 'Review claim conditions',
        recovery: 'CLM-01 claim announcement',
      },
      {
        code: 'CLM-01',
        phase: 'Claim Open',
        audience: 'Public visitors',
        type: 'Collective notice',
        title: 'The Cologne Batch has reached claim conditions',
        purpose: 'Publish quantity, price, Pack plan, Console window, and recovery evidence.',
        action: 'Claim or continue following',
        recovery: 'HLD-01 holder registration',
      },
      {
        code: 'HLD-01',
        phase: 'Claim Open',
        audience: 'Holders',
        type: 'Holder onboarding',
        title: 'You have entered the Cologne recovery action',
        purpose: 'Confirm holder status, Unit assignment state, timeline, and first action.',
        action: 'Join VOTE-01',
        recovery: 'VOTE-01 result notice',
      },
      {
        code: 'VOTE-01',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Vote',
        title: 'Choose the first observation category to digitize',
        purpose: 'Let holders determine the order of the first public archive release.',
        action: 'Choose one option',
        recovery: 'RES-01 and the archive-stage Pack',
      },
      {
        code: 'RES-01',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Vote result',
        title: 'The first observation category enters digitization',
        purpose: 'Publish the result, execution decision, and its exact Pack form.',
        action: 'Review the archive sample',
        recovery: 'PACK-A dispatch notice',
      },
      {
        code: 'PACK-A',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Pack milestone',
        title: 'Numbering and observation archive',
        purpose: 'Dispatch number cards, inventory records, and authorized observation pages.',
        action: 'Verify the archive number',
        recovery: 'CAL-01 historical-path retest',
      },
      {
        code: 'CAL-01',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Calibration report',
        title: 'First comparison of old dial positions and current returns',
        purpose: 'Show how the Pack archive connects to the final Console.',
        action: 'None',
        recovery: 'CON-01 final calibration',
      },
      {
        code: 'CON-01',
        phase: 'Console Dispatch',
        audience: 'Holders',
        type: 'Pre-dispatch notice',
        title: 'Unit numbers and historical paths are matched',
        purpose: 'Resolve the core question and confirm address, contents, timing, and first start.',
        action: 'Confirm address',
        recovery: 'CON-02 dispatch notice',
      },
      {
        code: 'ACT-01',
        phase: 'Active in Field',
        audience: 'Holders',
        type: 'Field task',
        title: 'Retest signal categories recorded thirty years ago',
        purpose: 'Turn historical observation into a distributed long-term record.',
        action: 'Upload the first retest',
        recovery: 'Annual field summary',
      },
    ],
    votes: [
      {
        code: 'VOTE-01',
        question: 'Which anonymized observation category should be digitized first?',
        trigger: 'The archive is classified, but the first digitization pass can cover only one category.',
        options: [
          'A · Repeated locations and recurring figures',
          'B · Records the priest marked as “response” or “assistance”',
        ],
        fixed: 'Privacy, archive integrity, device safety, and committed Pack contents do not change.',
        result: 'The result appears in RES-01 and determines the first observation pages in the archive-stage Pack.',
      },
      {
        code: 'VOTE-02',
        question: 'Which dimension should the first field retest compare?',
        trigger: 'Before Console dispatch, the team must define the first cross-region record format.',
        options: [
          'A · Image differences at the same historical dial position',
          'B · Signal stability at the same category across different times',
        ],
        fixed: 'Device function, appearance, Unit assignment, and safety calibration do not change.',
        result: 'The result enters the first-start guide and determines the ACT-01 field task.',
      },
    ],
    avoid: [
      'Do not present the priest’s faith as a scientific truth proven by the device.',
      'Do not decorate the Console as a religious souvenir.',
      'Do not ask members to vote on whether a belief is true.',
    ],
    nextQuestions: [
      'The church and the priest’s identity',
      'How the devices entered the storeroom',
      'The most consequential entry in the observation archive',
      'The approved color and material specification',
    ],
  },
  {
    id: 'guizhou',
    index: '02',
    name: 'Guizhou Batch',
    workingTitle: 'The Companion Signal',
    location: 'Guizhou, China · city to be confirmed',
    period: 'Use period to be confirmed · discovered within the past year',
    emotionalCore: 'Companionship, growth, and absence',
    story:
      'The Collective found a group of visually identical Consoles in a charity shop in Guizhou. One Unit carries traces of long use by a local girl who can no longer be located. The team can restore the equipment, but it cannot write her life on her behalf. This action must use limited evidence to understand how a device accompanied someone through difficult years without turning her private history into spectacle.',
    engine:
      'Only one set of long-term use records points to a girl who cannot currently be contacted. The team must identify the relevant Unit and decide what may enter the public archive without exposing or inventing her identity.',
    palette: [],
    paletteStatus: 'Waiting for the approved color specification',
    moodAdvice: [
      'Use a higher overall value than the other two Batches so companionship first reads as ordinary and approachable.',
      'The color relationship can feel gentle, tactile, and lived-in without using dirt or fading as a shorthand for poverty.',
      'Keep material sheen restrained. Familiar touch and long placement should replace sentimental presentation.',
    ],
    visualDirection: [
      'Take evidence from the charity shop, the original device finish, and any verified protective packaging.',
      'Present the Console as a daily companion rather than an artifact of hardship.',
      'Do not place the girl’s name, likeness, or unauthorized handwriting on the device.',
    ],
    confirmed: [
      'The Batch was found in a charity shop in Guizhou.',
      'The shop contained a group of visually identical devices.',
      'At least one Unit belonged to or accompanied a local girl for an extended period.',
      'The girl cannot currently be contacted.',
    ],
    estimates: [
      'She may have lived in a charitable institution or received the device through a charitable network.',
      'The use records may cover several stages of her growth.',
      'The other Units may not have entered the shop through exactly the same route.',
    ],
    questions: [
      'What was her exact relationship to the institution, shop, and device?',
      'What evidence supports the claim of long-term use?',
      'Would she want to be located or have this history made public?',
      'Why did the devices converge in the same shop?',
    ],
    phases: [
      {
        label: 'Under Survey',
        objective: 'Verify provenance while defining an archive boundary that does not consume a private life.',
        contents: [
          'First field report: identical devices in a charity shop',
          'Provenance update: a repeated pattern of use times',
          'Archive Office notice: records that will remain private',
          'Test report: companion records and device recovery',
        ],
      },
      {
        label: 'Claim Open',
        objective: 'Open the Batch because recovery conditions are met, not because the personal story is emotional.',
        contents: [
          'Publish recoverable quantity and the real distribution plan',
          'State that holders will not receive private identity information',
          'Let members choose the first dimension of a future companion log',
        ],
      },
      {
        label: 'Distribution in Progress',
        objective: 'Move from anonymous circulation records into a new daily-life archive.',
        contents: [
          'Provenance stage: intake tag, anonymized circulation card, and field record',
          'Companion stage: tuning-time chart and collectively defined log sheet',
          'Console stage: Unit archive and first daily-record prompt',
        ],
      },
      {
        label: 'Active in Field',
        objective: 'Record how the Console enters the ordinary life of a new holder.',
        contents: [
          'Collect use records from ordinary daily settings',
          'Observe whether similar tuning patterns appear across regions',
          'If the original holder makes contact, let her determine how the archive changes',
        ],
      },
    ],
    contentMap: [
      {
        code: 'SUR-01',
        phase: 'Under Survey',
        audience: 'Public visitors',
        type: 'First field report',
        title: 'Identical devices in a charity shop',
        purpose: 'Establish the relationship among the shop, the devices, and charitable circulation.',
        action: 'Follow the Batch',
        recovery: 'SUR-02 provenance check',
      },
      {
        code: 'SUR-02',
        phase: 'Under Survey',
        audience: 'Followers',
        type: 'Provenance report',
        title: 'A repeated pattern of use times',
        purpose: 'State the evidence level for long-term use without filling in the girl’s biography.',
        action: 'None',
        recovery: 'SUR-03 privacy boundary',
      },
      {
        code: 'SUR-03',
        phase: 'Under Survey',
        audience: 'Public visitors',
        type: 'Archive Office notice',
        title: 'The records that will not be published',
        purpose: 'Define anonymization, contact attempts, and the ethical boundary of the public archive.',
        action: 'Review archive rules',
        recovery: 'All later content',
      },
      {
        code: 'SUR-04',
        phase: 'Under Survey',
        audience: 'Followers',
        type: 'Test report',
        title: 'Companion records and device recovery',
        purpose: 'Confirm whether long-term use patterns can survive restoration.',
        action: 'Review claim conditions',
        recovery: 'CLM-01 claim announcement',
      },
      {
        code: 'CLM-01',
        phase: 'Claim Open',
        audience: 'Public visitors',
        type: 'Collective notice',
        title: 'The Guizhou Batch has reached claim conditions',
        purpose: 'Publish quantity, price, Pack plan, and Console window using recovery facts.',
        action: 'Claim or continue following',
        recovery: 'HLD-01 holder registration',
      },
      {
        code: 'HLD-01',
        phase: 'Claim Open',
        audience: 'Holders',
        type: 'Holder onboarding',
        title: 'Begin a new companion archive',
        purpose: 'Explain privacy boundaries, timeline, and the first participation action.',
        action: 'Join VOTE-01',
        recovery: 'VOTE-01 result notice',
      },
      {
        code: 'VOTE-01',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Vote',
        title: 'Choose what the first companion log should record',
        purpose: 'Define the first non-sensitive dimension of the field archive.',
        action: 'Choose one option',
        recovery: 'RES-01 and the companion-stage Pack',
      },
      {
        code: 'RES-01',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Vote result',
        title: 'The companion log format is confirmed',
        purpose: 'Publish the result and show the final structure of the log sheet.',
        action: 'Preview the log sheet',
        recovery: 'PACK-A dispatch notice',
      },
      {
        code: 'PACK-A',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Pack milestone',
        title: 'Anonymous provenance and companion record',
        purpose: 'Dispatch an anonymized circulation card, tuning-time chart, and shared log sheet.',
        action: 'Create a personal record',
        recovery: 'RUN-01 continuous test',
      },
      {
        code: 'RUN-01',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Run test',
        title: 'Seven days of stable operation',
        purpose: 'Prove that the recovered equipment is ready to enter a new daily environment.',
        action: 'None',
        recovery: 'CON-01 pre-dispatch notice',
      },
      {
        code: 'CON-01',
        phase: 'Console Dispatch',
        audience: 'Holders',
        type: 'Pre-dispatch notice',
        title: 'Unit assignment and privacy review are complete',
        purpose: 'Confirm address, contents, window, and the first daily record.',
        action: 'Confirm address',
        recovery: 'CON-02 dispatch notice',
      },
      {
        code: 'ACT-01',
        phase: 'Active in Field',
        audience: 'Holders',
        type: 'Field task',
        title: 'Record the Console’s first week in daily life',
        purpose: 'Continue the theme of companionship rather than chasing anomalies.',
        action: 'Submit a one-week record',
        recovery: 'First-month field summary',
      },
    ],
    votes: [
      {
        code: 'VOTE-01',
        question: 'Which daily dimension should the first companion log prioritize?',
        trigger: 'The anonymized historical records primarily show patterns of use rather than private content.',
        options: [
          'A · Time of day and duration of Console use',
          'B · The room where the Console was placed and the ordinary activity taking place',
        ],
        fixed: 'The log will not collect private conversations, identity, address, or identifiable life details.',
        result: 'The result defines the log sheet and appears in the companion-stage Pack and ACT-01.',
      },
      {
        code: 'VOTE-02',
        question: 'Should the first field summary prioritize personal logs or shared patterns?',
        trigger: 'The first holders have completed one week of records, and the editorial focus must be chosen.',
        options: [
          'A · Short personal records published with explicit permission',
          'B · An anonymized comparison of shared use-time patterns',
        ],
        fixed: 'Personal material still requires individual permission; unapproved material remains aggregated.',
        result: 'The result determines the structure of the first-month field summary.',
      },
    ],
    avoid: [
      'Do not describe the girl as an orphan without evidence.',
      'Do not package hardship, disappearance, or charity as consumable tragedy.',
      'Do not manufacture a substitute ending if she cannot be found.',
    ],
    nextQuestions: [
      'The city and type of charity shop',
      'Evidence of the girl’s use of the device',
      'The boundary of material that may be published',
      'The original packaging and approved color specification',
    ],
  },
  {
    id: 'ash-market',
    index: '03',
    name: 'Ash Market Batch',
    workingTitle: 'Provenance Unresolved',
    location: 'Africa · country and city to be confirmed',
    period: 'Fire date to be confirmed · discovered within the past year',
    emotionalCore: 'Rumor, damage, and provenance',
    story:
      'At a secondhand market somewhere in Africa, the Collective found between a dozen and twenty visually identical Consoles marked by fire. A seller claimed that the devices once belonged to a princess, but the route from a burned site to the market has not been verified. The team must restore the equipment while separating evidence from a story that changes each time it is retold.',
    engine:
      'The only clue to the former holder is an unverified market story about a “princess.” While repairing heat damage, the team must reconstruct the chain of custody and decide which parts of the provenance can enter the official archive.',
    palette: [],
    paletteStatus: 'Waiting for the approved color specification',
    moodAdvice: [
      'Use a lower overall value and stronger material contrast so post-fire recovery comes from surfaces rather than a black filter.',
      'A bright accent should read as restored function, not as assumed royal luxury.',
      'Keep soot, oxidation, and new repair material visibly distinct rather than aestheticizing all damage as vintage wear.',
    ],
    visualDirection: [
      'Identify the country, city, market, and local material evidence before finalizing the visual direction.',
      'Take color evidence from actual heat change, soot, oxidation, and repair material.',
      'Do not add generic “African” patterns or royal insignia before the provenance is verified.',
    ],
    confirmed: [
      'The Batch came from a secondhand market somewhere in Africa.',
      'The field estimate is between a dozen and twenty Units; exact inventory is incomplete.',
      'The devices are visually identical and are connected to clearance from a fire-damaged site.',
      'A market story claims that a “princess” once owned them.',
    ],
    estimates: [
      'Some housings, circuits, or screens may have sustained heat and smoke damage.',
      'The Units may have belonged to one residence, institution, or collection.',
      '“Princess” may indicate a formal title, a local form of address, or a seller’s story.',
    ],
    questions: [
      'What are the country, city, market, and discovery date?',
      'Where and when did the fire occur?',
      'What is the chain of custody from the clearance site to the market?',
      'Is there independent evidence for the “princess” claim?',
    ],
    phases: [
      {
        label: 'Under Survey',
        objective: 'Advance safe inventory, fire-damage recovery, and provenance verification together.',
        contents: [
          'First field report: a grouped set of devices in the market',
          'Inventory update: heat-damage grades and exact quantity',
          'Provenance report: how the market story developed',
          'Repair test: the first stable group return',
        ],
      },
      {
        label: 'Claim Open',
        objective: 'Support a claim decision with recoverable quantity and explicit evidence status.',
        contents: [
          'Separate verified, unsupported, and disproven provenance claims',
          'Identify original fire-damaged parts that cannot be reused',
          'Let holders choose which chain-of-custody segment is investigated first',
        ],
      },
      {
        label: 'Distribution in Progress',
        objective: 'Make provenance research and safe restoration produce visible results together.',
        contents: [
          'Market stage: inventory tag, provenance map, and damage record',
          'Repair stage: material note, safety test, and investigation result',
          'Console stage: Unit repair archive and first-start instructions',
        ],
      },
      {
        label: 'Active in Field',
        objective: 'Move the equipment beyond market rumor into a shared, verifiable operating history.',
        contents: [
          'Compare signal stability across restored Units',
          'Continue collecting lawful provenance evidence',
          'If the royal story is disproven, record the correction as a formal result',
        ],
      },
    ],
    contentMap: [
      {
        code: 'SUR-01',
        phase: 'Under Survey',
        audience: 'Public visitors',
        type: 'First field report',
        title: 'A grouped set of devices in the secondhand market',
        purpose: 'Establish the specific market, quantity range, and fire-damage facts.',
        action: 'Follow the Batch',
        recovery: 'SUR-02 damage inventory',
      },
      {
        code: 'SUR-02',
        phase: 'Under Survey',
        audience: 'Followers',
        type: 'Safety report',
        title: 'Heat-damage grading and exact inventory',
        purpose: 'Separate testable Units from those requiring disassembly or isolation.',
        action: 'Review damage grades',
        recovery: 'SUR-04 repair test',
      },
      {
        code: 'SUR-03',
        phase: 'Under Survey',
        audience: 'Public visitors',
        type: 'Provenance investigation',
        title: 'How the “princess” story developed',
        purpose: 'Separate seller account, clearance testimony, and independent records.',
        action: 'None',
        recovery: 'VOTE-01 investigation priority',
      },
      {
        code: 'SUR-04',
        phase: 'Under Survey',
        audience: 'Followers',
        type: 'Repair video',
        title: 'The first restored group produces a stable return',
        purpose: 'Show the safe repair process and the uniform appearance rule.',
        action: 'Review claim conditions',
        recovery: 'CLM-01 claim announcement',
      },
      {
        code: 'CLM-01',
        phase: 'Claim Open',
        audience: 'Public visitors',
        type: 'Collective notice',
        title: 'The Ash Market Batch has reached claim conditions',
        purpose: 'Publish recoverable quantity, price, Pack plan, Console window, and provenance status.',
        action: 'Claim or continue following',
        recovery: 'HLD-01 holder registration',
      },
      {
        code: 'HLD-01',
        phase: 'Claim Open',
        audience: 'Holders',
        type: 'Holder onboarding',
        title: 'Join the provenance and recovery action',
        purpose: 'Confirm the timeline, safety boundaries, and first investigation action.',
        action: 'Join VOTE-01',
        recovery: 'VOTE-01 result notice',
      },
      {
        code: 'VOTE-01',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Vote',
        title: 'Choose the next chain-of-custody segment to verify',
        purpose: 'Set investigation priority without allowing a vote to decide historical fact.',
        action: 'Choose one option',
        recovery: 'RES-01 provenance result',
      },
      {
        code: 'RES-01',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Vote result',
        title: 'The selected provenance route completes first review',
        purpose: 'Publish evidence, disproven claims, and remaining gaps.',
        action: 'Review the evidence chain',
        recovery: 'PACK-A provenance archive',
      },
      {
        code: 'PACK-A',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Pack milestone',
        title: 'Market provenance and fire-damage archive',
        purpose: 'Dispatch the provenance map, damage grade, and material note.',
        action: 'Verify the Unit repair archive',
        recovery: 'SAFE-01 safety retest',
      },
      {
        code: 'SAFE-01',
        phase: 'Distribution in Progress',
        audience: 'Holders',
        type: 'Safety report',
        title: 'Replacement components complete continuous-load testing',
        purpose: 'Prove that fire recovery does not compromise final operating safety.',
        action: 'None',
        recovery: 'CON-01 pre-dispatch notice',
      },
      {
        code: 'CON-01',
        phase: 'Console Dispatch',
        audience: 'Holders',
        type: 'Pre-dispatch notice',
        title: 'Uniform restoration and Unit archives are complete',
        purpose: 'Confirm address, contents, timing, and first-start safety steps.',
        action: 'Confirm address',
        recovery: 'CON-02 dispatch notice',
      },
      {
        code: 'ACT-01',
        phase: 'Active in Field',
        audience: 'Holders',
        type: 'Field task',
        title: 'Record whether pre-fire signals return',
        purpose: 'Use field evidence to continue provenance work without promising an identity resolution.',
        action: 'Upload the first signal record',
        recovery: 'Quarterly provenance review',
      },
    ],
    votes: [
      {
        code: 'VOTE-01',
        question: 'Which segment should the next provenance investigation prioritize?',
        trigger: 'The team has both a fire-site lead and market testimony, but can advance only one first.',
        options: [
          'A · Fire location, building archive, and clearance record',
          'B · Chain of custody among clearers, dealers, and the market seller',
        ],
        fixed: 'The vote determines investigation order, not whether the “princess” story is true.',
        result: 'The result appears in RES-01 and determines the main archive in the provenance-stage Pack.',
      },
      {
        code: 'VOTE-02',
        question: 'Should the first field report prioritize signals or provenance?',
        trigger: 'After recovery, holders can support two long-term archive directions.',
        options: [
          'A · Compare the first signal stability of each Unit',
          'B · Organize new lawful evidence and testimony',
        ],
        fixed: 'Safety maintenance continues, and neither line of inquiry is permanently closed.',
        result: 'The result determines the main line of the first quarterly field report.',
      },
    ],
    avoid: [
      'Do not treat Africa as one place or one visual style.',
      'Do not present the “princess” as fact before independent evidence exists.',
      'Do not romanticize fire damage or invent casualties and disaster scale.',
    ],
    nextQuestions: [
      'The country, city, and market',
      'The fire date and clearance site',
      'The first verifiable witness in the chain of custody',
      'The safe recovery specification for heat-damaged components',
    ],
  },
]
