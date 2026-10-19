import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tiny data-fetching layer: cached reads keyed by string, and invalidation by
 * key prefix after a write. Enough for an admin; swap for TanStack Query later
 * without touching the screens' call sites (useQuery / useMutation).
 */

type Listener = () => void
const cache = new Map<string, unknown>()
const listeners = new Map<string, Set<Listener>>()

export function invalidate(...prefixes: string[]) {
  for (const key of [...cache.keys()]) if (prefixes.some((p) => key.startsWith(p))) cache.delete(key)
  for (const [key, set] of listeners) if (prefixes.some((p) => key.startsWith(p))) set.forEach((fn) => fn())
}

export interface QueryState<T> {
  data: T | undefined
  error: unknown
  loading: boolean
  refetch: () => void
}

export function useQuery<T>(key: string, fn: () => Promise<T>, options: { enabled?: boolean; refreshMs?: number } = {}): QueryState<T> {
  const { enabled = true, refreshMs } = options
  const [data, setData] = useState<T | undefined>(() => cache.get(key) as T | undefined)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(!cache.has(key) && enabled)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const keyRef = useRef(key)
  keyRef.current = key

  const run = useCallback((silent = false) => {
    const requested = keyRef.current
    if (!silent) setLoading(!cache.has(requested))
    fnRef.current().then(
      (value) => {
        cache.set(requested, value)
        if (keyRef.current === requested) { setData(value); setError(null); setLoading(false) }
      },
      (err) => { if (keyRef.current === requested) { setError(err); setLoading(false) } },
    )
  }, [])

  useEffect(() => {
    if (!enabled) return
    setData(cache.get(key) as T | undefined)
    run()
    const set = listeners.get(key) ?? new Set()
    const listener = () => run(true)
    set.add(listener)
    listeners.set(key, set)
    return () => { set.delete(listener) }
  }, [key, enabled, run])

  useEffect(() => {
    if (!refreshMs || !enabled) return
    const id = setInterval(() => run(true), refreshMs)
    return () => clearInterval(id)
  }, [refreshMs, enabled, run])

  return { data, error, loading, refetch: () => run() }
}

export function useMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false)
  const run = useCallback(async (...args: A): Promise<R> => {
    setPending(true)
    try { return await fn(...args) } finally { setPending(false) }
  }, [fn])
  return { run, pending }
}
