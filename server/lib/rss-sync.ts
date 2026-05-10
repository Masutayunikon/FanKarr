/**
 * RSS Sync — auto-téléchargement des nouveaux épisodes pour les séries surveillées.
 *
 * Toutes les 6 heures, FanKarr vérifie si de nouveaux épisodes sont apparus
 * APRÈS le dernier épisode organisé de chaque saison.
 *
 * Règle de frontière : si le dernier épisode organisé d'une saison est le 9,
 * seuls les épisodes 10+ sont candidats au téléchargement automatique.
 * Si aucun épisode n'est encore organisé dans une saison, rien n'est déclenché
 * pour cette saison (l'utilisateur doit lancer le premier téléchargement manuellement).
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
    addedAt  : string   // ISO
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

export function isSynced(serieId: number): boolean {
    return !!loadSynced()[serieId]
}

// ── Helpers organisés ─────────────────────────────────────────

function readOrganized(): Record<string, Record<string, any>> {
    try {
        const p = path.join(DATA_DIR, 'organized.json')
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {}
    return {}
}

/**
 * Retourne l'ensemble des IDs d'épisodes organisés pour une série donnée,
 * en croisant organized.json avec les données de la série.
 */
function getOrganizedEpisodeIds(sd: any, organized: Record<string, Record<string, any>>): Set<number> {
    const ids = new Set<number>()

    // Import manuel
    const manual = organized['manual'] ?? {}
    for (const season of sd.seasons ?? [])
        for (const ep of season.episodes ?? [])
            if (manual[String(ep.id)]) ids.add(ep.id)

    // Intégrales
    for (const t of sd.torrents ?? []) {
        const orgFiles = organized[t.infohash?.toLowerCase()] ?? {}
        for (const season of sd.seasons ?? [])
            for (const ep of season.episodes ?? [])
                if (orgFiles[String(ep.id)] !== undefined) ids.add(ep.id)
    }

    // Packs saison + épisodes individuels
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
                // Fallback filename
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

/**
 * Pour une saison donnée, retourne le numéro d'épisode maximal parmi
 * les épisodes organisés, ou 0 si aucun n'est organisé.
 */
function maxOrganizedEpNumber(season: any, organizedIds: Set<number>): number {
    let max = 0
    for (const ep of season.episodes ?? []) {
        if (organizedIds.has(ep.id) && ep.episode_number > max)
            max = ep.episode_number
    }
    return max
}

// ── Logique de sync ───────────────────────────────────────────

/**
 * Lance un cycle de RSS sync.
 *
 * Par série surveillée :
 *  - Pour chaque saison, calcule la frontière = dernier épisode organisé.
 *  - Ne propose au téléchargement que les épisodes APRÈS cette frontière.
 *  - Si aucun épisode n'est organisé dans une saison → saison ignorée
 *    (l'utilisateur doit lancer le premier téléchargement manuellement).
 *  - Ne renvoie pas un torrent déjà actif dans le client.
 */
export async function runRssSync(): Promise<{ sent: number; skipped: number; errors: number }> {
    const synced = loadSynced()
    const ids    = Object.keys(synced).map(Number)
    if (ids.length === 0) return { sent: 0, skipped: 0, errors: 0 }

    logger.info('rss-sync', `Démarrage sync — ${ids.length} série(s) surveillée(s)`)

    const organized  = readOrganized()
    const seriesData = await loadEnrichedSeriesData()

    // Torrents actifs dans le client
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
        const sd = seriesData.find((s: any) => s.id === serieId)
        if (!sd) {
            logger.warn('rss-sync', `Série ${serieId} introuvable dans le cache`)
            continue
        }

        const title        = sd.title ?? sd.show_title ?? String(serieId)
        const organizedIds = getOrganizedEpisodeIds(sd, organized)

        if (organizedIds.size === 0) {
            logger.info('rss-sync', `${title} — aucun épisode organisé, sync ignoré (lance le 1er téléchargement manuellement)`)
            skipped++
            continue
        }

        logger.info('rss-sync', `Vérification : ${title} (${organizedIds.size} épisodes organisés)`)

        // Épisodes candidats = après la frontière, par saison
        // Un épisode est candidat si : episode_number > max organisé dans cette saison
        const candidateIds = new Set<number>()
        for (const season of sd.seasons ?? []) {
            const frontier = maxOrganizedEpNumber(season, organizedIds)
            if (frontier === 0) continue   // aucun épisode organisé dans cette saison → skip

            for (const ep of season.episodes ?? []) {
                if (ep.episode_number > frontier && !organizedIds.has(ep.id))
                    candidateIds.add(ep.id)
            }

            if (candidateIds.size > 0)
                logger.info('rss-sync', `${title} S${season.season_number} — frontière ep${frontier}, ${
                    [...candidateIds].length} candidat(s)`)
        }

        if (candidateIds.size === 0) {
            logger.info('rss-sync', `${title} — aucun nouvel épisode`)
            continue
        }

        // Construire la liste des téléchargements (intégrale → pack saison → épisode)
        const toDownload: { url: string; file_index?: number | null; file_path?: string | null; infohash?: string | null; label: string }[] = []
        const coveredIds  = new Set<number>()

        // 1. Intégrale(s) — uniquement si elle couvre au moins un candidat
        for (const t of sd.torrents ?? []) {
            if (!t.fankai) continue
            const url  = t.torrent_url ?? t.magnet
            if (!url)  continue
            const hash = t.infohash?.toLowerCase()
            if (hash && activeHashes.has(hash)) { skipped++; continue }

            const integraleEps: any[] = []
            for (const season of sd.seasons ?? [])
                for (const ep of season.episodes ?? [])
                    if (ep.torrents?.some((et: any) => et.infohash?.toLowerCase() === hash))
                        integraleEps.push(ep)

            const coversSomeCandidate = integraleEps.some(ep => candidateIds.has(ep.id))
            if (!coversSomeCandidate) { skipped++; continue }

            toDownload.push({ url, infohash: hash ?? null, label: `intégrale ${title}` })
            for (const ep of integraleEps) coveredIds.add(ep.id)
        }

        // 2. Packs saison — uniquement si le pack couvre au moins un candidat non couvert
        for (const season of sd.seasons ?? []) {
            for (const t of season.torrents ?? []) {
                if (!t.fankai) continue
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

        // 3. Épisodes individuels candidats non encore couverts
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                if (!candidateIds.has(ep.id) || coveredIds.has(ep.id)) continue

                for (const t of ep.torrents ?? []) {
                    if (!t.fankai) continue
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

        // Envoyer
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
