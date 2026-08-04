'use server'

import { redirect } from 'next/navigation'
import { grantDeckAccess, isValidDeckPassword } from './auth'

export async function unlockInvestorDeck(formData: FormData) {
  const password = formData.get('password')
  const requestedReturnTo = formData.get('returnTo')
  const returnTo = requestedReturnTo === '/public-info' ? '/public-info' : '/investor-deck'

  if (typeof password !== 'string' || !isValidDeckPassword(password)) {
    redirect(`${returnTo}?error=1`)
  }

  await grantDeckAccess()
  redirect(returnTo)
}
