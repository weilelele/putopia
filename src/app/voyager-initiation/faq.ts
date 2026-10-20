export const INITIATION_FAQ = [
  {
    "question": "Is this a subscription?",
    "answer": "No. Initiation is a one-time membership payment of $520, with no renewal fees. Future devices, activities and other optional offerings may be sold separately."
  },
  {
    "question": "Is a Console included?",
    "answer": "Yes. Initiation includes one Console claim, with no additional device payment. Choose an available batch on the Device page. If a batch is full, you can choose another available batch or wait. Your unclaimed entitlement is preserved."
  },
  {
    "question": "Can I change my Console batch?",
    "answer": "You can request a batch change before your Console ships, subject to availability. Once shipped, the batch cannot be changed. Console Holder access begins after you receive and bind your Console to your account."
  },
  {
    "question": "When will my packs ship?",
    "answer": "The four S26 packs are planned to ship in October, November and December 2026, then January 2027. These are planned shipping months, not guaranteed arrival dates. The Console is Pack 3. No S26 packs have shipped yet."
  },
  {
    "question": "Where do you ship?",
    "answer": "We ship to the contiguous 48 US states and Washington, DC. Shipping and applicable taxes are included. Enter your delivery address at checkout."
  },
  {
    "question": "I already bought the $12 Initial Pack. What changes?",
    "answer": "You can complete Initiation for $400—a $120 discount. Until then, you keep Intel access, member voting and your first two packs. Completing Initiation adds the Console claim and fourth pack."
  },
  {
    "question": "How are refunds calculated?",
    "answer": "For refunds, your Initiation payment is divided equally across the four packs—25% per pack. A pack is fulfilled when handed to the carrier. Unshipped packs are refundable. Partial refunds retain Intel and member voting access; a full refund removes the benefits of this Initiation payment. Your original $12 Initial Pack benefits remain separate."
  }
] as const

export const INITIATION_BUNDLE_FAQ = [
  { question: 'Is this a subscription?', answer: 'No. Initial costs $48 and Complete costs $520, paid once with no recurring membership fee. Both include classified intel, member-only votes and publishing in the Voyager Feed.' },
  { question: 'Is a Console included?', answer: 'Complete includes Packs 1–4, including one Console claim. Initial includes the welcome letter, member badge and Mysterious Widgets (Packs 1–2), without a Console.' },
  { question: 'Can I upgrade later?', answer: 'Members who paid $48 for Initial can add Console + Pack 4 for $500. The two purchases total $548; Complete saves $28.' },
  { question: 'I already bought the $12 Initial Pack. What changes?', answer: 'Your existing first two Packs and member access remain. Your historical upgrade price stays $400. The $500 upgrade applies to new $48 Initial Pack buyers.' },
  ...INITIATION_FAQ.filter(item => ['Can I change my Console batch?', 'When will my packs ship?', 'Where do you ship?'].includes(item.question)),
  { question: 'How are refunds calculated?', answer: 'The original $520 and historical $400 refund rules remain. For a $48 Initial purchase or a $500 upgrade, cancellation refunds are allocated across the two Packs included in that purchase. Refunding an upgrade does not cancel a separately paid Initial membership. See Delivery & aftercare for details.' },
] as const
