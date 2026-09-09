'use client'

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

const rememberedValues = new Map<string, unknown>()

/** Preserve non-sensitive view preferences while route components unmount. */
export function useRememberedState<T>(
  key: string,
  initialValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (rememberedValues.has(key)) return rememberedValues.get(key) as T
    return typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue
  })

  const setRememberedValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue((current) => {
      const resolved = typeof next === 'function'
        ? (next as (previous: T) => T)(current)
        : next
      rememberedValues.set(key, resolved)
      return resolved
    })
  }, [key])

  return [value, setRememberedValue]
}
