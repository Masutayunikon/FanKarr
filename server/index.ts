import express from 'express'
import cookieParser from 'cookie-parser'
import fs from 'fs'
import path from 'path'
import { authStatus, authSetup, authLogin, authLogout, requireAuth } from './auth.js'
import { readSettings, writeSettings } from './settings.js'
import {
    registerDriver, getDriver, getAvailableClients,
    listClients, addClient, removeClient, getClient,
    sanitizeClient, dispatchDownload, dispatchList
} from './torrent-clients/index.js'
import qbittorrentDriver from './torrent-clients/qbittorrent.js'
import { organizeTorrent, autoOrganizeAll, scanMediaPath } from './organize.js'
import { logger, readLogs, clearLogs, logsFileSize } from './logger.js'
import { DATA_DIR, BASE_DIR }  from './config.js'

registerDriver(qbittorrentDriver)

const app = express()
const PORT = Number(process.env.PORT) || 9898
const FANKAI_API  = 'https://metadata.fankai.fr'
const GITHUB_BASE = process.env.GITHUB_BASE
    ?? 'https://raw.githubusercontent.com/masutayunikon/fankarr-scraper/main'

app.use(express.json())
app.use(cookieParser())

// ── Static frontend (prod) ─────────────────────────────────────
const PUBLIC_PATH = path.join(BASE_DIR, 'public')
if (fs.existsSync(PUBLIC_PATH)) {
    app.use(express.static(PUBLIC_PATH))
}

// ── Auth ───────────────────────────────────────────────────────
app.get('/api/auth/status', authStatus)
app.post('/api/auth/setup',  authSetup)
app.post('/api/auth/login',  authLogin)
app.post('/api/auth/logout', authLogout)

// ── Settings ───────────────────────────────────────────────────
app.get('/api/settings', requireAuth, (_req, res) => {
    res.json(readSettings())
})
app.post('/api/settings', requireAuth, (req, res) => {
    const { mediaPath, completePath, organizeMode, category, nfoSupport, autoImport, usePlexTitles } = req.body
    res.json(writeSettings({ mediaPath, completePath, organizeMode, category, nfoSupport, autoImport, usePlexTitles }))
})

// ── Torrent clients ────────────────────────────────────────────
app.get('/api/torrent-clients/available', requireAuth, (_req, res) => {
    res.json(getAvailableClients())
})
app.get('/api/torrent-clients', requireAuth, (_req, res) => {
    res.json(listClients().map((c: any) => sanitizeClient(c)))
})
app.post('/api/torrent-clients', requireAuth, (req, res) => {
    const { name, type, config } = req.body
    if (!name || !type || !config) { res.status(400).json({ error: 'name, type et config requis' }); return }
    if (!getDriver(type))          { res.status(400).json({ error: `Type inconnu : ${type}` });      return }
    res.json(sanitizeClient(addClient(name, type, config)))
})
app.delete('/api/torrent-clients/:uuid', requireAuth, (req, res) => {
    const ok = removeClient(String(req.params.uuid))
    if (!ok) res.status(404).json({ error: 'Client introuvable' })
    else     res.json({ ok: true })
})
app.post('/api/torrent-clients/test-config', requireAuth, async (req, res) => {
    const { type, config } = req.body
    if (!type || !config) { res.status(400).json({ error: 'type et config requis' }); return }
    const driver = getDriver(type)
    if (!driver) { res.status(400).json({ error: `Type inconnu : ${type}` }); return }
    res.json(await driver.test(config))
})
app.post('/api/torrent-clients/:uuid/test', requireAuth, async (req, res) => {
    const client = getClient(String(req.params.uuid))
    if (!client) { res.status(404).json({ error: 'Client introuvable' }); return }
    const driver = getDriver(client.type)
    if (!driver) { res.status(400).json({ error: 'Driver introuvable' }); return }
    res.json(await driver.test(client.config))
})
app.get('/api/torrent-clients/:uuid/healthcheck', requireAuth, async (req, res) => {
    const client = getClient(String(req.params.uuid))
    if (!client) { res.status(404).json({ error: 'Client introuvable' }); return }
    const driver = getDriver(client.type)
    if (!driver) { res.status(400).json({ error: 'Driver introuvable' }); return }
    res.json(await driver.healthcheck(client.config))
})

// ── Cache GitHub ───────────────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000  // 6 heures

interface CacheEntry<T> { data: T; expiresAt: number }
const _cache = new Map<string, CacheEntry<any>>()

