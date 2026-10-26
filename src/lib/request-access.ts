/**
 * Where every in-app REQUEST ACCESS / sign-up button sends a cold visitor:
 * straight to the email step of /new, skipping the onboarding questions.
 * Bare /new (ad traffic forwarded from `/?utm_…`) still opens on question 1.
 */
export const REQUEST_ACCESS_HREF = '/new?step=cta'
