// Purchase terms confirmed for Kyoto One. Do not extend to future batches implicitly.
export const DEVICE_SUPPORT_EMAIL = 'voyagers@multiverseco.org'
export const KYOTO_PURCHASE_TERMS = {
  shipping: 'All three shipments, shipping, and taxes are included in the $520 total.',
  cancellation: 'Cancel for a full refund before your first package is delivered. After delivery, cancellation and change-of-mind returns are unavailable for the entire order, including remaining shipments.',
  timing: 'This is a preorder. Dispatch dates for all three shipments are not yet confirmed.',
}

export const KYOTO_PURCHASE_FAQ: Record<string, string> = {
  'Is this a preorder, and what does $520 cover?': `Yes. US$520 is the full preorder price for one assigned Multiverse Console (Kyoto One Batch) and all three shipments, including shipping and taxes. The full amount is collected when you claim; it is not a deposit or a recurring subscription. The Console arrives in the third shipment.`,
  'What about shipping destinations, shipping costs and taxes?': `${KYOTO_PURCHASE_TERMS.shipping} The destinations currently supported are shown in checkout.`,
  'What are the cancellation, return and support terms?': `${KYOTO_PURCHASE_TERMS.cancellation} To request cancellation or get help with your order, delivery, or device, email ${DEVICE_SUPPORT_EMAIL} with your order number. For damaged, incorrect, or missing items, contact us for support.`,
}