function cacheGet<T>(key: string): T | null {
    const entry = _cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) { _cache.delete(key); return null }
    return entry.data as T
}

function cacheSet<T>(key: string, data: T): void {
    _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

function cacheClear(): void { _cache.clear() }

async function githubGet(urlPath: string): Promise<any> {
    const key = urlPath
    const cached = cacheGet(key)
    if (cached) return cached
    const res = await fetch(`${GITHUB_BASE}/${urlPath}`)
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${urlPath}`)
    const data = await res.json()
    cacheSet(key, data)
    return data
}

async function readAvailable(): Promise<number[]> {
    try {
        return await githubGet('available.json') as number[]
    } catch { return [] }
}

async function readSerieData(serieId: number): Promise<any | null> {
    try {
        return await githubGet(`series/${serieId}.json`)
    } catch { return null }
}

// Extrait tous les torrents d'un series/{id}.json avec leur type et niveau hiérarchique
// Retourne une liste plate compatible avec l'ancienne interface { infohash, torrent_url, magnet, raw, type, ... }
function extractTorrentsFromSerieData(sd: any): any[] {
    const result: any[] = []
    if (!sd) return result

    // Torrents au niveau série → pack_integrale (ou pack_saison si une seule saison)
    for (const t of sd.torrents ?? []) {
        result.push({
            ...t,
            raw       : t.title,
            type      : 'pack_integrale',
            serie_id  : sd.id,
            serie_title: sd.title,
            // episodes couverts : tous les épisodes de toutes les saisons qui ont paths[i]
            _serieLevel: true,
            _serieData : sd,
            _torrentIdx: (sd.torrents ?? []).indexOf(t),
        })
    }

    // Torrents au niveau saison → pack_saison
    for (const season of sd.seasons ?? []) {
        for (const t of season.torrents ?? []) {
            result.push({
                ...t,
                raw          : t.title,
                type         : 'pack_saison',
                serie_id     : sd.id,
                serie_title  : sd.title,
                season_id    : season.id,
                season_number: season.season_number,
                _seasonLevel : true,
                _season      : season,
                _torrentIdx  : (season.torrents ?? []).indexOf(t),
            })
        }

        // Torrents au niveau épisode → episode
        for (const ep of season.episodes ?? []) {
            for (const t of ep.torrents ?? []) {
                result.push({
                    ...t,
                    raw          : t.title,
                    type         : 'episode',
                    serie_id     : sd.id,
                    serie_title  : sd.title,
                    season_id    : season.id,
                    season_number: season.season_number,
                    episode_id   : ep.id,
                    episode_number: ep.episode_number,
                    _episodeLevel: true,
                    _episode     : ep,
                    _torrentIdx  : (ep.torrents ?? []).indexOf(t),
                })
            }
        }
    }

    return result
}

// Construit resolved_episodes pour un torrent à partir des paths[torrentIdx]
// Construit les épisodes résolus pour un torrent donné par son infohash
function buildResolvedEpisodes(sd: any, hash: string, seasonFilter?: number): any[] {
    const resolved: any[] = []
    const h = hash.toLowerCase()

    for (const season of sd.seasons ?? []) {
        if (seasonFilter !== undefined && season.season_number !== seasonFilter) continue
        for (const ep of season.episodes ?? []) {
            const paths: any[] = ep.paths ?? []

            // Nouveau format { infohash, path } ou legacy string
            let filePath: string | null = null
            for (const p of paths) {
                if (typeof p === 'string') {
                    if (!filePath) filePath = p.replace(/\\/g, '/')  // legacy fallback
                } else if (p?.infohash?.toLowerCase() === h) {
                    filePath = p.path.replace(/\\/g, '/')
                    break
                }
            }
            if (!filePath) continue

            const filename = filePath.split('/').pop() ?? filePath
            resolved.push({
                episode_id       : ep.id,
                episode_number   : ep.episode_number,
                season_number    : season.season_number,
                season_id        : season.id,
                filename,
                original_filename: filename,
            })
        }
    }
    return resolved
}

async function fankaiGet(endpoint: string): Promise<any> {
    const res = await fetch(`${FANKAI_API}${endpoint}`)
    if (!res.ok) throw new Error(`Fankai API ${res.status}: ${endpoint}`)
    return res.json()
}

function normalizeTitle(s: string): string {
    return s.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function imgProxy(url: string | null | undefined, w: number, q = 70): string | null {
    if (!url) return null
    const stripped = url.replace(/^https?:\/\//, '')
    return `https://wsrv.nl/?url=${stripped}&w=${w}&q=${q}`
}

function normalizeSerie(serie: any): any {
    const poster = serie.poster_image ?? serie.images?.poster ?? null
    const fanart = serie.fanart_image ?? serie.images?.fanart  ?? null
    return {
        ...serie,
        poster_image: imgProxy(poster, 300),
        fanart_image: imgProxy(fanart, 1280, 60),
    }
}

function normalizeSeason(season: any): any {
    const poster = season.poster_image ?? season.images?.poster ?? null
    return {
        ...season,
        poster_image: imgProxy(poster, 300),
    }
}

function normalizeEpisode(ep: any): any {
    const thumb = ep.thumb_image ?? ep.thumbnail ?? null
    return {
        ...ep,
        thumb_image: imgProxy(thumb, 400),
    }
}

// ── Enrichissement seriesData avec original_filename depuis l'API ──────────────
// Fetche /seasons/{id}/episodes pour chaque saison et injecte original_filename
// dans chaque épisode du serieData, indexé par episode_id
async function enrichSeriesDataWithOriginalFilenames(seriesData: any[]): Promise<any[]> {
    const results: any[] = []

    for (const sd of seriesData) {
        if (!sd) { results.push(sd); continue }

        // Fetcher title_for_plex depuis l'API série
        let title_for_plex: string | null = null
        try {
            const serieApi = await fankaiGet(`/series/${sd.id}`)
            title_for_plex = serieApi.title_for_plex ?? null
        } catch {}

        const enrichedSeasons: any[] = []
        for (const season of sd.seasons ?? []) {
            let epsData: any[] = []
            try {
                // 2 tentatives en cas d'erreur réseau ponctuelle
                let lastErr: any
                for (let attempt = 0; attempt < 2; attempt++) {
                    try {
                        const res = await fankaiGet(`/seasons/${season.id}/episodes`)
                        epsData = Array.isArray(res) ? res : (res.episodes ?? [])
                        break
                    } catch (e) {
                        lastErr = e
                        if (attempt === 0) await new Promise(r => setTimeout(r, 500))
                    }
                }
                if (epsData.length === 0 && lastErr) throw lastErr
            } catch {
                enrichedSeasons.push(season)
                continue
            }

            // Petit délai pour ne pas saturer l'API
            await new Promise(r => setTimeout(r, 50))

            const origMap = new Map<number, { original_filename: string; formatted_name: string }>()
            for (const ep of epsData) {
                if (ep.id) origMap.set(ep.id, {
                    original_filename: ep.original_filename ?? '',
                    formatted_name   : ep.formatted_name ?? '',
                })
            }

            const enrichedEpisodes = (season.episodes ?? []).map((ep: any) => ({
                ...ep,
                original_filename: origMap.get(ep.id)?.original_filename ?? null,
                formatted_name   : origMap.get(ep.id)?.formatted_name    ?? null,
            }))

            enrichedSeasons.push({ ...season, episodes: enrichedEpisodes })
        }

        results.push({ ...sd, title_for_plex, seasons: enrichedSeasons })
    }

    return results
}

// Helper réutilisable : charge + enrichit toutes les seriesData du cache
async function loadEnrichedSeriesData(): Promise<any[]> {
    const ids   = await readAvailable()
    const allSd = await Promise.all(ids.map(id => readSerieData(id)))
    const valid = allSd.filter(Boolean)
    return enrichSeriesDataWithOriginalFilenames(valid)
}

function computeSerieDownloadState(
    serieData     : any | null,
    organized     : Record<string, Record<string, string>>,
    activeTorrents: Set<string>
): 'none' | 'downloading' | 'partial' | 'complete' {
    if (!serieData) return 'none'

    const allTorrents = extractTorrentsFromSerieData(serieData)
    if (allTorrents.length === 0) return 'none'

    const hasActive = allTorrents.some(t => t.infohash && activeTorrents.has(t.infohash.toLowerCase()))
    if (hasActive) return 'downloading'

    // Collecter tous les episode_id de la série et ceux organisés
    const allEpisodeIds = new Set<number>()
    const organizedEpisodeIds = new Set<number>()

    for (const season of serieData.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            if ((ep.torrents ?? []).length > 0 || (ep.paths ?? []).length > 0) {
                allEpisodeIds.add(ep.id)
            }
        }
    }

    // Vérifier via organized.json : si le filename du path est organisé
    for (const t of allTorrents) {
        const hash = t.infohash?.toLowerCase()
        if (!hash) continue
        const orgFiles = organized[hash] ?? {}
        if (Object.keys(orgFiles).length === 0) continue
        const resolved = buildResolvedEpisodes(serieData, hash, t.season_number)
        for (const ep of resolved) {
            if (orgFiles[ep.filename]) organizedEpisodeIds.add(ep.episode_id)
        }
    }

    if (allEpisodeIds.size === 0) return 'none'
    if (organizedEpisodeIds.size === 0) return 'none'
    if (organizedEpisodeIds.size >= allEpisodeIds.size) return 'complete'
    return 'partial'
}

