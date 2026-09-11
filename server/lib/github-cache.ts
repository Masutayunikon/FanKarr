import { DATA_DIR } from '../config.js'
import path from 'path'
import fs from 'fs'

const GITHUB_BASE =
  process.env.GITHUB_BASE?.trim() ||
  'https://raw.githubusercontent.com/masutayunikon/fankarr-scraper/main'

const CACHE_TTL_MS = 1 * 60 * 60 * 1000

interface CacheEntry<T> { data: T; expiresAt: number }
const _cache = new Map<string, CacheEntry<any>>()

export function cacheGet<T>(key: string): T | null {
    const entry = _cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) { _cache.delete(key); return null }
    return entry.data as T
}

export function cacheSet<T>(key: string, data: T): void {
    _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

export function cacheClear(): void { _cache.clear() }

export function cacheSize(): number { return _cache.size }

/**
 * @param force  Ignore le cache mémoire ET le cache CDN de raw.githubusercontent
 *               (~5 min).
 */
export async function githubGet(urlPath: string, force = false): Promise<any> {
    if (!force) {
        const cached = cacheGet(urlPath)
        if (cached) return cached
    }
    const url  = force ? `${GITHUB_BASE}/${urlPath}?_=${Date.now()}` : `${GITHUB_BASE}/${urlPath}`
    const init = force ? { cache: 'no-store' as const, headers: { 'Cache-Control': 'no-cache' } } : undefined
    const res  = await fetch(url, init)
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${urlPath}`)
    const data = await res.json()
    cacheSet(urlPath, data)
    return data
}

export async function readAvailable(force = false): Promise<number[]> {
    try { return await githubGet('available.json', force) as number[] }
    catch { return [] }
}

export async function readInfohashMap(force = false): Promise<Record<string, string>> {
    try { return await githubGet('infohash_map.json', force) as Record<string, string> }
    catch { return {} }
}

export async function readSerieData(serieId: number, force = false): Promise<any | null> {
    try { return await githubGet(`series/${serieId}.json`, force) }
    catch { return null }
}

export async function loadEnrichedSeriesData(force = false): Promise<any[]> {
    const ids   = await readAvailable(force)
    const allSd = await Promise.all(ids.map(id => readSerieData(id, force)))
    return allSd.filter(Boolean)
}

export function loadOrganized(): Record<string, Record<string, any>> {
    try {
        const p = path.join(DATA_DIR, 'organized.json')
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {}
    return {}
}
