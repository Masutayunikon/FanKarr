/** Surveillance : envoie au client les épisodes dont le torrent est publié après activation (toutes les 6 h). */

import path from 'path'
import fs   from 'fs'
import { DATA_DIR } from '../config.js'
import { logger }   from '../logger.js'
import { readInfohashMap }                         from './github-cache.js'
import { loadCatalogStatus }                       from './serie-helpers.js'
import { dispatchDownload, dispatchList }          from '../torrent-clients/index.js'
import { readSettings }                            from '../settings.js'

// ── Types ─────────────────────────────────────────────────────

export interface SyncedSerie {
    serieId  : number
    serieName: string
    addedAt  : string   // date ISO d'activation de la surveillance
}

type SyncedMap = Record<number, SyncedSerie>

// ── Persistance ───────────────────────────────────────────────

const SYNC_FILE = path.join(DATA_DIR, 'rss-synced.json')

export function loadSynced(): SyncedMap {
    try {
        if (fs.existsSync(SYNC_FILE))
            return JSON.parse(fs.readFileSync(SYNC_FILE, 'utf-8')) as SyncedMap
    } catch {}
    return {}
}

function saveSynced(map: SyncedMap): void {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(SYNC_FILE, JSON.stringify(map, null, 2), 'utf-8')
}

export function setSync(serieId: number, serieName: string, enabled: boolean): SyncedMap {
    const map = loadSynced()
    if (enabled) {
        map[serieId] = { serieId, serieName, addedAt: new Date().toISOString() }
    } else {
        delete map[serieId]
    }
    saveSynced(map)
    return map
}

// Une série déjà surveillée garde sa date d'activation
export function setSyncBulk(series: { id: number; name: string }[], enabled: boolean): { changed: number; map: SyncedMap } {
    const map = loadSynced()
    let changed = 0
    for (const { id, name } of series) {
        if (enabled && !map[id]) { map[id] = { serieId: id, serieName: name, addedAt: new Date().toISOString() }; changed++ }
        if (!enabled && map[id]) { delete map[id]; changed++ }
    }
    if (changed > 0) saveSynced(map)
    return { changed, map }
}

export function isSynced(serieId: number): boolean {
    return !!loadSynced()[serieId]
}

const normalizeName = (name: string) =>
    name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Série recréée sous un nouvel ID et même nom : la surveillance suit ; renvoie celles sans série
export function reconcileSynced(catalog: any[]): SyncedSerie[] {
    const map     = loadSynced()
    const ids     = new Set(catalog.map(sd => sd.id))
    const orphans: SyncedSerie[] = []
    let changed   = false
    for (const entry of Object.values(map)) {
        if (ids.has(entry.serieId)) continue
        const matches = catalog.filter(sd => normalizeName(sd.title ?? '') === normalizeName(entry.serieName))
        if (matches.length === 1 && !map[matches[0].id]) {
            delete map[entry.serieId]
            map[matches[0].id] = { ...entry, serieId: matches[0].id, serieName: matches[0].title }
            logger.info('rss-sync', `Surveillance de « ${entry.serieName} » déplacée de la série ${entry.serieId} vers ${matches[0].id}`)
            changed = true
        } else {
            orphans.push(entry)
        }
    }
    if (changed) saveSynced(map)
    return orphans
}

// ── Épisodes déjà importés ────────────────────────────────────