app.get('/api/series', requireAuth, async (_req, res) => {
    try {
        const [apiData, availableIds] = await Promise.all([
            fankaiGet('/series'),
            readAvailable(),
        ])
        const availableSet = new Set<number>(availableIds)

        // Charger organized.json
        let organized: Record<string, Record<string, string>> = {}
        try {
            const orgPath = path.join(DATA_DIR, 'organized.json')
            if (fs.existsSync(orgPath))
                organized = JSON.parse(fs.readFileSync(orgPath, 'utf-8'))
        } catch {}

        // Récupérer les hashes actifs depuis qB (best effort)
        const activeTorrents = new Set<string>()
        try {
            const { category } = readSettings()
            const active = await dispatchList(category ?? 'fankai')
            for (const t of active) {
                if (t.hash && t.state === 'downloading') activeTorrents.add(t.hash.toLowerCase())
            }
        } catch {}

        const seriesRaw = (Array.isArray(apiData) ? apiData : (apiData.series ?? [])).map(normalizeSerie)

        // Charger les series data en parallèle uniquement pour celles qui ont des torrents
        const serieDataMap = new Map<number, any>()
        await Promise.all(
            seriesRaw
                .filter((s: any) => availableSet.has(s.id))
                .map(async (s: any) => {
                    const sd = await readSerieData(s.id)
                    if (sd) serieDataMap.set(s.id, sd)
                })
        )

        res.json({ series: seriesRaw.map((serie: any) => {
                const hasTorrents = availableSet.has(serie.id)
                const serieData   = serieDataMap.get(serie.id) ?? null
                return {
                    ...serie,
                    torrent_count : serieData ? extractTorrentsFromSerieData(serieData).length : 0,
                    has_torrents  : hasTorrents,
                    download_state: computeSerieDownloadState(serieData, organized, activeTorrents),
                }
            })})
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

app.get('/api/series/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id)
    try {
        const [serieRaw, seasonsData, serieData] = await Promise.all([
            fankaiGet(`/series/${id}`),
            fankaiGet(`/series/${id}/seasons`),
            readSerieData(id),
        ])
        const serie   = normalizeSerie(serieRaw)
        const seasons = Array.isArray(seasonsData) ? seasonsData : (seasonsData.seasons ?? [])

        // Fetch épisodes depuis l'API Fankai (avec original_filename, thumb_image, etc.)
        const seasonsWithEpisodes = await Promise.all(seasons.map(async (season: any) => {
            const epsData  = await fankaiGet(`/seasons/${season.id}/episodes`)
            const episodes = (Array.isArray(epsData) ? epsData : (epsData.episodes ?? [])).map(normalizeEpisode)
            return { ...normalizeSeason(season), episodes }
        }))

        // Charger organized.json
        let organized: Record<string, Record<string, string>> = {}
        try {
            const orgPath = path.join(DATA_DIR, 'organized.json')
            if (fs.existsSync(orgPath))
                organized = JSON.parse(fs.readFileSync(orgPath, 'utf-8'))
        } catch {}

        // ── Construire les maps torrent depuis series/{id}.json ───────────
        const availableEpisodeIds   = new Set<number>()
        const episodeTorrentMap     : Record<number, any> = {}  // episode_id → ref
        const seasonTorrentMapBySn  : Record<number, any> = {}  // season_number → ref
        const integraleTorrents     : any[] = []
        const packEpisodesTorrents  : any[] = []
        const organizedEpisodeIds   = new Set<number>()

        if (serieData) {
            // ── Torrents niveau série (pack_integrale) ──────────────────
            for (const t of (serieData.torrents ?? [])) {
                const ref = { torrent_url: t.torrent_url, magnet: t.magnet, type: 'pack_integrale', raw: t.title, manual: t.manual ?? false }
                integraleTorrents.push({ ...t, raw: t.title })

                const resolved = buildResolvedEpisodes(serieData, t.infohash)
                for (const ep of resolved) availableEpisodeIds.add(ep.episode_id)

                const orgFiles = organized[t.infohash?.toLowerCase()] ?? {}
                for (const ep of resolved) {
                    if (orgFiles[ep.filename]) organizedEpisodeIds.add(ep.episode_id)
                }
            }

            // ── Torrents niveau saison (pack_saison) ────────────────────
            for (const season of serieData.seasons ?? []) {
                for (const t of (season.torrents ?? [])) {
                    const ref = { torrent_url: t.torrent_url, magnet: t.magnet, type: 'pack_saison', raw: t.title, manual: t.manual ?? false }
                    seasonTorrentMapBySn[season.season_number] = ref

                    const resolved = buildResolvedEpisodes(serieData, t.infohash, season.season_number)
                    for (const ep of resolved) availableEpisodeIds.add(ep.episode_id)

                    const orgFiles = organized[t.infohash?.toLowerCase()] ?? {}
                    for (const ep of resolved) {
                        if (orgFiles[ep.filename]) organizedEpisodeIds.add(ep.episode_id)
                    }
                }

                // ── Torrents niveau épisode ─────────────────────────────
                for (const ep of season.episodes ?? []) {
                    for (const t of (ep.torrents ?? [])) {
                        const ref = { torrent_url: t.torrent_url, magnet: t.magnet, type: 'episode', raw: t.title, manual: t.manual ?? false, fankai: t.fankai ?? true }
                        episodeTorrentMap[ep.id] = ref
                        availableEpisodeIds.add(ep.id)

                        const orgFiles = organized[t.infohash?.toLowerCase()] ?? {}
                        const paths: any[] = ep.paths ?? []
                        const match = paths.find((p: any) => typeof p === 'object' && p.infohash?.toLowerCase() === t.infohash?.toLowerCase())
                        const filename = match ? match.path.split('/').pop() : null
                        if (filename && orgFiles[filename]) organizedEpisodeIds.add(ep.id)
                    }
                }
            }

            // Pack_saison multi-saisons → packEpisodesTorrents si couvre plusieurs saisons
            // (cas où un seul torrent couvre plusieurs saisons mais pas toutes → affiché en hero)
            // Pour l'instant on le traite comme pack_integrale si au niveau série
        }

        // ── Promotion intégrale ───────────────────────────────────────────
        // Si pas de pack_integrale explicite mais un pack_saison couvre toutes les saisons
        // → déjà géré car on met les torrents série en integraleTorrents directement

        // ── Enrichissement des saisons API ───────────────────────────────
        const enrichedSeasons = seasonsWithEpisodes.map((season: any) => {
            const eps = season.episodes.map((ep: any) => {
                const epTorrent = episodeTorrentMap[ep.id] ?? null

                // Si pas de torrent épisode, chercher le fankai du torrent qui couvre cet épisode via paths
                let fankai: boolean | null = epTorrent ? (epTorrent.fankai ?? true) : null
                if (fankai === null && serieData) {
                    // Chercher dans les torrents série/saison quel torrent a un path pour cet épisode
                    outer: for (const sd_season of serieData.seasons ?? []) {
                        for (const sdEp of sd_season.episodes ?? []) {
                            if (sdEp.id !== ep.id) continue
                            for (const p of sdEp.paths ?? []) {
                                const ih = typeof p === 'object' ? p.infohash?.toLowerCase() : null
                                if (!ih) continue
                                // Chercher dans les torrents série
                                for (const t of serieData.torrents ?? []) {
                                    if (t.infohash?.toLowerCase() === ih) { fankai = t.fankai ?? true; break outer }
                                }
                                // Chercher dans les torrents saison
                                for (const s of serieData.seasons ?? []) {
                                    for (const t of s.torrents ?? []) {
                                        if (t.infohash?.toLowerCase() === ih) { fankai = t.fankai ?? true; break outer }
                                    }
                                }
                            }
                        }
                    }
                }

                return {
                    ...ep,
                    available : availableEpisodeIds.has(ep.id),
                    torrent   : epTorrent ? { ...epTorrent, fankai: fankai ?? true } : null,
                    fankai    : fankai,
                    organized : organizedEpisodeIds.has(ep.id),
                }
            })
            const total    = eps.filter((e: any) => e.available).length
            const orgCount = eps.filter((e: any) => e.organized).length
            const seasonOrganizedState =
                orgCount === 0                     ? 'none'     :
                    orgCount >= total && total > 0     ? 'complete' : 'partial'
            return {
                ...season,
                torrent         : seasonTorrentMapBySn[season.season_number] ?? null,
                organized_state : seasonOrganizedState,
                organized_count : orgCount,
                episodes        : eps,
            }
        })

        // ── Hero bundles ──────────────────────────────────────────────────
        function packEpisodesLabel(t: any): string {
            return t.raw ?? t.title ?? 'Pack'
        }

        const heroBundles: any[] = [
            ...integraleTorrents.map(t => ({ label: 'Intégrale', torrent_url: t.torrent_url, magnet: t.magnet, raw: t.title ?? t.raw })),
            ...packEpisodesTorrents.map(t => ({ label: packEpisodesLabel(t), torrent_url: t.torrent_url, magnet: t.magnet, raw: t.title ?? t.raw }))
        ]

        res.json({ serie, seasons: enrichedSeasons, torrents_integrale: heroBundles })
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Download ───────────────────────────────────────────────────
app.post('/api/download', requireAuth, async (req, res) => {
    const url = req.body.magnet ?? req.body.torrent_url
    if (!url) { res.status(400).json({ error: 'torrent_url ou magnet requis' }); return }
    const results = await dispatchDownload(url)
    res.status(results.every((r: any) => r.ok) ? 200 : 207).json({ results })
})

// ── Downloads — liste torrents Fankai ──────────────────────────
app.get('/api/downloads', requireAuth, async (_req, res) => {
    try {
        const { category } = readSettings()
        const torrents = await dispatchList(category ?? 'fankai')

        let organized: Record<string, Record<string, string>> = {}
        try {
            const orgPath = path.join(DATA_DIR, 'organized.json')
            if (fs.existsSync(orgPath))
                organized = JSON.parse(fs.readFileSync(orgPath, 'utf-8'))
        } catch {}

        const enriched = await Promise.all(torrents.map(async (t: any) => {
            const orgFiles  = organized[t.hash] ?? {}
            // Chercher les métadonnées via le cache GitHub
            let totalFiles = 1
            try {
                const availableIds = await readAvailable()
                for (const id of availableIds) {
                    const sd = await readSerieData(id)
                    if (!sd) continue
                    const allT = extractTorrentsFromSerieData(sd)
                    const match = allT.find((st: any) => st.infohash?.toLowerCase() === t.hash?.toLowerCase())
                    if (match) {
                        const resolved = buildResolvedEpisodes(sd, match.infohash, match.season_number)
                        totalFiles = resolved.length || 1
                        break
                    }
                }
            } catch {}
            const doneFiles  = Object.keys(orgFiles).length
            let organizeState: 'none' | 'partial' | 'done' = 'none'
            if (doneFiles >= totalFiles) organizeState = 'done'
            else if (doneFiles > 0)      organizeState = 'partial'

            const notif = recentOrganized.find(n => n.hash === t.hash)
            const errorFiles = notif?.errorFiles ?? []

            return { ...t, organizeState, organizeProgress: { done: doneFiles, total: totalFiles }, errorFiles }
        }))

        res.json(enriched)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Résultats d'organisation récents ──────────────────────────
interface OrganizeNotif {
    hash       : string
    name       : string
    done       : number
    skipped    : number
    errors     : number
    errorFiles : { file: string; error: string }[]
    at         : string
}
const recentOrganized: OrganizeNotif[] = []
const MAX_NOTIFS = 20

function pushNotif(n: OrganizeNotif) {
    recentOrganized.unshift(n)
    if (recentOrganized.length > MAX_NOTIFS) recentOrganized.pop()
}

app.get('/api/organize/recent', requireAuth, (_req, res) => {
    res.json(recentOrganized)
})

app.post('/api/organize/recent/clear', requireAuth, (_req, res) => {
    recentOrganized.length = 0
    res.json({ ok: true })
})

app.post('/api/organize', requireAuth, async (req, res) => {
    const { hash, name, save_path } = req.body
    if (!hash || !name || !save_path) {
        res.status(400).json({ error: 'hash, name et save_path requis' })
        return
    }
    try {
        const seriesData = await loadEnrichedSeriesData()
        const result     = await organizeTorrent(hash, name, save_path, seriesData)
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Logs ──────────────────────────────────────────────────────
app.get('/api/logs', requireAuth, (req, res) => {
    const limit  = Number(req.query.limit)  || 100
    const level  = (req.query.level  as string) || 'all'
    const source = (req.query.source as string) || undefined
    const entries = readLogs({ limit, level: level as any, source })
    res.json({ entries, size: logsFileSize() })
})

app.post('/api/logs/clear', requireAuth, (_req, res) => {
    clearLogs()
    logger.info('api', 'Logs effacés')
    res.json({ ok: true })
})

// ── System info ────────────────────────────────────────────────
app.get('/api/system', requireAuth, (_req, res) => {
    const isDocker = fs.existsSync('/.dockerenv')
    res.json({ isDocker })
})

app.get('/api/browse', requireAuth, (req, res) => {
    const dirPath = (req.query.path as string) || '/'
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true })
        const dirs = entries
            .filter(e => e.isDirectory())
            .map(e => e.name)
            .filter(n => !n.startsWith('.'))
            .sort((a, b) => a.localeCompare(b))
        const parent = dirPath === '/' ? null : path.dirname(dirPath)
        res.json({ path: dirPath, parent, dirs })
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur lecture dossier' })
    }
})

app.get('/api/torrents/status', requireAuth, async (_req, res) => {
    try {
        const available = await readAvailable()
        res.json({ exists: available.length > 0, count: available.length, empty: available.length === 0 })
    } catch { res.json({ exists: false, count: 0, empty: true }) }
})

// ── Update : vide le cache pour forcer le rechargement depuis GitHub ──────────
app.post('/api/update', requireAuth, async (_req, res) => {
    try {
        cacheClear()
        // Pré-charger available.json pour vérifier que GitHub répond
        const availableIds = await readAvailable()
        if (!Array.isArray(availableIds)) throw new Error('available.json invalide')
        res.json({ ok: true, count: availableIds.length })
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

app.post('/api/scan', requireAuth, async (_req, res) => {
    try {
        const { mediaPath } = readSettings()
        const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
        const seriesData = await loadEnrichedSeriesData()
        const result = await scanMediaPath(mediaPath, ORGANIZED_PATH, seriesData)
        logger.info('api', `Scan manuel: ${result.found} fichiers scannés, ${result.added} ajoutés`)
        res.json({ ok: true, ...result })
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── SPA fallback (prod) ────────────────────────────────────────
if (fs.existsSync(PUBLIC_PATH)) {
    app.get('*path', (_req, res) => {
        res.sendFile(path.join(PUBLIC_PATH, 'index.html'))
    })
}

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(`[fankarr] Serveur sur http://localhost:${PORT}`)
    console.log(`[fankarr] Cache GitHub TTL: 6h — premier fetch au démarrage...`)

    // Pré-chauffer le cache available.json au démarrage
    try {
        const available = await readAvailable()
        console.log(`[fankarr] ${available.length} séries disponibles (via GitHub)`)
    } catch (err) {
        console.warn(`[fankarr] ⚠ Impossible de charger available.json: ${err instanceof Error ? err.message : err}`)
    }

    // Scan initial du mediaPath
    const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
    const { mediaPath } = readSettings()
    loadEnrichedSeriesData().then(seriesData =>
        scanMediaPath(mediaPath, ORGANIZED_PATH, seriesData)
    ).catch(err =>
        logger.error('organize', `scanMediaPath échoué: ${err}`)
    )

    // Auto-organise — polling différentiel toutes les 5 minutes
    // Le worker ne se lance que si un torrent vient de passer en seeding
    const autoOrganize = async () => {
        try {
            const { category } = readSettings()
            const seriesData   = await loadEnrichedSeriesData()
            await autoOrganizeAll(
                () => dispatchList(category ?? 'fankai'),
                seriesData,
                (result) => {
                    if (result.done > 0 || result.errors > 0) {
                        pushNotif({ ...result, at: new Date().toISOString() })
                    }
                }
            )
        } catch (err) {
            console.error('[organize] Erreur auto-organise:', err)
        }
    }
    // Premier run 10s après démarrage, puis toutes les 5 minutes
    setTimeout(() => {
        autoOrganize()
        setInterval(autoOrganize, 5 * 60_000)
    }, 10_000)
})