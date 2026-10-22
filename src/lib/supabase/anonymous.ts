import { AuthSessionMissingError, type SupabaseClient, type User } from '@supabase/supabase-js'

/**
 * Anonymous Auth users exist only to buy Initiation before registering. App
 * code treats them as logged out unless a purchase-path caller opts in;
 * schema_v108 applies the same rule to direct database access.
 */
export function isAnonymousUser(user: Pick<User, 'is_anonymous'> | null | undefined): boolean {
  return user?.is_anonymous === true
}

/** Make `auth.getUser()` report no session for an anonymous user. */
export function hideAnonymousUser<T extends Pick<SupabaseClient, 'auth'>>(client: T): T {
  const getUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = async (jwt?: string) => {
    const result = await getUser(jwt)
    return isAnonymousUser(result.data.user)
      ? { data: { user: null }, error: new AuthSessionMissingError() }
      : result
  }
  return client
}