function readOrganized(): Record<string, Record<string, any>> {
    try {
        const p = path.join(DATA_DIR, 'organized.json')
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {}
    return {}
}

function getOrganizedEpisodeIds(sd: any, organized: Record<string, Record<string, any>>): Set<number> {
    const ids = new Set<number>()

    // Sous n'importe quel hash : évite de retélécharger un épisode importé via un torrent disparu du scraper
    const tracked = new Set(Object.values(organized).flatMap(eps => Object.keys(eps)))
    for (const season of sd.seasons ?? [])
        for (const ep of season.episodes ?? [])
            if (tracked.has(String(ep.id))) ids.add(ep.id)

    for (const t of sd.torrents ?? []) {
        const orgFiles = organized[t.infohash?.toLowerCase()] ?? {}
        for (const season of sd.seasons ?? [])
            for (const ep of season.episodes ?? [])
                if (orgFiles[String(ep.id)] !== undefined) ids.add(ep.id)
    }

    for (const season of sd.seasons ?? []) {
        for (const t of season.torrents ?? []) {
            const orgFiles = organized[t.infohash?.toLowerCase()] ?? {}
            for (const ep of season.episodes ?? [])
                if (orgFiles[String(ep.id)] !== undefined) ids.add(ep.id)
        }
        for (const ep of season.episodes ?? []) {
            for (const t of ep.torrents ?? []) {
                const orgFiles = organized[t.infohash?.toLowerCase()] ?? {}
                if (orgFiles[String(ep.id)] !== undefined) ids.add(ep.id)
                const pathEntry = (ep.paths ?? []).find((p: any) => typeof p === 'object' && p.infohash?.toLowerCase() === t.infohash?.toLowerCase())
                if (pathEntry) {
                    const fname = pathEntry.path?.split('/').pop()
                    if (fname && orgFiles[fname] !== undefined) ids.add(ep.id)
                }
            }
        }
    }

    return ids
}

// ── Torrents publiés ──────────────────────────────────────────

// pub_date nyaa : « AAAA-MM-JJ HH:MM » en UTC
function pubTime(t: any): number {
    return typeof t.pub_date === 'string' ? Date.parse(`${t.pub_date.replace(' ', 'T')}Z`) : NaN
}

interface ReleaseEpisode { key: string; name: string; pathEntry: any }
interface Release        { torrent: any; episodes: ReleaseEpisode[] }

// Torrents Fankai de la série et épisodes qu'ils contiennent
function listReleases(sd: any): Release[] {
    const byHash = new Map<string, Release>()
    const add = (t: any) => {
        const hash = t.infohash?.toLowerCase()
        if (t.fankai && hash && (t.torrent_url || t.magnet) && !byHash.has(hash)) byHash.set(hash, { torrent: t, episodes: [] })
    }
    for (const t of sd.torrents ?? []) add(t)
    for (const season of sd.seasons ?? []) {
        for (const t of season.torrents ?? []) add(t)
        for (const ep of season.episodes ?? []) for (const t of ep.torrents ?? []) add(t)
    }

    for (const season of sd.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            const key    = `${season.season_number}:${ep.episode_number}`
            const name   = `S${String(season.season_number).padStart(2, '0')}E${String(ep.episode_number).padStart(2, '0')}`
            const hashes = new Set<string>([...(ep.paths ?? []), ...(ep.torrents ?? [])].map((x: any) => x?.infohash?.toLowerCase()).filter(Boolean))
            for (const hash of hashes) {
                const release = byHash.get(hash)
                if (!release || release.episodes.some(e => e.key === key)) continue
                release.episodes.push({ key, name, pathEntry: (ep.paths ?? []).find((p: any) => p?.infohash?.toLowerCase() === hash) ?? null })
            }
        }
    }
    return [...byHash.values()]
}

// ── Vérification des séries surveillées ───────────────────────

