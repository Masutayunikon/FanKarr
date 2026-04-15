import { DATA_DIR } from '../config.js'
import path from 'path'
import fs from 'fs'

const GITHUB_BASE = process.env.GITHUB_BASE
    ?? 'https://raw.githubusercontent.com/masutayunikon/fankarr-scraper/main'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000

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

export async function githubGet(urlPath: string): Promise<any> {
    const cached = cacheGet(urlPath)
    if (cached) return cached
    const res = await fetch(`${GITHUB_BASE}/${urlPath}`)
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${urlPath}`)
    const data = await res.json()
    cacheSet(urlPath, data)
    return data
}

export async function readAvailable(): Promise<number[]> {
    try { return await githubGet('available.json') as number[] }
    catch { return [] }
}

export async function readInfohashMap(): Promise<Record<string, string>> {
    try { return await githubGet('infohash_map.json') as Record<string, string> }
    catch { return {} }
}

export async function readSerieData(serieId: number): Promise<any | null> {
    try { return await githubGet(`series/${serieId}.json`) }
    catch { return null }
}

export async function loadEnrichedSeriesData(): Promise<any[]> {
    const ids   = await readAvailable()
    const allSd = await Promise.all(ids.map(id => readSerieData(id)))
    return allSd.filter(Boolean)
}

export function loadOrganized(): Record<string, Record<string, any>> {
    try {
        const p = path.join(DATA_DIR, 'organized.json')
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {}
    return {}
}
