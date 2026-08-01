/**
 * RSS Sync — auto-téléchargement des épisodes sortis après l'activation de la surveillance.
 *
 * Toutes les 6 heures, FanKarr cherche les épisodes dont le champ `date_added`
 * (date d'ajout dans la base metadata) est postérieur à la date d'activation
 * du sync pour cette série. Si ces épisodes ont un torrent fankai et ne sont
 * pas encore organisés, ils sont envoyés automatiquement au client torrent.
 */

import path from 'path'
import fs   from 'fs'
import { DATA_DIR } from '../config.js'
import { logger }   from '../logger.js'
import { loadEnrichedSeriesData, readInfohashMap } from './github-cache.js'
import { dispatchDownload, dispatchList }          from '../torrent-clients/index.js'
import { readSettings }                            from '../settings.js'

// ── Types ─────────────────────────────────────────────────────

export interface SyncedSerie {
    serieId  : number
    serieName: string
    addedAt  : string   // ISO — date d'activation de la surveillance
    /** Si true, seules les releases MULTI (VF incluse) sont téléchargées automatiquement. */
    multiOnly?: boolean
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

export function setSync(serieId: number, serieName: string, enabled: boolean, multiOnly = false, includeExisting = false): SyncedMap {
    const map = loadSynced()
    if (enabled) {
        // includeExisting : date d'activation à l'époque zéro → les épisodes déjà
        // sortis deviennent éligibles au prochain cycle de sync (rattrapage).
        const addedAt = includeExisting ? new Date(0).toISOString() : new Date().toISOString()
        map[serieId] = { serieId, serieName, addedAt, multiOnly }
    } else {
        delete map[serieId]
    }
    saveSynced(map)
    return map
}

export function isSynced(serieId: number): boolean {
    return !!loadSynced()[serieId]
}

export function getSync(serieId: number): SyncedSerie | null {
    return loadSynced()[serieId] ?? null
}

// ── Helpers ───────────────────────────────────────────────────

function readOrganized(): Record<string, Record<string, any>> {
    try {
        const p = path.join(DATA_DIR, 'organized.json')
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {}
    return {}
}

function getOrganizedEpisodeIds(sd: any, organized: Record<string, Record<string, any>>): Set<number> {
    const ids = new Set<number>()

    const manual = organized['manual'] ?? {}
    for (const season of sd.seasons ?? [])
        for (const ep of season.episodes ?? [])
            if (manual[String(ep.id)]) ids.add(ep.id)

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

// ── Détection langue ──────────────────────────────────────────
// Miroir de la détection frontend (SerieSeasonCard.vue) : on cherche
// MULTI ou VOSTFR dans les noms de torrents / noms formatés.

export function langOf(...sources: (string | null | undefined)[]): 'MULTI' | 'VOSTFR' | null {
    for (const s of sources) {
        if (!s) continue
        if (/\bMULTI\b/i.test(s)) return 'MULTI'
        if (/\bVOSTFR\b/i.test(s)) return 'VOSTFR'
    }
    return null
}

/**
 * true si le torrent est identifiable comme MULTI.
 * Conservateur : si la langue est indéterminable (null), on considère
 * que ce n'est PAS un MULTI — en mode multiOnly on préfère rater un
 * téléchargement que d'importer du VOSTFR par surprise.
 */
function torrentIsMulti(t: any, ep?: any): boolean {
    return langOf(t?.torrent_name, t?.raw, ep?.formatted_name) === 'MULTI'
}

// ── Logique de sync ───────────────────────────────────────────

let syncRunning = false

export async function runRssSync(): Promise<{ sent: number; skipped: number; errors: number }> {
    // Garde anti-chevauchement : un cycle peut être déclenché à la fois par le
    // timer et par une activation avec rattrapage — on n'en exécute qu'un.
    if (syncRunning) {
        logger.info('rss-sync', 'Cycle déjà en cours — nouvel appel ignoré')
        return { sent: 0, skipped: 0, errors: 0 }
    }
    syncRunning = true
    try {
        return await runRssSyncInner()
    } finally {
        syncRunning = false
    }
}

async function runRssSyncInner(): Promise<{ sent: number; skipped: number; errors: number }> {
    const synced = loadSynced()
    const ids    = Object.keys(synced).map(Number)
    if (ids.length === 0) return { sent: 0, skipped: 0, errors: 0 }

    logger.info('rss-sync', `Démarrage sync — ${ids.length} série(s) surveillée(s)`)

    const organized  = readOrganized()
    const seriesData = await loadEnrichedSeriesData()

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
            logger.warn('rss-sync', `Série ${serieId} introuvable dans le cache`)
            continue
        }

        const title      = sd.title ?? sd.show_title ?? String(serieId)
        const activatedAt = new Date(syncedEntry.addedAt)
        const organizedIds = getOrganizedEpisodeIds(sd, organized)
        const multiOnly    = !!syncedEntry.multiOnly

        logger.info('rss-sync', `Vérification : ${title} (sync activé le ${activatedAt.toLocaleDateString('fr-FR')}${multiOnly ? ', MULTI uniquement' : ''})`)

        // Épisodes candidats : date_added > date d'activation ET pas encore organisés
        const candidateIds = new Set<number>()
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                if (!ep.date_added) continue
                const epDate = new Date(ep.date_added)
                if (epDate <= activatedAt) continue
                if (organizedIds.has(ep.id)) continue
                // Doit avoir au moins un torrent fankai (MULTI si le mode multiOnly est actif)
                const hasTorrent = (ep.torrents ?? []).some((t: any) =>
                    t.fankai && (t.torrent_url || t.magnet) && (!multiOnly || torrentIsMulti(t, ep))
                )
                if (!hasTorrent) continue
                candidateIds.add(ep.id)
            }
        }

