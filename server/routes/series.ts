import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { DATA_DIR } from '../config.js'
import { readSettings } from '../settings.js'
import { dispatchList } from '../torrent-clients/index.js'
import { readAvailable, readInfohashMap, readSerieData } from '../lib/github-cache.js'
import {
    fankaiGet, normalizeSerie, normalizeSeason, normalizeEpisode,
    extractTorrentsFromSerieData, buildResolvedEpisodes, computeSerieDownloadState,
    deduplicateEpisodes,
} from '../lib/serie-helpers.js'

const router = Router()

router.get('/series', requireAuth, async (_req, res) => {
    try {
        const [apiData, availableIds] = await Promise.all([fankaiGet('/series'), readAvailable()])
        const availableSet = new Set<number>(availableIds)
        let organized: Record<string, Record<string, any>> = {}
        try { const p = path.join(DATA_DIR, 'organized.json'); if (fs.existsSync(p)) organized = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}
        const activeTorrents = new Set<string>()
        try { const { category } = readSettings(); const infohashMap = await readInfohashMap(); const active = await dispatchList(category ?? 'fankai', infohashMap); for (const t of active) { if (t.hash && t.state === 'downloading') activeTorrents.add(t.hash.toLowerCase()) } } catch {}
        const seriesRaw = (Array.isArray(apiData) ? apiData : (apiData.series ?? [])).map(normalizeSerie)
        const serieDataMap = new Map<number, any>()
        await Promise.all(seriesRaw.filter((s: any) => availableSet.has(s.id)).map(async (s: any) => { const sd = await readSerieData(s.id); if (sd) serieDataMap.set(s.id, sd) }))
        res.json({ series: seriesRaw.map((serie: any) => {
            const serieData   = serieDataMap.get(serie.id) ?? null
            const hasTorrents = serieData ? extractTorrentsFromSerieData(serieData).length > 0 : false
            return { ...serie, torrent_count: serieData ? extractTorrentsFromSerieData(serieData).length : 0, has_torrents: hasTorrents, download_state: computeSerieDownloadState(serieData, organized, activeTorrents) }
        })})
    } catch (err) {
        logger.error('api', `GET /api/series échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

router.get('/series/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id)
    try {
        const [serieRaw, seasonsData, serieData] = await Promise.all([fankaiGet(`/series/${id}`), fankaiGet(`/series/${id}/seasons`), readSerieData(id)])
        const serie   = { ...normalizeSerie(serieRaw), wiki: serieData?.wiki ?? null }
        const seasons = Array.isArray(seasonsData) ? seasonsData : (seasonsData.seasons ?? [])
        const seasonsWithEpisodes = await Promise.all(seasons.map(async (season: any) => {
            const epsData  = await fankaiGet(`/seasons/${season.id}/episodes`)
            const episodes = (Array.isArray(epsData) ? epsData : (epsData.episodes ?? [])).map(normalizeEpisode)
            return { ...normalizeSeason(season), episodes }
        }))
        let organized: Record<string, Record<string, any>> = {}
        try { const p = path.join(DATA_DIR, 'organized.json'); if (fs.existsSync(p)) organized = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}

        const availableEpisodeIds  = new Set<number>()
        const episodeTorrentMap    : Record<number, any[]> = {}
        const seasonTorrentMapBySn : Record<number, any[]> = {}
        const integraleTorrents    : any[] = []
        const organizedEpisodeIds  = new Set<number>()

        const manualOrg = organized['manual'] ?? {}
        if (serieData) {
            for (const season of serieData.seasons ?? []) {
                for (const ep of season.episodes ?? []) {
                    if (manualOrg[String(ep.id)]) organizedEpisodeIds.add(ep.id)
                }
            }
        }
        if (serieData) {
            // Lookup rapide hash → torrent pack (intégrale ou saison)
            const torrentByHash = new Map<string, { torrent_url: string; magnet: string; type: string; raw: string; fankai: boolean; torrent_name: string | null }>()
            for (const t of (serieData.torrents ?? []))
                if (t.infohash) torrentByHash.set(t.infohash.toLowerCase(), { torrent_url: t.torrent_url, magnet: t.magnet, type: 'pack_integrale', raw: t.title ?? '', fankai: t.fankai ?? true, torrent_name: t.torrent_name ?? null })
            for (const sd_s of (serieData.seasons ?? []))
                for (const t of (sd_s.torrents ?? []))
                    if (t.infohash) torrentByHash.set(t.infohash.toLowerCase(), { torrent_url: t.torrent_url, magnet: t.magnet, type: 'pack_saison', raw: t.title ?? '', fankai: t.fankai ?? true, torrent_name: t.torrent_name ?? null })

            for (const t of (serieData.torrents ?? [])) {
                integraleTorrents.push({ ...t, raw: t.title })
                const resolved = buildResolvedEpisodes(serieData, t.infohash)
                for (const ep of resolved) availableEpisodeIds.add(ep.episode_id)
                const orgFiles = organized[t.infohash?.toLowerCase()] ?? {}
                for (const ep of resolved) {
                    const isOrg = orgFiles[String(ep.episode_id)] !== undefined || orgFiles[ep.filename] !== undefined
                    if (isOrg) organizedEpisodeIds.add(ep.episode_id)
                }
            }
            for (const season of serieData.seasons ?? []) {
                for (const t of (season.torrents ?? [])) {
                    if (!seasonTorrentMapBySn[season.season_number]) seasonTorrentMapBySn[season.season_number] = []
                    seasonTorrentMapBySn[season.season_number].push({ torrent_url: t.torrent_url, magnet: t.magnet, infohash: t.infohash?.toLowerCase() ?? null, type: 'pack_saison', raw: t.title, torrent_name: t.torrent_name ?? null, manual: t.manual ?? false })
                    const resolved = buildResolvedEpisodes(serieData, t.infohash, season.season_number)
                    for (const ep of resolved) availableEpisodeIds.add(ep.episode_id)
                    const orgFiles = organized[t.infohash?.toLowerCase()] ?? {}
                    for (const ep of resolved) {
                        const isOrg = orgFiles[String(ep.episode_id)] !== undefined || orgFiles[ep.filename] !== undefined
                        if (isOrg) organizedEpisodeIds.add(ep.episode_id)
                    }
                }
                for (const ep of season.episodes ?? []) {
                    for (const t of (ep.torrents ?? [])) {
                        if (!episodeTorrentMap[ep.id]) episodeTorrentMap[ep.id] = []
                        const pathEntry = (ep.paths ?? []).find((p: any) => typeof p === 'object' && p.infohash?.toLowerCase() === t.infohash?.toLowerCase())
                        episodeTorrentMap[ep.id].push({ torrent_url: t.torrent_url, magnet: t.magnet, infohash: t.infohash?.toLowerCase() ?? null, type: 'episode', raw: t.title, torrent_name: t.torrent_name ?? null, manual: t.manual ?? false, fankai: t.fankai ?? true, file_index: pathEntry?.file_index ?? null, file_path: pathEntry?.path ?? null, formatted_name: pathEntry?.formatted_name ?? ep.formatted_name ?? null })
                        availableEpisodeIds.add(ep.id)
                        const orgFiles = organized[t.infohash?.toLowerCase()] ?? {}
                        const isOrg = orgFiles[String(ep.id)] !== undefined
                        if (!isOrg) {
                            const match = (ep.paths ?? []).find((p: any) => typeof p === 'object' && p.infohash?.toLowerCase() === t.infohash?.toLowerCase())
                            const filename = match ? match.path.split('/').pop() : null
                            if (filename && orgFiles[filename]) organizedEpisodeIds.add(ep.id)
                        } else {
                            organizedEpisodeIds.add(ep.id)
                        }
                    }
                    // Fallback : si l'épisode n'a pas de torrent individuel,
                    // on crée un torrent synthétique depuis ep.paths (fichier dans un pack).
                    // On ajoute TOUTES les entrées valides (un pack par path unique).
                    if (!episodeTorrentMap[ep.id] || episodeTorrentMap[ep.id].length === 0) {
                        const seenPackHashes = new Set<string>()
                        for (const pathEntry of (ep.paths ?? [])) {
                            if (typeof pathEntry !== 'object' || !pathEntry.infohash) continue
                            const hashKey = pathEntry.infohash.toLowerCase()
                            if (seenPackHashes.has(hashKey)) continue
                            const pack = torrentByHash.get(hashKey)
                            if (!pack) continue
                            seenPackHashes.add(hashKey)
                            if (!episodeTorrentMap[ep.id]) episodeTorrentMap[ep.id] = []
                            episodeTorrentMap[ep.id].push({ torrent_url: pack.torrent_url, magnet: pack.magnet, infohash: hashKey, type: pack.type, raw: pack.raw, torrent_name: pack.torrent_name ?? null, manual: false, fankai: pack.fankai, file_index: pathEntry.file_index ?? null, file_path: pathEntry.path ?? null, formatted_name: pathEntry.formatted_name ?? ep.formatted_name ?? null })
                            availableEpisodeIds.add(ep.id)
                        }
                    }
                }
            }
        }

        const enrichedSeasons = seasonsWithEpisodes.map((season: any) => {
            const rawEps = season.episodes.map((ep: any) => {
                const epTorrents = episodeTorrentMap[ep.id] ?? []
                const epTorrent = epTorrents[0] ?? null
                let fankai: boolean | null = epTorrent ? (epTorrent.fankai ?? true) : null
                if (fankai === null && serieData) {
                    outer: for (const sd_season of serieData.seasons ?? []) {
                        for (const sdEp of sd_season.episodes ?? []) {
                            if (sdEp.id !== ep.id) continue
                            for (const p of sdEp.paths ?? []) {
                                const ih = typeof p === 'object' ? p.infohash?.toLowerCase() : null
                                if (!ih) continue
                                for (const t of serieData.torrents ?? []) { if (t.infohash?.toLowerCase() === ih) { fankai = t.fankai ?? true; break outer } }
                                for (const s of serieData.seasons ?? []) { for (const t of s.torrents ?? []) { if (t.infohash?.toLowerCase() === ih) { fankai = t.fankai ?? true; break outer } } }
                            }
                        }
                    }
                }
                const resolvedFankai = fankai ?? true
                return {
                    ...ep,
                    available: availableEpisodeIds.has(ep.id),
                    torrent: epTorrent ? { ...epTorrent, fankai: resolvedFankai } : null,
                    torrents: epTorrents.map((t: any) => ({ ...t, fankai: resolvedFankai ?? t.fankai ?? true })),
                    fankai,
                    organized: organizedEpisodeIds.has(ep.id),
                }
            })
            // Dédoublonnage : plusieurs variantes (x264/x265…) du même episode_number
            // sont fusionnées en un seul épisode avec la liste de torrents combinée
            const eps = deduplicateEpisodes(rawEps)
            const total    = eps.filter((e: any) => e.available).length
            const orgCount = eps.filter((e: any) => e.organized).length
            const epTotal  = eps.length
            const orgState = orgCount === 0
                ? 'none'
                : orgCount >= epTotal
                    ? 'complete'
                    : total > 0 && orgCount >= total
                        ? 'complete'
                        : 'partial'
            const seasonTorrents = seasonTorrentMapBySn[season.season_number] ?? []
            return {
                ...season,
                torrent: seasonTorrents[0] ?? null,
                torrents: seasonTorrents,
                organized_state: orgState,
                organized_count: orgCount,
                episodes: eps,
            }
        })

        res.json({ serie, seasons: enrichedSeasons, torrents_integrale: integraleTorrents.map(t => ({ label: 'Intégrale', torrent_url: t.torrent_url, magnet: t.magnet, infohash: t.infohash?.toLowerCase() ?? null, raw: t.title ?? t.raw, torrent_name: t.torrent_name ?? null })) })
    } catch (err) {
        logger.error('api', `GET /api/series/${id} échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

export default router
