// Purchase terms confirmed for Kyoto One. Do not extend to future batches implicitly.
export const DEVICE_SUPPORT_EMAIL = 'voyagers@multiverseco.org'
export const KYOTO_PURCHASE_TERMS = {
  shipping: 'All three shipments, shipping, and taxes are included in the $520 total.',
  cancellation: 'Cancel for a full refund before your first package is delivered. After delivery, cancellation and change-of-mind returns are unavailable for the entire order, including remaining shipments.',
  timing: 'This is a preorder. Dispatch dates for all three shipments are not yet confirmed.',
}

export const KYOTO_PURCHASE_FAQ = [
  {
    question: 'What does the US$520 preorder include?',
    answer: 'One assigned Kyoto One Console and three shipments: an Initial Voyager Pack, an antenna with smaller widgets and components, and the Console. Shipping and taxes are included. The full amount is collected when you claim; it is not a deposit or subscription. Earlier $12 Initial Pack orders remain separate and will still be delivered.',
  },
  {
    question: 'When will the three packages ship?',
    answer: 'This is a preorder. The packages will be dispatched separately, in order, and their dispatch dates are not yet confirmed. Timing updates will be posted in this batch record.',
  },
  {
    question: 'What are the shipping and tax terms?',
    answer: `${KYOTO_PURCHASE_TERMS.shipping} The destinations currently supported are shown in checkout.`,
  },
  {
    question: 'Are these images of my assigned unit?',
    answer: 'No. The gallery includes an original device design reference and AI-generated warehouse visualizations. They show the design and setting, not the condition or serial number of an individual unit.',
  },
  {
    question: 'What are the cancellation, return and support terms?',
    answer: `${KYOTO_PURCHASE_TERMS.cancellation} To request cancellation or get help with your order, delivery, or device, email ${DEVICE_SUPPORT_EMAIL} with your order number. For damaged, incorrect, or missing items, contact us for support.`,
  },
]