export async function runRssSync(): Promise<{ sent: number; skipped: number; errors: number }> {
    if (Object.keys(loadSynced()).length === 0) return { sent: 0, skipped: 0, errors: 0 }

    const { series: seriesData, complete } = await loadCatalogStatus()
    if (complete) reconcileSynced(seriesData)
    const synced = loadSynced()
    const ids    = Object.keys(synced).map(Number)

    logger.info('rss-sync', `Surveillance : vérification de ${ids.length} série(s)`)

    const organized  = readOrganized()

    const activeHashes = new Set<string>()
    try {
        const { category } = readSettings()
        const infohashMap  = await readInfohashMap()
        const active       = await dispatchList(category ?? 'fankai', infohashMap)
        for (const t of active) if (t.hash) activeHashes.add(t.hash.toLowerCase())
    } catch (err) {
        logger.warn('rss-sync', `Impossible de lire les torrents actifs : ${err instanceof Error ? err.message : err}`)
    }

    let sent    = 0
    let skipped = 0
    let errors  = 0

    for (const serieId of ids) {
        const syncedEntry = synced[serieId]
        const sd          = seriesData.find((s: any) => s.id === serieId)
        if (!sd) {
            logger.warn('rss-sync', `Série ${serieId} (« ${syncedEntry.serieName} ») absente du catalogue : retirez la surveillance dans Paramètres › Catalogue`)
            continue
        }

        const title       = sd.title ?? sd.show_title ?? String(serieId)
        const activatedAt = new Date(syncedEntry.addedAt)
        const organizedIds = getOrganizedEpisodeIds(sd, organized)
        const releases    = listReleases(sd)

        logger.info('rss-sync', `Vérification de « ${title} » (surveillée depuis le ${activatedAt.toLocaleDateString('fr-FR')})`)

        // Clé saison:épisode : les variantes x264/x265 d'un même épisode comptent pour un
        const organizedKeys = new Set<string>()
        for (const season of sd.seasons ?? [])
            for (const ep of season.episodes ?? [])
                if (organizedIds.has(ep.id)) organizedKeys.add(`${season.season_number}:${ep.episode_number}`)

        // Nouvel épisode
        const firstPub = new Map<string, number>()
        for (const { torrent, episodes } of releases) {
            const time = pubTime(torrent)
            for (const { key } of episodes)
                firstPub.set(key, Math.min(firstPub.get(key) ?? Infinity, Number.isNaN(time) ? -Infinity : time))
        }
        const candidates = new Set([...firstPub].filter(([key, time]) => time > activatedAt.getTime() && !organizedKeys.has(key)).map(([key]) => key))

        if (candidates.size === 0) {
            logger.info('rss-sync', `« ${title} » : aucun nouvel épisode depuis l'activation`)
            continue
        }

        logger.info('rss-sync', `« ${title} » : ${candidates.size} épisode(s) à télécharger`)

        const toDownload: { url: string; magnet: string | null; file_index: number | null; file_path: string | null; infohash: string; label: string }[] = []
        const covered = new Set<string>()
        const missing = (r: Release) => r.episodes.filter(e => candidates.has(e.key) && !covered.has(e.key))

        for (const release of [...releases].sort((a, b) => missing(b).length - missing(a).length)) {
            const eps = missing(release)
            if (eps.length === 0) continue
            for (const e of eps) covered.add(e.key)

            const hash = release.torrent.infohash.toLowerCase()
            if (activeHashes.has(hash)) { skipped++; continue }

            const single = eps.length === 1 ? eps[0] : null
            toDownload.push({
                url       : release.torrent.torrent_url ?? release.torrent.magnet,
                magnet    : release.torrent.magnet ?? null,
                infohash  : hash,
                file_index: single?.pathEntry?.file_index ?? null,
                file_path : single?.pathEntry?.path ?? null,
                label     : `« ${title} » ${single ? single.name : `(${eps.length} épisodes)`}`,
            })
        }

        for (const dl of toDownload) {
            try {
                const results = await dispatchDownload(dl.url, {
                    file_index: dl.file_index,
                    file_path : dl.file_path,
                    infohash  : dl.infohash,
                    magnet    : dl.magnet,
                })
                if (results.some((r: any) => r.ok)) {
                    logger.info('rss-sync', `Envoyé au client : ${dl.label}`)
                    sent++
                } else {
                    logger.warn('rss-sync', `Échec de l'envoi : ${dl.label}`)
                    errors++
                }
            } catch (err) {
                logger.error('rss-sync', `Erreur à l'envoi de ${dl.label} : ${err instanceof Error ? err.message : err}`)
                errors++
            }
        }
    }

    logger.info('rss-sync', `Surveillance terminée : ${sent} envoyé(s), ${skipped} ignoré(s), ${errors} erreur(s)`)
    return { sent, skipped, errors }
}
