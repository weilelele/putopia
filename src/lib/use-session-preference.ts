'use client'
import { useCallback, useMemo, useSyncExternalStore, type SetStateAction } from 'react'
const memory = new Map<string, string>()
const EVENT = 'mc:preference'
function read(key: string) { try { return sessionStorage.getItem(key) ?? memory.get(key) ?? null } catch { return memory.get(key) ?? null } }
/** View preferences only. Never store private content, permissions or mutation state. */
export function useSessionPreference<T extends string | null>(key: string, fallback: T): [T, (next: SetStateAction<T>) => void] {
  const subscribe = useCallback((notify: () => void) => { window.addEventListener(EVENT, notify); return () => window.removeEventListener(EVENT, notify) }, [])
  const snapshot = useCallback(() => read(key), [key])
  const raw = useSyncExternalStore(subscribe, snapshot, () => null)
  const value = useMemo(() => { try { const parsed: unknown = raw === null ? fallback : JSON.parse(raw); return typeof parsed === 'string' || (parsed === null && fallback === null) ? parsed as T : fallback } catch { return fallback } }, [raw, fallback])
  const setValue = useCallback((next: SetStateAction<T>) => {
    const result = typeof next === 'function' ? (next as (current: T) => T)(value) : next
    const serialized = JSON.stringify(result)
    memory.set(key, serialized)
    try { sessionStorage.setItem(key, serialized) } catch { /* Session-only memory fallback. */ }
    window.dispatchEvent(new Event(EVENT))
  }, [key, value])
  return [value, setValue]
}
