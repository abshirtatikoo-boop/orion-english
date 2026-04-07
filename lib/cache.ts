// Simple in-memory cache — persists across tab switches (single SPA session)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store: Record<string, { data: any; time: number }> = {}

export function getCached<T>(key: string, maxAgeMs = 30_000): T | null {
  const item = store[key]
  if (item && Date.now() - item.time < maxAgeMs) return item.data as T
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setCache(key: string, data: any): void {
  store[key] = { data, time: Date.now() }
}

export function invalidateCache(key: string): void {
  delete store[key]
}
