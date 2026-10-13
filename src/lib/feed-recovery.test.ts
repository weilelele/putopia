import { describe, it, expect, vi } from 'vitest'
import { boundedFeedRequest, FEED_DRAFT_PREFIX, FeedRequestTimeout, parseFeedDraft, syncFeedDraftAccount, type FeedDraft } from './feed-recovery'
const now = 100000000
const draft: FeedDraft = {id:'10000000-0000-4000-8000-000000000001',authorId:'10000000-0000-4000-8000-000000000002',body:'Keep this thought',updated:now,pending:false}
describe('feed draft recovery',()=>{
  it('restores body, actor and original request identity',()=>expect(parseFeedDraft(JSON.stringify(draft),now)).toEqual(draft))
  it('expires ordinary drafts after 24 hours but keeps unknown operations',()=>{
    expect(parseFeedDraft(JSON.stringify(draft),now+86400001)).toBeNull()
    expect(parseFeedDraft(JSON.stringify({...draft,pending:true}),now+86400001)?.id).toBe(draft.id)
  })
  it.each(['broken','null',JSON.stringify({...draft,id:'bad'}),JSON.stringify({...draft,body:'x'.repeat(501)}),JSON.stringify({...draft,attachment:{name:'photo.jpg',size:2,hash:'bad'}})])('rejects damaged payload %s',raw=>expect(parseFeedDraft(raw,now)).toBeNull())
  it('clears drafts on account changes and logout, without clearing unrelated preferences',()=>{
    const data = new Map<string,string>()
    const storage: Storage = {get length(){return data.size},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v)},removeItem:k=>{data.delete(k)},clear:()=>data.clear()}
    storage.setItem('batch','S2');syncFeedDraftAccount(storage,'alice');storage.setItem(FEED_DRAFT_PREFIX+'alice:reply:one','draft')
    syncFeedDraftAccount(storage,'alice');expect(data.has(FEED_DRAFT_PREFIX+'alice:reply:one')).toBe(true)
    syncFeedDraftAccount(storage,'bob');expect(data.has(FEED_DRAFT_PREFIX+'alice:reply:one')).toBe(false)
    storage.setItem(FEED_DRAFT_PREFIX+'bob:compose','draft');syncFeedDraftAccount(storage,null)
    expect(data.has(FEED_DRAFT_PREFIX+'bob:compose')).toBe(false);expect(storage.getItem('batch')).toBe('S2')
  })
  it('tolerates blocked browser storage',()=>expect(()=>syncFeedDraftAccount({getItem:()=>{throw new Error('blocked')}} as unknown as Storage,'alice')).not.toThrow())
})
describe('bounded network results',()=>{
  it('returns a confirmed response without waiting for its deadline',async()=>expect(await boundedFeedRequest(Promise.resolve('confirmed'),10)).toBe('confirmed'))
  it('times out a hanging request and ignores its eventual success',async()=>{
    vi.useFakeTimers()
    try {
      let finish!:(value:string)=>void
      const promise=boundedFeedRequest(new Promise<string>(resolve=>{finish=resolve}),100)
      const assertion=expect(promise).rejects.toBeInstanceOf(FeedRequestTimeout)
      await vi.advanceTimersByTimeAsync(100);await assertion;finish('late success')
      await expect(promise).rejects.toBeInstanceOf(FeedRequestTimeout)
    } finally {vi.useRealTimers()}
  })
  it('preserves an explicit network rejection',async()=>await expect(boundedFeedRequest(Promise.reject(new Error('offline')),100)).rejects.toThrow('offline'))
})