        if (candidateIds.size === 0) {
            logger.info('rss-sync', `${title} — aucun nouvel épisode depuis l'activation`)
            continue
        }

        logger.info('rss-sync', `${title} — ${candidateIds.size} nouvel(s) épisode(s) à télécharger`)

        // Construire les téléchargements : pack saison si couvre des candidats, sinon épisode par épisode
        const toDownload: { url: string; file_index?: number | null; file_path?: string | null; infohash?: string | null; label: string }[] = []
        const coveredIds  = new Set<number>()

        // 1. Packs saison couvrant au moins un candidat
        for (const season of sd.seasons ?? []) {
            for (const t of season.torrents ?? []) {
                if (!t.fankai) continue
                if (multiOnly && !torrentIsMulti(t)) { skipped++; continue }
                const url  = t.torrent_url ?? t.magnet
                if (!url)  continue
                const hash = t.infohash?.toLowerCase()
                if (hash && activeHashes.has(hash)) { skipped++; continue }

                const coversSomeCandidate = (season.episodes ?? []).some((ep: any) =>
                    candidateIds.has(ep.id) && !coveredIds.has(ep.id)
                )
                if (!coversSomeCandidate) { skipped++; continue }

                toDownload.push({ url, infohash: hash ?? null, label: `S${season.season_number} ${title}` })
                for (const ep of season.episodes ?? []) coveredIds.add(ep.id)
            }
        }

        // 2. Épisodes individuels candidats non couverts par un pack
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                if (!candidateIds.has(ep.id) || coveredIds.has(ep.id)) continue

                for (const t of ep.torrents ?? []) {
                    if (!t.fankai) continue
                    if (multiOnly && !torrentIsMulti(t, ep)) { skipped++; continue }
                    const url  = t.torrent_url ?? t.magnet
                    if (!url)  continue
                    const hash = t.infohash?.toLowerCase()
                    if (hash && activeHashes.has(hash)) { skipped++; continue }

                    const pathEntry = (ep.paths ?? []).find((p: any) => typeof p === 'object' && p.infohash?.toLowerCase() === hash)
                    toDownload.push({
                        url,
                        infohash  : hash ?? null,
                        file_index: pathEntry?.file_index ?? null,
                        file_path : pathEntry?.path ?? null,
                        label     : `S${season.season_number}E${ep.episode_number} ${title}`,
                    })
                    coveredIds.add(ep.id)
                    break
                }
            }
        }

        for (const dl of toDownload) {
            try {
                const results = await dispatchDownload(dl.url, {
                    file_index: dl.file_index,
                    file_path : dl.file_path,
                    infohash  : dl.infohash,
                })
                if (results.some((r: any) => r.ok)) {
                    logger.info('rss-sync', `Envoyé : ${dl.label}`)
                    sent++
                } else {
                    logger.warn('rss-sync', `Échec envoi : ${dl.label}`)
                    errors++
                }
            } catch (err) {
                logger.error('rss-sync', `Erreur dispatch ${dl.label} : ${err instanceof Error ? err.message : err}`)
                errors++
            }
        }
    }

    logger.info('rss-sync', `Sync terminé — ${sent} envoyé(s), ${skipped} ignoré(s), ${errors} erreur(s)`)
    return { sent, skipped, errors }
}
