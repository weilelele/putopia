import { beforeEach, describe, expect, it, vi } from 'vitest'

const external = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => external)
vi.mock('server-only', () => ({}))

import { requirePublishingArchitect, resolvePublishingIdentity } from './publishing-identity'

function profileQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

beforeEach(() => vi.clearAllMocks())

describe('managed publishing identities', () => {
  it('only authenticates human architects', async () => {
    external.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'architect-1' } } }) },
    })
    const query = profileQuery({ display_name: 'Ari', role: 'architect', account_kind: 'npc' })
    external.createAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(query) })

    await expect(requirePublishingArchitect()).resolves.toBeNull()
  })

  it('uses the architect when no alternate identity is selected', async () => {
    const actor = { id: 'architect-1', name: 'Ari', role: 'architect' as const }
    await expect(resolvePublishingIdentity(null, actor)).resolves.toEqual(actor)
    expect(external.createAdminClient).not.toHaveBeenCalled()
  })

  it('requires every newly selected alternate identity to be an NPC', async () => {
    const actor = { id: 'architect-1', name: 'Ari', role: 'architect' as const }
    const query = profileQuery({ id: 'npc-1', display_name: 'Nova', role: 'guest', account_kind: 'npc' })
    external.createAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(query) })

    await expect(resolvePublishingIdentity('npc-1', actor)).resolves.toEqual({
      id: 'npc-1', name: 'Nova', role: 'guest',
    })
    expect(query.eq).toHaveBeenCalledWith('account_kind', 'npc')
  })

  it('rejects a real player returned for a new alternate selection', async () => {
    const actor = { id: 'architect-1', name: 'Ari', role: 'architect' as const }
    const query = profileQuery({ id: 'human-1', display_name: 'Player', role: 'voyager', account_kind: 'human' })
    external.createAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(query) })

    await expect(resolvePublishingIdentity('human-1', actor)).rejects.toThrow(
      'Only NPC identities can be selected for publishing.',
    )
  })

  it('preserves an unchanged legacy attribution without making it selectable elsewhere', async () => {
    const actor = { id: 'architect-1', name: 'Ari', role: 'architect' as const }
    const query = profileQuery({ id: 'human-1', display_name: 'Legacy', role: 'voyager', account_kind: 'human' })
    external.createAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(query) })

    await expect(resolvePublishingIdentity('human-1', actor, 'human-1')).resolves.toEqual({
      id: 'human-1', name: 'Legacy', role: 'voyager',
    })
    expect(query.eq).not.toHaveBeenCalledWith('account_kind', 'npc')
  })
})
