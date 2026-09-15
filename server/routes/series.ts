import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { DATA_DIR } from '../config.js'
import { readSettings } from '../settings.js'
import { dispatchList } from '../torrent-clients/index.js'
import { readAvailable, readInfohashMap, readSerieData } from '../lib/github-cache.js'
import { loadSynced } from '../lib/rss-sync.js'
import {
    fankaiGet, fetchSerieFromApi, normalizeSerie, normalizeSeason, normalizeEpisode,
    extractTorrentsFromSerieData, buildResolvedEpisodes, computeSerieDownloadState, countOrganizedEpisodes,
    deduplicateEpisodes, serieHasEpisodes,
} from '../lib/serie-helpers.js'
import { recentImportsBySerie } from '../lib/notifs.js'

const router = Router()

router.get('/library/recent', requireAuth, (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50)
    res.json(recentImportsBySerie().slice(0, limit))
})

router.get('/series', requireAuth, async (_req, res) => {
    try {
        const [apiData, availableIds] = await Promise.all([fankaiGet('/series'), readAvailable()])
        const availableSet = new Set<number>(availableIds)
        let organized: Record<string, Record<string, any>> = {}
        try { const p = path.join(DATA_DIR, 'organized.json'); if (fs.existsSync(p)) organized = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}
        const activeTorrents = new Set<string>()
        const clientHashes   = new Set<string>()
        try { const { category } = readSettings(); const infohashMap = await readInfohashMap(); const active = await dispatchList(category ?? 'fankai', infohashMap); for (const t of active) { if (!t.hash) continue; clientHashes.add(t.hash.toLowerCase()); if (t.state === 'downloading') activeTorrents.add(t.hash.toLowerCase()) } } catch {}
        const organizedEpisodeIds = new Set(Object.values(organized).flatMap(eps => Object.keys(eps)))
        const synced = loadSynced()
        const seriesRaw = (Array.isArray(apiData) ? apiData : (apiData.series ?? [])).map(normalizeSerie)
        const serieDataMap = new Map<number, any>()
        await Promise.all(seriesRaw.filter((s: any) => availableSet.has(s.id)).map(async (s: any) => { const sd = await readSerieData(s.id); if (sd) serieDataMap.set(s.id, sd) }))
        const lastImports = new Map(recentImportsBySerie().map(r => [r.serieId, r.at]))
        res.json({ series: seriesRaw.map((serie: any) => {
            const serieData = serieDataMap.get(serie.id) ?? null
            const torrents  = serieData ? extractTorrentsFromSerieData(serieData) : []
            const inClient  = torrents.some(t => t.infohash && clientHashes.has(t.infohash.toLowerCase()))
            const hasFiles  = (serieData?.seasons ?? []).some((s: any) => (s.episodes ?? []).some((ep: any) => organizedEpisodeIds.has(String(ep.id))))
            const counts    = serieData ? countOrganizedEpisodes(serieData, organized) : { total: 0, organized: 0 }
            return {
                ...serie, torrent_count: torrents.length, has_torrents: torrents.length > 0,
                download_state: computeSerieDownloadState(serieData, organized, activeTorrents, counts),
                episode_count: counts.total, organized_count: counts.organized, last_imported_at: lastImports.get(serie.id) ?? null,
                in_client: inClient, has_files: hasFiles, rss_synced: !!synced[serie.id],
            }
        })})
    } catch (err) {
        logger.error('api', `Échec du chargement des séries : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

router.get('/series/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id)
    try {
        const [{ seasons, ...serieRaw }, serieData] = await Promise.all([fetchSerieFromApi(id), readSerieData(id)])
        const serie   = { ...normalizeSerie(serieRaw), wiki: serieData?.wiki ?? null }
        const seasonsWithEpisodes = seasons.map((season: any) => ({ ...normalizeSeason(season), episodes: season.episodes.map(normalizeEpisode) }))
        let organized: Record<string, Record<string, any>> = {}
        try { const p = path.join(DATA_DIR, 'organized.json'); if (fs.existsSync(p)) organized = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}

        const availableEpisodeIds  = new Set<number>()
        const episodeTorrentMap    : Record<number, any[]> = {}
        const seasonTorrentMapBySn : Record<number, any[]> = {}
        const integraleTorrents    : any[] = []
        const organizedEpisodeIds  = new Set<number>()

        // Importé = une entrée pour l'épisode sous n'importe quel hash : les torrents du scraper peuvent disparaître
        const trackedIds = new Set(Object.values(organized).flatMap(eps => Object.keys(eps)))
        for (const season of seasonsWithEpisodes) {
            for (const ep of season.episodes) {
                if (trackedIds.has(String(ep.id))) organizedEpisodeIds.add(ep.id)
            }
        }
        if (serieData) {
            // Index hash : pack (intégrale ou saison)
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

        res.json({ serie, seasons: enrichedSeasons, scraper_synced: serieHasEpisodes(serieData), torrents_integrale: integraleTorrents.map(t => ({ label: 'Intégrale', torrent_url: t.torrent_url, magnet: t.magnet, infohash: t.infohash?.toLowerCase() ?? null, raw: t.title ?? t.raw, torrent_name: t.torrent_name ?? null })) })
    } catch (err) {
        logger.error('api', `Échec du chargement de la série ${id} : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

export default router
