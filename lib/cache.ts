type CacheEntry = { data: unknown; expiresAt: number }

const store = new Map<string, CacheEntry>()

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { store.delete(key); return null }
  return entry.data as T
}

export function cacheSet(key: string, data: unknown, ttlMs: number) {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function cacheInvalidate(...prefixes: string[]) {
  for (const key of store.keys()) {
    if (prefixes.some(p => key.includes(p))) store.delete(key)
  }
}

/** Fetch with cache. Returns cached data if fresh, otherwise fetches and caches. */
export async function cachedFetch<T>(
  url: string,
  ttlMs: number,
  init?: RequestInit
): Promise<T> {
  const cached = cacheGet<T>(url)
  if (cached !== null) return cached
  const res = await fetch(url, init)
  if (!res.ok) return [] as unknown as T
  const data: T = await res.json()
  cacheSet(url, data, ttlMs)
  return data
}
