/** Prototype only: permissions must also be enforced by the server before production. */
export type Role = 'guest' | 'unregistered' | 'applicant' | 'voyager' | 'architect'
export type Actor = { id: string; name: string; role: Role; avatar?: string; location: string }
export type Entry = { id: string; author: Actor; text: string; time: string; image?: string; likes: string[]; replies: Entry[]; edited?: boolean }
export const actors: Record<Role, Actor> = {
  guest: { id: '', name: 'Guest', role: 'guest', location: '' },
  unregistered: { id: 'unregistered-demo', name: 'New account', role: 'unregistered', location: '' },
  applicant: { id: 'applicant-demo', name: 'Alex Chen', role: 'applicant', location: 'Shanghai, China' },
  voyager: { id: 'voyager-demo', name: 'You', role: 'voyager', location: 'Shanghai, China' },
  architect: { id: 'architect-demo', name: 'Studio Team', role: 'architect', location: 'Kyoto, Japan' },
}
export const ryo: Actor = { id: 'ryo', name: 'Ryo Tanaka', role: 'architect', avatar: '/prototypes/voyager-feed/ryo-v1.png', location: 'Kyoto, Japan' }
export const maren: Actor = { id: 'maren', name: 'Maren Solberg', role: 'voyager', avatar: '/prototypes/voyager-feed/maren-v1.png', location: 'Oslo, Norway' }
export const canPost = (role: Role) => role === 'voyager' || role === 'architect'
export const canReadFeed = (role: Role) => ['applicant', 'voyager', 'architect'].includes(role)
export const visibleFeed = (role: Role, entries: Entry[]) => canReadFeed(role) ? entries : []
export const canInteract = canReadFeed
export const canManage = (actor: Actor, entry: Entry) => canInteract(actor.role) && actor.id === entry.author.id
export const samplePosts = (): Entry[] => [
  { id: 'shore', author: ryo, text: 'The same shoreline, a different sky. Anyone else notice this today?', time: '12m', image: '/prototypes/voyager-feed/coast-v1.png', likes: ['maren', 'demo1', 'demo2', 'demo3', 'demo4', 'demo5', 'demo6', 'demo7'], replies: [
    { id: 'reply1', author: maren, text: 'Yes — the light was completely different yesterday.', time: '8m', likes: [], replies: [] },
    { id: 'reply2', author: actors.applicant, text: 'This is beautiful. Does the shoreline change often?', time: '5m', likes: [], replies: [] },
    { id: 'reply3', author: ryo, text: 'Alex, every session has a small surprise.', time: '2m', likes: [], replies: [] },
  ] },
  { id: 'tonight', author: maren, text: 'Anyone observing tonight? I would love to compare notes.', time: '1h', likes: ['ryo', 'demo1', 'demo2', 'demo3'], replies: [] },
  { id: 'own', author: actors.voyager, text: 'Clouds cleared here at last. The sky never gets old.', time: '3h', likes: ['ryo'], replies: [] },
]
