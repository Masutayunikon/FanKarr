import express from 'express'
import cookieParser from 'cookie-parser'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { authStatus, authSetup, authLogin, authLogout, requireAuth } from './auth.js'
import { readSettings, writeSettings } from './settings.js'
import {
    registerDriver, getDriver, getAvailableClients,
    listClients, addClient, removeClient, getClient,
    sanitizeClient, dispatchDownload, dispatchList, updateClient, dispatchRemove
} from './torrent-clients/index.js'
import qbittorrentDriver  from './torrent-clients/qbittorrent.js'
import transmissionDriver from './torrent-clients/transmission.js'
import synologyDsDriver   from './torrent-clients/synology-ds.js'
import utorrentDriver     from './torrent-clients/utorrent.js'
import rtorrentDriver     from './torrent-clients/rtorrent.js'
import { organizeTorrent, autoOrganizeAll, scanMediaPath, workerRunning } from './organize.js'
import { logger, readLogs, clearLogs, logsFileSize } from './logger.js'
import { DATA_DIR, BASE_DIR } from './config.js'
import { systemInfo } from './system.js'
import { getGitlabTitle } from './gitlab-map.js'

registerDriver(qbittorrentDriver)
registerDriver(transmissionDriver)
registerDriver(synologyDsDriver)
registerDriver(utorrentDriver)
registerDriver(rtorrentDriver)

const app  = express()
const PORT = Number(process.env.PORT) || 9898
const FANKAI_API  = 'https://metadata.fankai.fr'
const GITHUB_BASE = process.env.GITHUB_BASE
    ?? 'https://raw.githubusercontent.com/masutayunikon/fankarr-scraper/main'

app.use(express.json())
app.use(cookieParser())

const PUBLIC_PATH = path.join(BASE_DIR, 'public')
if (fs.existsSync(PUBLIC_PATH)) {
    app.use(express.static(PUBLIC_PATH))
}

// ── Auth ───────────────────────────────────────────────────────
app.get('/api/auth/status', authStatus)
app.post('/api/auth/setup',  authSetup)
app.post('/api/auth/login',  authLogin)
app.post('/api/auth/logout', authLogout)

app.get('/api/system/info', systemInfo)

// ── Settings ───────────────────────────────────────────────────
app.get('/api/settings', requireAuth, (_req, res) => {
    res.json(readSettings())
})
app.post('/api/settings', requireAuth, (req, res) => {
    const { mediaPath, completePath, organizeMode, category, nfoSupport, autoImport, devMode, deleteTorrentOnMove, autoUnimportMissing } = req.body
    const patch: Record<string, any> = {}
    if (mediaPath             !== undefined) patch.mediaPath             = mediaPath
    if (completePath          !== undefined) patch.completePath          = completePath
    if (organizeMode          !== undefined) patch.organizeMode          = organizeMode
    if (category              !== undefined) patch.category              = category
    if (nfoSupport            !== undefined) patch.nfoSupport            = nfoSupport
    if (autoImport            !== undefined) patch.autoImport            = autoImport
    if (devMode               !== undefined) patch.devMode               = devMode
    if (deleteTorrentOnMove   !== undefined) patch.deleteTorrentOnMove   = deleteTorrentOnMove
    if (autoUnimportMissing   !== undefined) patch.autoUnimportMissing   = autoUnimportMissing
    const updated = writeSettings(patch)
    logger.info('api', 'Paramètres mis à jour')
    res.json(updated)
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
    if (!getDriver(type))          { res.status(400).json({ error: `Type inconnu : ${type}` }); return }
    res.json(sanitizeClient(addClient(name, type, config)))
})
app.delete('/api/torrent-clients/:uuid', requireAuth, (req, res) => {
    const ok = removeClient(String(req.params.uuid))
    if (!ok) { res.status(404).json({ error: 'Client introuvable' }); return }
    res.json({ ok: true })
})
app.put('/api/torrent-clients/:uuid', requireAuth, (req, res) => {
    const { name, type, config } = req.body
    if (!name || !type || !config) { res.status(400).json({ error: 'name, type et config requis' }); return }
    if (!getDriver(type))          { res.status(400).json({ error: `Type inconnu : ${type}` }); return }
    const oldClient = getClient(String(req.params.uuid))
    if (oldClient) {
        const driver = getDriver(type)
        if (driver) {
            for (const field of driver.definition.fields) {
                if (field.type === 'password' && config[field.key] === '••••••••') {
                    config[field.key] = oldClient.config[field.key]
                }
            }
        }
    }
    const updated = updateClient(String(req.params.uuid), name, type, config)
    if (!updated) { res.status(404).json({ error: 'Client introuvable' }); return }
    res.json(sanitizeClient(updated))
})
app.post('/api/torrent-clients/test-config', requireAuth, async (req, res) => {
    const { type, config, uuid } = req.body
    if (!type || !config) { res.status(400).json({ error: 'type et config requis' }); return }
    const driver = getDriver(type)
    if (!driver) { res.status(400).json({ error: `Type inconnu : ${type}` }); return }
    if (uuid) {
        const oldClient = getClient(uuid)
        if (oldClient) {
            for (const field of driver.definition.fields) {
                if (field.type === 'password' && config[field.key] === '••••••••') {
                    config[field.key] = oldClient.config[field.key]
                }
            }
        }
    }
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
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

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
    const cached = cacheGet(urlPath)
    if (cached) return cached
    const res = await fetch(`${GITHUB_BASE}/${urlPath}`)
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${urlPath}`)
    const data = await res.json()
    cacheSet(urlPath, data)
    return data
}

async function readAvailable(): Promise<number[]> {
    try { return await githubGet('available.json') as number[] }
    catch { return [] }
}

async function readInfohashMap(): Promise<Record<string, string>> {
    try { return await githubGet('infohash_map.json') as Record<string, string> }
    catch { return {} }
}

async function readSerieData(serieId: number): Promise<any | null> {
    try { return await githubGet(`series/${serieId}.json`) }
    catch { return null }
}

function extractTorrentsFromSerieData(sd: any): any[] {
    const result: any[] = []
    if (!sd) return result
    for (const t of sd.torrents ?? []) {
        result.push({ ...t, raw: t.title, type: 'pack_integrale', serie_id: sd.id, serie_title: sd.title, _serieLevel: true, _serieData: sd, _torrentIdx: (sd.torrents ?? []).indexOf(t) })
    }
    for (const season of sd.seasons ?? []) {
        for (const t of season.torrents ?? []) {
            result.push({ ...t, raw: t.title, type: 'pack_saison', serie_id: sd.id, serie_title: sd.title, season_id: season.id, season_number: season.season_number, _seasonLevel: true, _season: season, _torrentIdx: (season.torrents ?? []).indexOf(t) })
        }
        for (const ep of season.episodes ?? []) {
            for (const t of ep.torrents ?? []) {
                result.push({ ...t, raw: t.title, type: 'episode', serie_id: sd.id, serie_title: sd.title, season_id: season.id, season_number: season.season_number, episode_id: ep.id, episode_number: ep.episode_number, _episodeLevel: true, _episode: ep, _torrentIdx: (ep.torrents ?? []).indexOf(t) })
            }
        }
    }
    return result
}

function buildResolvedEpisodes(sd: any, hash: string, seasonFilter?: number): any[] {
    const resolved: any[] = []
    const h = hash.toLowerCase()
    for (const season of sd.seasons ?? []) {
        if (seasonFilter !== undefined && season.season_number !== seasonFilter) continue
        for (const ep of season.episodes ?? []) {
            const paths: any[] = ep.paths ?? []
            let filePath: string | null = null
            for (const p of paths) {
                if (typeof p === 'string') { if (!filePath) filePath = p.replace(/\\/g, '/') }
                else if (p?.infohash?.toLowerCase() === h) { filePath = p.path.replace(/\\/g, '/'); break }
            }
            if (!filePath) continue
            const filename = filePath.split('/').pop() ?? filePath
            resolved.push({ episode_id: ep.id, episode_number: ep.episode_number, season_number: season.season_number, season_id: season.id, filename, original_filename: filename })
        }
    }
    return resolved
}

async function fankaiGet(endpoint: string): Promise<any> {
    const res = await fetch(`${FANKAI_API}${endpoint}`)
    if (!res.ok) throw new Error(`Fankai API ${res.status}: ${endpoint}`)
    return res.json()
}

function imgProxy(url: string | null | undefined, w: number, q = 70): string | null {
    if (!url) return null
    const stripped = url.replace(/^https?:\/\//, '')
    return `https://wsrv.nl/?url=${stripped}&w=${w}&q=${q}`
}

function normalizeSerie(serie: any): any {
    return { ...serie, poster_image: imgProxy(serie.poster_image ?? serie.images?.poster ?? null, 300), fanart_image: imgProxy(serie.fanart_image ?? serie.images?.fanart ?? null, 1280, 60) }
}
function normalizeSeason(season: any): any {
    return { ...season, poster_image: imgProxy(season.poster_image ?? season.images?.poster ?? null, 300) }
}
function normalizeEpisode(ep: any): any {
    return { ...ep, thumb_image: imgProxy(ep.thumb_image ?? ep.thumbnail ?? null, 400) }
}

async function loadEnrichedSeriesData(): Promise<any[]> {
    const ids   = await readAvailable()
    const allSd = await Promise.all(ids.map(id => readSerieData(id)))
    return allSd.filter(Boolean)
}

function computeSerieDownloadState(serieData: any | null, organized: Record<string, Record<string, any>>, activeTorrents: Set<string>): 'none' | 'downloading' | 'partial' | 'complete' {
    if (!serieData) return 'none'
    const allTorrents = extractTorrentsFromSerieData(serieData)

    if (allTorrents.some(t => t.infohash && activeTorrents.has(t.infohash.toLowerCase()))) return 'downloading'

    // Collecter tous les épisodes de la série
    const allEpisodeIds = new Set<number>()
    for (const season of serieData.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            allEpisodeIds.add(ep.id)
        }
    }

    const organizedEpisodeIds = new Set<number>()

    // Vérifier via les torrents
    for (const t of allTorrents) {
        const hash = t.infohash?.toLowerCase()
        if (!hash) continue
        const orgFiles = organized[hash] ?? {}
        if (Object.keys(orgFiles).length === 0) continue
        for (const ep of buildResolvedEpisodes(serieData, hash, t.season_number)) {
            const isOrganized = orgFiles[String(ep.episode_id)] !== undefined || orgFiles[ep.filename] !== undefined
            if (isOrganized) organizedEpisodeIds.add(ep.episode_id)
        }
    }

    // Vérifier aussi les imports manuels (clé "manual" dans organized.json)
    const manualOrg = organized['manual'] ?? {}
    for (const season of serieData.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            if (manualOrg[String(ep.id)]) organizedEpisodeIds.add(ep.id)
        }
    }

    if (allEpisodeIds.size === 0 || organizedEpisodeIds.size === 0) return 'none'
    if (organizedEpisodeIds.size >= allEpisodeIds.size) return 'complete'
    return 'partial'
}

// ── Routes série ───────────────────────────────────────────────
app.get('/api/series', requireAuth, async (_req, res) => {
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

app.get('/api/series/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id)
    try {
        const [serieRaw, seasonsData, serieData] = await Promise.all([fankaiGet(`/series/${id}`), fankaiGet(`/series/${id}/seasons`), readSerieData(id)])
        const serie   = normalizeSerie(serieRaw)
        const seasons = Array.isArray(seasonsData) ? seasonsData : (seasonsData.seasons ?? [])
        const seasonsWithEpisodes = await Promise.all(seasons.map(async (season: any) => {
            const epsData  = await fankaiGet(`/seasons/${season.id}/episodes`)
            const episodes = (Array.isArray(epsData) ? epsData : (epsData.episodes ?? [])).map(normalizeEpisode)
            return { ...normalizeSeason(season), episodes }
        }))
        let organized: Record<string, Record<string, any>> = {}
        try { const p = path.join(DATA_DIR, 'organized.json'); if (fs.existsSync(p)) organized = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}
        const availableEpisodeIds  = new Set<number>()
        const episodeTorrentMap    : Record<number, any> = {}
        const seasonTorrentMapBySn : Record<number, any> = {}
        const integraleTorrents    : any[] = []
        const organizedEpisodeIds  = new Set<number>()

        // Vérifier les imports manuels (clé "manual") pour tous les épisodes de la série
        const manualOrg = organized['manual'] ?? {}
        if (serieData) {
            for (const season of serieData.seasons ?? []) {
                for (const ep of season.episodes ?? []) {
                    if (manualOrg[String(ep.id)]) organizedEpisodeIds.add(ep.id)
                }
            }
        }
        if (serieData) {
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
                    seasonTorrentMapBySn[season.season_number] = { torrent_url: t.torrent_url, magnet: t.magnet, type: 'pack_saison', raw: t.title, manual: t.manual ?? false }
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
                        episodeTorrentMap[ep.id] = { torrent_url: t.torrent_url, magnet: t.magnet, type: 'episode', raw: t.title, manual: t.manual ?? false, fankai: t.fankai ?? true }
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
                }
            }
        }
        const enrichedSeasons = seasonsWithEpisodes.map((season: any) => {
            const eps = season.episodes.map((ep: any) => {
                const epTorrent = episodeTorrentMap[ep.id] ?? null
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
                return { ...ep, available: availableEpisodeIds.has(ep.id), torrent: epTorrent ? { ...epTorrent, fankai: fankai ?? true } : null, fankai, organized: organizedEpisodeIds.has(ep.id) }
            })
            const total    = eps.filter((e: any) => e.available).length
            const orgCount = eps.filter((e: any) => e.organized).length
            const epTotal  = eps.length  // total réel incluant les imports manuels
            const orgState = orgCount === 0
                ? 'none'
                : orgCount >= epTotal
                    ? 'complete'
                    : total > 0 && orgCount >= total
                        ? 'complete'
                        : 'partial'
            return { ...season, torrent: seasonTorrentMapBySn[season.season_number] ?? null, organized_state: orgState, organized_count: orgCount, episodes: eps }
        })
        res.json({ serie, seasons: enrichedSeasons, torrents_integrale: integraleTorrents.map(t => ({ label: 'Intégrale', torrent_url: t.torrent_url, magnet: t.magnet, raw: t.title ?? t.raw })) })
    } catch (err) {
        logger.error('api', `GET /api/series/${id} échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Download ───────────────────────────────────────────────────
app.post('/api/download', requireAuth, async (req, res) => {
    const url = req.body.magnet ?? req.body.torrent_url
    if (!url) { res.status(400).json({ error: 'torrent_url ou magnet requis' }); return }
    logger.info('api', 'Téléchargement demandé')
    const results = await dispatchDownload(url)
    res.status(results.every((r: any) => r.ok) ? 200 : 207).json({ results })
})

app.delete('/api/torrent/:hash', requireAuth, async (req, res) => {
    const hash        = String(req.params.hash)
    const deleteFiles = req.query.deleteFiles === 'true'
    if (!hash) { res.status(400).json({ error: 'hash requis' }); return }
    try {
        const result = await dispatchRemove(hash, deleteFiles)
        res.json(result)
    } catch (err) {
        logger.error('api', `Suppression torrent échouée : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Downloads list ─────────────────────────────────────────────
app.get('/api/downloads', requireAuth, async (_req, res) => {
    try {
        const { category } = readSettings()
        const infohashMap = await readInfohashMap()
        const torrents = await dispatchList(category ?? 'fankai', infohashMap)
        let organized: Record<string, Record<string, any>> = {}
        try { const p = path.join(DATA_DIR, 'organized.json'); if (fs.existsSync(p)) organized = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}
        const enriched = await Promise.all(torrents.map(async (t: any) => {
            const orgFiles = organized[t.hash] ?? {}
            let totalFiles = 1
            try {
                const availableIds = await readAvailable()
                for (const id of availableIds) {
                    const sd = await readSerieData(id)
                    if (!sd) continue
                    const match = extractTorrentsFromSerieData(sd).find((st: any) => st.infohash?.toLowerCase() === t.hash?.toLowerCase())
                    if (match) { totalFiles = buildResolvedEpisodes(sd, match.infohash, match.season_number).length || 1; break }
                }
            } catch {}
            const doneFiles = Object.keys(orgFiles).length
            const organizeState: 'none' | 'partial' | 'done' = doneFiles >= totalFiles ? 'done' : doneFiles > 0 ? 'partial' : 'none'
            const notif = recentOrganized.find(n => n.hash === t.hash)
            return { ...t, organizeState, organizeProgress: { done: doneFiles, total: totalFiles }, errorFiles: notif?.errorFiles ?? [] }
        }))
        res.json(enriched)
    } catch (err) {
        logger.error('api', `GET /api/downloads échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Organize ───────────────────────────────────────────────────
interface OrganizeNotif {
    hash: string; name: string; done: number; skipped: number; errors: number
    errorFiles: { file: string; error: string }[]; at: string
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
    logger.info('api', 'Historique des imports effacé')
    res.json({ ok: true })
})
app.post('/api/organize', requireAuth, async (req, res) => {
    const { hash, name, save_path } = req.body
    if (!hash || !name || !save_path) { res.status(400).json({ error: 'hash, name et save_path requis' }); return }
    try {
        const seriesData = await loadEnrichedSeriesData()
        const result     = await organizeTorrent(hash, name, save_path, seriesData)
        if (result.done > 0 || result.errors.length > 0) {
            pushNotif({ hash, name, done: result.done, skipped: result.skipped, errors: result.errors.length, errorFiles: result.errors, at: new Date().toISOString() })
        }
        res.json(result)
    } catch (err) {
        logger.error('api', `Import manuel de "${name}" échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Logs ───────────────────────────────────────────────────────
app.get('/api/logs', requireAuth, (req, res) => {
    const limit   = Number(req.query.limit)  || 100
    const level   = (req.query.level  as string) || 'all'
    const source  = (req.query.source as string) || undefined
    res.json({ entries: readLogs({ limit, level: level as any, source }), size: logsFileSize() })
})
app.post('/api/logs/clear', requireAuth, (_req, res) => {
    clearLogs()
    logger.info('api', 'Logs effacés')
    res.json({ ok: true })
})

// ── Système ────────────────────────────────────────────────────
app.get('/api/system', requireAuth, (_req, res) => {
    res.json({ isDocker: fs.existsSync('/.dockerenv') })
})

app.get('/api/version', (_req, res) => {
    try {
        const versionPath = path.join(BASE_DIR, 'version.txt')
        const version = fs.existsSync(versionPath)
            ? fs.readFileSync(versionPath, 'utf-8').trim()
            : 'dev'
        res.json({ version })
    } catch {
        res.json({ version: 'dev' })
    }
})

app.get('/api/browse', requireAuth, (req, res) => {
    const dirPath = (req.query.path as string) || '/'
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true })
        const dirs    = entries.filter(e => e.isDirectory()).map(e => e.name).filter(n => !n.startsWith('.')).sort((a, b) => a.localeCompare(b))
        res.json({ path: dirPath, parent: dirPath === '/' ? null : path.dirname(dirPath), dirs })
    } catch (err) {
        logger.warn('api', `Lecture dossier "${dirPath}" impossible : ${err instanceof Error ? err.message : err}`)
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur lecture dossier' })
    }
})

app.get('/api/browse-files', requireAuth, (req, res) => {
    const dirPath = (req.query.path as string) || '/'
    const VIDEO_EXTS = new Set(['.mkv', '.mp4', '.avi', '.m4v', '.mov', '.wmv'])
    try {
        // Créer le dossier s'il n'existe pas (cas import manuel série non encore importée)
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
            logger.info('api', `Dossier créé : ${dirPath}`)
        }
        const files: { name: string; path: string; size: number }[] = []
        function walk(dir: string) {
            let entries: fs.Dirent[]
            try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
            catch { return }
            for (const entry of entries) {
                if (entry.name.startsWith('.')) continue
                const full = path.join(dir, entry.name)
                if (entry.isDirectory()) {
                    walk(full)
                } else if (entry.isFile() && VIDEO_EXTS.has(path.extname(entry.name).toLowerCase())) {
                    try {
                        const stat = fs.statSync(full)
                        files.push({ name: entry.name, path: full, size: stat.size })
                    } catch {}
                }
            }
        }
        walk(dirPath)
        files.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        res.json({ path: dirPath, files })
    } catch (err) {
        logger.warn('api', `browse-files "${dirPath}" : ${err instanceof Error ? err.message : err}`)
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur lecture dossier' })
    }
})

app.get('/api/torrents/status', requireAuth, async (_req, res) => {
    try {
        const available = await readAvailable()
        res.json({ exists: available.length > 0, count: available.length, empty: available.length === 0 })
    } catch { res.json({ exists: false, count: 0, empty: true }) }
})

app.post('/api/update', requireAuth, async (_req, res) => {
    try {
        cacheClear()
        logger.info('api', 'Cache GitHub vidé — rechargement forcé')
        const availableIds = await readAvailable()
        if (!Array.isArray(availableIds)) throw new Error('available.json invalide')
        logger.info('api', `Catalogue rechargé — ${availableIds.length} séries disponibles`)
        res.json({ ok: true, count: availableIds.length })
    } catch (err) {
        logger.error('api', `Mise à jour catalogue échouée : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

app.post('/api/scan', requireAuth, async (_req, res) => {
    try {
        const { mediaPath } = readSettings()
        logger.info('api', 'Scan médiathèque manuel lancé')
        const seriesData = await loadEnrichedSeriesData()
        const result     = await scanMediaPath(mediaPath, path.join(DATA_DIR, 'organized.json'), seriesData)
        res.json({ ok: true, ...result })
    } catch (err) {
        logger.error('api', `Scan médiathèque échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Import manuel ──────────────────────────────────────────────
app.post('/api/manual-import', requireAuth, async (req, res) => {
    const { serie_id, items } = req.body
    if (!serie_id || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'serie_id et items requis' }); return
    }
    const { mediaPath, organizeMode, nfoSupport } = readSettings()
    const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
    let organized: Record<string, Record<string, any>> = {}
    try { if (fs.existsSync(ORGANIZED_PATH)) organized = JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8')) } catch {}
    const sd = await readSerieData(Number(serie_id))
    if (!sd) { res.status(404).json({ error: 'Série introuvable dans le catalogue' }); return }
    const rawTitle   = sd.title ?? sd.show_title ?? ''
    const serieTitle = rawTitle.replace(/:/g, ' -').replace(/[<>"/\\|?*]/g, '').replace(/\s+/g, ' ').trim()
    const episodeIndex = new Map<number, { ep: any; season: any }>()
    for (const season of sd.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            episodeIndex.set(ep.id, { ep, season })
        }
    }
    const done: number[] = []
    const errors: { file: string; error: string }[] = []
    for (const item of items) {
        const { file_path, episode_id, hash } = item
        if (!file_path || !episode_id) { errors.push({ file: file_path ?? '?', error: 'Paramètres manquants' }); continue }
        const found = episodeIndex.get(Number(episode_id))
        if (!found) { errors.push({ file: file_path, error: `Épisode ${episode_id} introuvable` }); continue }
        const { ep, season } = found
        const srcFilename   = path.basename(file_path)
        const srcExt        = path.extname(srcFilename)
        const fmtName       = ep.formatted_name?.trim() ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '') + '.mkv' : null
        const resolvedName  = nfoSupport
            ? (ep.nfo_filename ?? ep.original_filename ?? srcFilename)
            : (fmtName ?? ep.nfo_filename ?? ep.original_filename ?? srcFilename)
        // FIX : swap l'extension avec celle du fichier source (.nfo/.mkv → .mp4 si besoin)
        const resolvedExt  = path.extname(resolvedName)
        const destFilename = resolvedExt && resolvedExt !== srcExt
            ? resolvedName.slice(0, -resolvedExt.length) + srcExt
            : resolvedName
        const seasonFolder  = season.season_number === 0 ? 'Specials' : `Saison ${season.season_number}`
        const destDir       = path.join(mediaPath, serieTitle, seasonFolder)
        const destPath      = path.join(destDir, destFilename)
        try {
            if (!fs.existsSync(file_path)) throw new Error('Fichier source introuvable')
            fs.mkdirSync(destDir, { recursive: true })

            if (file_path !== destPath) {
                const serieRootPath  = path.join(mediaPath, serieTitle)
                const isInSeriePath  = file_path.startsWith(serieRootPath + path.sep) || file_path.startsWith(serieRootPath + '/')

                if (isInSeriePath && !fs.existsSync(destPath)) {
                    fs.renameSync(file_path, destPath)
                    logger.info('api', `Import manuel (rename) : "${srcFilename}" → "${destFilename}"`)
                } else if (!isInSeriePath && !fs.existsSync(destPath)) {
                    if (organizeMode === 'hardlink') {
                        try { fs.linkSync(file_path, destPath) }
                        catch { await fs.promises.copyFile(file_path, destPath) }
                    } else if (organizeMode === 'move') {
                        try { fs.renameSync(file_path, destPath) }
                        catch {
                            await fs.promises.copyFile(file_path, destPath)
                            await fs.promises.unlink(file_path)
                        }
                    } else {
                        await fs.promises.copyFile(file_path, destPath)
                    }
                    logger.info('api', `Import manuel : "${srcFilename}" → "${destPath}"`)
                }
            } else {
                // src === dest — fichier déjà au bon endroit, juste marquer
                logger.debug('api', `Import manuel : "${srcFilename}" déjà en place`)
            }

            const torrentHash = String(hash || '').toLowerCase() || 'manual'
            if (!organized[torrentHash]) organized[torrentHash] = {}
            organized[torrentHash][String(episode_id)] = {
                at: new Date().toISOString(), season: season.season_number,
                episode: ep.episode_number, episode_id: ep.id,
                src_filename: srcFilename, dest_filename: destFilename, dest_path: destPath,
            }
            done.push(episode_id)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            errors.push({ file: srcFilename, error: msg })
            logger.error('api', `Import manuel échoué pour "${srcFilename}" : ${msg}`)
        }
    }
    fs.writeFileSync(ORGANIZED_PATH, JSON.stringify(organized, null, 2), 'utf-8')

    // Télécharger les NFO en arrière-plan si activé
    if (nfoSupport && done.length > 0) {
        const gitlabTitle = getGitlabTitle(serieTitle)
        ;(async () => {
            try {
                let files: any[] = [], page = 1
                while (true) {
                    const batch = await fetch(`${GITLAB_API_NFO}/tree?path=${encodeURIComponent('pack/' + gitlabTitle)}&recursive=true&per_page=100&page=${page}&ref=main`, { headers: { 'User-Agent': 'fankarr' } }).then(r => r.ok ? r.json() : [])
                    if (!Array.isArray(batch) || batch.length === 0) break
                    files.push(...batch); if (batch.length < 100) break; page++
                }
                for (const entry of files.filter((f: any) => f.type === 'blob')) {
                    const rel  = entry.path.replace(`pack/${gitlabTitle}/`, '')
                    const dest = path.join(mediaPath, serieTitle, rel)
                    if (fs.existsSync(dest)) continue
                    const raw  = await fetch(`${GITLAB_RAW_NFO}/${encodeURIComponent(gitlabTitle)}/${rel.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'User-Agent': 'fankarr' } })
                    if (!raw.ok) continue
                    fs.mkdirSync(path.dirname(dest), { recursive: true })
                    fs.writeFileSync(dest, Buffer.from(await raw.arrayBuffer()))
                }
                logger.info('api', `NFO téléchargés pour "${gitlabTitle}" (import manuel)`)
            } catch (err) {
                logger.warn('api', `Échec téléchargement NFO pour "${gitlabTitle}" : ${err instanceof Error ? err.message : err}`)
            }
        })()
    }

    res.json({ ok: true, done: done.length, errors })
})

app.get('/api/organized/:serieId', requireAuth, async (req, res) => {
    const serieId = Number(req.params.serieId)
    try {
        const sd = await readSerieData(serieId)
        if (!sd) { res.status(404).json({ error: 'Série introuvable' }); return }
        let organized: Record<string, Record<string, any>> = {}
        try { const p = path.join(DATA_DIR, 'organized.json'); if (fs.existsSync(p)) organized = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}
        const result: Record<string, any> = {}
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                for (const p of ep.paths ?? []) {
                    if (typeof p !== 'object' || !p.infohash) continue
                    const hash    = p.infohash.toLowerCase()
                    const entry   = (organized[hash] ?? {})[String(ep.id)]
                    if (entry) { result[String(ep.id)] = entry; break }
                }
                if (!result[String(ep.id)] && organized['manual']?.[String(ep.id)]) {
                    result[String(ep.id)] = organized['manual'][String(ep.id)]
                }
            }
        }
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Rename épisode ─────────────────────────────────────────────
// Renomme un fichier déjà importé selon le mode actuel (nfoSupport)
app.post('/api/rename-episode', requireAuth, async (req, res) => {
    const { serie_id, episode_id, torrent_hash } = req.body
    if (!serie_id || !episode_id) { res.status(400).json({ error: 'serie_id et episode_id requis' }); return }

    const { nfoSupport } = readSettings()
    const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
    let organized: Record<string, Record<string, any>> = {}
    try { if (fs.existsSync(ORGANIZED_PATH)) organized = JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8')) } catch {}

    const sd = await readSerieData(Number(serie_id))
    if (!sd) { res.status(404).json({ error: 'Série introuvable' }); return }

    // Trouver l'épisode dans les données
    let foundEp: any = null
    for (const season of sd.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            if (ep.id === Number(episode_id)) { foundEp = { ep, season }; break }
        }
        if (foundEp) break
    }
    if (!foundEp) { res.status(404).json({ error: 'Épisode introuvable' }); return }

    const { ep, season } = foundEp

    // Trouver l'entrée dans organized.json
    const hash = torrent_hash?.toLowerCase() ?? 'manual'
    const orgEntry = organized[hash]?.[String(episode_id)]
        ?? organized['manual']?.[String(episode_id)]
    if (!orgEntry) { res.status(404).json({ error: 'Épisode non importé' }); return }

    // Calculer le nouveau nom selon le mode actuel
    // Le nom actuel réel = basename du dest_path (plus fiable que dest_filename)
    const currentName = orgEntry.dest_path ? path.basename(orgEntry.dest_path) : orgEntry.dest_filename
    const srcExt = path.extname(currentName)
    let newName: string
    if (nfoSupport) {
        newName = ep.nfo_filename
            ? ep.nfo_filename.replace(/\.[^.]+$/, '') + srcExt
            : currentName
    } else {
        newName = ep.formatted_name?.trim()
            ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt
            : currentName
    }

    if (newName === currentName) {
        res.json({ ok: true, renamed: false, message: 'Nom déjà correct' })
        return
    }

    const oldPath = orgEntry.dest_path
    const newPath = path.join(path.dirname(oldPath), newName)

    try {
        if (!fs.existsSync(oldPath)) throw new Error('Fichier source introuvable sur le disque')
        if (fs.existsSync(newPath)) throw new Error(`Un fichier avec ce nom existe déjà : ${newName}`)
        fs.renameSync(oldPath, newPath)

        // Mettre à jour organized.json
        const entryHash = organized[hash]?.[String(episode_id)] ? hash : 'manual'
        organized[entryHash][String(episode_id)] = {
            ...orgEntry,
            dest_filename: newName,
            dest_path    : newPath,
            at           : new Date().toISOString(),
        }
        fs.writeFileSync(ORGANIZED_PATH, JSON.stringify(organized, null, 2), 'utf-8')
        logger.info('api', `Rename : "${orgEntry.dest_filename}" → "${newName}"`)
        res.json({ ok: true, renamed: true, old_name: orgEntry.dest_filename, new_name: newName })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        logger.error('api', `Rename échoué pour ep ${episode_id} : ${msg}`)
        res.status(500).json({ error: msg })
    }
})

// ── Désimport série complète ───────────────────────────────────
app.delete('/api/organized/:serieId', requireAuth, async (req, res) => {
    const serieId    = String(req.params.serieId)
    const deleteFile = req.query.deleteFile === 'true'
    const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
    let organized: Record<string, Record<string, any>> = {}
    try { if (fs.existsSync(ORGANIZED_PATH)) organized = JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8')) } catch {}

    const sd = await readSerieData(Number(serieId))
    if (!sd) { res.status(404).json({ error: 'Série introuvable' }); return }

    const episodeIds = new Set<string>()
    for (const season of sd.seasons ?? []) {
        for (const ep of season.episodes ?? []) episodeIds.add(String(ep.id))
    }

    let removed = 0
    const errors: string[] = []

    for (const [hash, episodes] of Object.entries(organized)) {
        for (const epId of Object.keys(episodes)) {
            if (!episodeIds.has(epId)) continue
            const entry = episodes[epId]
            if (deleteFile && entry?.dest_path && fs.existsSync(entry.dest_path)) {
                try { fs.unlinkSync(entry.dest_path) } catch (err) { errors.push(entry.dest_path) }
            }
            delete organized[hash][epId]
            removed++
        }
        if (Object.keys(organized[hash]).length === 0) delete organized[hash]
    }

    fs.writeFileSync(ORGANIZED_PATH, JSON.stringify(organized, null, 2), 'utf-8')
    logger.info('api', `Désimport série ${serieId} — ${removed} épisode(s) retirés`)
    res.json({ ok: true, removed, errors })
})

// ── Désimport épisode ──────────────────────────────────────────
app.delete('/api/organized/:serieId/:episodeId', requireAuth, async (req, res) => {
    const serieId   = String(req.params.serieId)
    const episodeId = String(req.params.episodeId)
    const deleteFile = req.query.deleteFile === 'true'
    const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
    let organized: Record<string, Record<string, any>> = {}
    try { if (fs.existsSync(ORGANIZED_PATH)) organized = JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8')) } catch {}

    // Chercher l'entrée dans tous les hash
    let foundHash: string | null = null
    let foundEntry: any = null
    for (const [hash, episodes] of Object.entries(organized)) {
        if (episodes[episodeId]) { foundHash = hash; foundEntry = episodes[episodeId]; break }
    }

    if (!foundHash || !foundEntry) { res.status(404).json({ error: 'Épisode non importé' }); return }

    try {
        if (deleteFile && foundEntry.dest_path && fs.existsSync(foundEntry.dest_path)) {
            fs.unlinkSync(foundEntry.dest_path)
            logger.info('api', `Désimport + suppression fichier : "${foundEntry.dest_path}"`)
        }

        delete organized[foundHash][episodeId]
        if (Object.keys(organized[foundHash]).length === 0) delete organized[foundHash]
        fs.writeFileSync(ORGANIZED_PATH, JSON.stringify(organized, null, 2), 'utf-8')
        logger.info('api', `Désimport ep ${episodeId} (série ${serieId})`)
        res.json({ ok: true })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        logger.error('api', `Désimport échoué : ${msg}`)
        res.status(500).json({ error: msg })
    }
})

// ── Récap global des imports ───────────────────────────────────
app.get('/api/organized-summary', requireAuth, async (_req, res) => {
    try {
        const { nfoSupport } = readSettings()
        const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
        let organized: Record<string, Record<string, any>> = {}
        try { if (fs.existsSync(ORGANIZED_PATH)) organized = JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8')) } catch {}

        const seriesData = await loadEnrichedSeriesData()
        const result: any[] = []

        for (const sd of seriesData) {
            const rawTitle   = sd.title ?? sd.show_title ?? ''
            const serieTitle = rawTitle.replace(/:/g, ' -').replace(/[<>"/\\|?*]/g, '').replace(/\s+/g, ' ').trim()
            const episodes: any[] = []

            for (const season of sd.seasons ?? []) {
                for (const ep of season.episodes ?? []) {
                    // Chercher l'entrée dans organized.json
                    let orgEntry: any = null
                    let orgHash: string | null = null
                    for (const [hash, eps] of Object.entries(organized)) {
                        if (eps[String(ep.id)]) { orgEntry = eps[String(ep.id)]; orgHash = hash; break }
                    }
                    if (!orgEntry) continue

                    // Nom réel sur disque = basename du dest_path (plus fiable que dest_filename)
                    const currentName = orgEntry.dest_path
                        ? path.basename(orgEntry.dest_path)
                        : orgEntry.dest_filename
                    const srcExt = path.extname(currentName)

                    // Calculer le nom attendu selon nfoSupport actuel
                    let expectedName: string
                    if (nfoSupport) {
                        expectedName = ep.nfo_filename
                            ? ep.nfo_filename.replace(/\.[^.]+$/, '') + srcExt
                            : currentName
                    } else {
                        expectedName = ep.formatted_name?.trim()
                            ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt
                            : currentName
                    }

                    const needsRename = expectedName !== currentName
                    const fileExists  = orgEntry.dest_path ? fs.existsSync(orgEntry.dest_path) : false
                    episodes.push({
                        episode_id    : ep.id,
                        episode_number: ep.episode_number,
                        season_number : season.season_number,
                        title         : ep.title,
                        current_name  : currentName,
                        expected_name : expectedName,
                        dest_path     : orgEntry.dest_path,
                        torrent_hash  : orgHash,
                        needs_rename  : needsRename,
                        file_exists   : fileExists,
                    })
                }
            }

            if (episodes.length > 0) {
                const needsRenameCount = episodes.filter(e => e.needs_rename).length
                result.push({
                    serie_id         : sd.id,
                    serie_title      : rawTitle,
                    serie_title_clean: serieTitle,
                    total            : episodes.length,
                    needs_rename     : needsRenameCount,
                    episodes,
                })
            }
        }

        res.json({ series: result, nfo_support: nfoSupport })
    } catch (err) {
        logger.error('api', `organized-summary échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Rename en masse ────────────────────────────────────────────
app.post('/api/rename-all', requireAuth, async (req, res) => {
    const { serie_id } = req.body  // optionnel — si absent, rename toutes les séries
    const { nfoSupport } = readSettings()
    const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
    let organized: Record<string, Record<string, any>> = {}
    try { if (fs.existsSync(ORGANIZED_PATH)) organized = JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8')) } catch {}

    const seriesData = await loadEnrichedSeriesData()
    const done: number[] = []
    const errors: { episode_id: number; error: string }[] = []

    for (const sd of seriesData) {
        if (serie_id && sd.id !== Number(serie_id)) continue

        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                let orgEntry: any = null
                let orgHash: string | null = null
                for (const [hash, eps] of Object.entries(organized)) {
                    if (eps[String(ep.id)]) { orgEntry = eps[String(ep.id)]; orgHash = hash; break }
                }
                if (!orgEntry || !orgHash) continue

                const currentName = orgEntry.dest_path ? path.basename(orgEntry.dest_path) : orgEntry.dest_filename
                const srcExt = path.extname(currentName)
                let expectedName: string
                if (nfoSupport) {
                    expectedName = ep.nfo_filename
                        ? ep.nfo_filename.replace(/\.[^.]+$/, '') + srcExt
                        : currentName
                } else {
                    expectedName = ep.formatted_name?.trim()
                        ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt
                        : currentName
                }

                if (expectedName === currentName) continue

                const oldPath = orgEntry.dest_path
                const newPath = path.join(path.dirname(oldPath), expectedName)

                try {
                    if (!fs.existsSync(oldPath)) { errors.push({ episode_id: ep.id, error: 'Fichier introuvable' }); continue }
                    if (fs.existsSync(newPath)) { errors.push({ episode_id: ep.id, error: `Fichier existant : ${expectedName}` }); continue }
                    fs.renameSync(oldPath, newPath)
                    organized[orgHash][String(ep.id)] = {
                        ...orgEntry, dest_filename: expectedName, dest_path: newPath, at: new Date().toISOString()
                    }
                    done.push(ep.id)
                    logger.info('api', `Rename masse : "${currentName}" → "${expectedName}"`)
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Erreur'
                    errors.push({ episode_id: ep.id, error: msg })
                }
            }
        }
    }

    fs.writeFileSync(ORGANIZED_PATH, JSON.stringify(organized, null, 2), 'utf-8')
    res.json({ ok: true, done: done.length, errors })
})
app.get('/api/debug/stats', requireAuth, (req, res) => {
    const { devMode } = readSettings()
    if (!devMode) { res.status(403).json({ error: 'Dev mode désactivé' }); return }
    const mem     = process.memoryUsage()
    const uptimeS = Math.floor(process.uptime())
    const h       = Math.floor(uptimeS / 3600)
    const m       = Math.floor((uptimeS % 3600) / 60)
    const s       = uptimeS % 60
    let organizedCount = 0
    try {
        const orgPath = path.join(DATA_DIR, 'organized.json')
        if (fs.existsSync(orgPath)) {
            const org = JSON.parse(fs.readFileSync(orgPath, 'utf-8'))
            organizedCount = Object.values(org).reduce((acc: number, episodes: any) => acc + Object.keys(episodes).length, 0)
        }
    } catch {}
    res.json({
        memory   : { heapUsed: Math.round(mem.heapUsed / 1024 / 1024), heapTotal: Math.round(mem.heapTotal / 1024 / 1024), rss: Math.round(mem.rss / 1024 / 1024) },
        cache    : { entries: _cache.size, ttlHours: 6 },
        uptime   : `${h}h ${m}m ${s}s`,
        uptimeSeconds: uptimeS,
        worker   : { running: workerRunning },
        organized: { trackedFiles: organizedCount },
        requests : { notifs: recentOrganized.length },
    })
})

// ── NFO Updates ────────────────────────────────────────────────
interface NfoUpdateNotif {
    serieTitle: string; commitSha: string; commitMsg: string
    updatedAt: string; status: 'updated' | 'error'; error?: string
}
const recentNfoUpdates: NfoUpdateNotif[] = []
const MAX_NFO_NOTIFS   = 30
const NFO_COMMITS_PATH = path.join(DATA_DIR, 'nfo_commits.json')
const GITLAB_API_NFO   = 'https://gitlab.com/api/v4/projects/ElPouki%2Ffankai_pack/repository'
const GITLAB_RAW_NFO   = 'https://gitlab.com/ElPouki/fankai_pack/-/raw/main/pack'

function loadNfoCommits(): Record<string, string> {
    try { if (!fs.existsSync(NFO_COMMITS_PATH)) return {}; return JSON.parse(fs.readFileSync(NFO_COMMITS_PATH, 'utf-8')) }
    catch { return {} }
}
function saveNfoCommits(commits: Record<string, string>) {
    fs.mkdirSync(path.dirname(NFO_COMMITS_PATH), { recursive: true })
    fs.writeFileSync(NFO_COMMITS_PATH, JSON.stringify(commits, null, 2), 'utf-8')
}

async function getLatestGitlabCommit(gitlabTitle: string): Promise<{ sha: string; message: string } | null> {
    try {
        const res = await fetch(`${GITLAB_API_NFO}/commits?path=${encodeURIComponent('pack/' + gitlabTitle)}&per_page=1&ref_name=main`, { headers: { 'User-Agent': 'fankarr' } })
        if (!res.ok) return null
        const data: any[] = await res.json()
        if (!data.length) return null
        return { sha: data[0].id, message: data[0].title ?? data[0].message ?? '' }
    } catch { return null }
}

async function downloadNfoFolder(gitlabTitle: string, destRoot: string): Promise<void> {
    let files: any[] = [], page = 1
    while (true) {
        const batch = await fetch(`${GITLAB_API_NFO}/tree?path=${encodeURIComponent('pack/' + gitlabTitle)}&recursive=true&per_page=100&page=${page}&ref=main`, { headers: { 'User-Agent': 'fankarr' } }).then(r => r.ok ? r.json() : [])
        if (!Array.isArray(batch) || batch.length === 0) break
        files.push(...batch); if (batch.length < 100) break; page++
    }
    let downloaded = 0, skipped = 0
    for (const entry of files.filter((f: any) => f.type === 'blob')) {
        const relativePath = entry.path.replace(`pack/${gitlabTitle}/`, '')
        const destPath     = path.join(destRoot, relativePath)
        try {
            const res = await fetch(`${GITLAB_RAW_NFO}/${encodeURIComponent(gitlabTitle)}/${relativePath.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'User-Agent': 'fankarr' } })
            if (!res.ok) { skipped++; continue }
            fs.mkdirSync(path.dirname(destPath), { recursive: true })
            fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()))
            downloaded++
        } catch { skipped++ }
    }
    logger.info('nfo-update', `"${gitlabTitle}" — ${downloaded} fichiers mis à jour, ${skipped} ignorés`)
}

async function checkNfoUpdates() {
    const { mediaPath, nfoSupport } = readSettings()
    if (!nfoSupport) return
    let organized: Record<string, Record<string, any>> = {}
    try { const p = path.join(DATA_DIR, 'organized.json'); if (fs.existsSync(p)) organized = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}
    if (Object.keys(organized).length === 0) return
    const seriesData  = await loadEnrichedSeriesData()
    const knownHashes = new Set(Object.keys(organized))
    const serieTitles = new Set<string>()
    for (const sd of seriesData) {
        const allTorrents = [...(sd.torrents ?? []), ...(sd.seasons ?? []).flatMap((s: any) => s.torrents ?? []), ...(sd.seasons ?? []).flatMap((s: any) => (s.episodes ?? []).flatMap((e: any) => e.torrents ?? []))]
        if (allTorrents.some((t: any) => knownHashes.has(t.infohash?.toLowerCase()))) {
            const rawTitle = sd.title ?? sd.show_title ?? ''
            if (rawTitle) serieTitles.add(rawTitle.replace(/:/g, ' -').replace(/[<>"/\\|?*]/g, '').replace(/\s+/g, ' ').trim())
        }
    }
    if (serieTitles.size === 0) return
    const commits = loadNfoCommits()
    let hasChanges = false
    for (const serieTitle of serieTitles) {
        const gitlabTitle = getGitlabTitle(serieTitle)
        const latest      = await getLatestGitlabCommit(gitlabTitle)
        if (!latest || commits[gitlabTitle] === latest.sha) continue
        logger.info('nfo-update', `MAJ NFO détectée pour "${gitlabTitle}" (${latest.sha.slice(0, 8)})`)
        try {
            await downloadNfoFolder(gitlabTitle, path.join(mediaPath, serieTitle))
            commits[gitlabTitle] = latest.sha
            hasChanges = true
            recentNfoUpdates.unshift({ serieTitle, commitSha: latest.sha.slice(0, 8), commitMsg: latest.message, updatedAt: new Date().toISOString(), status: 'updated' })
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.error('nfo-update', `Échec MAJ NFO "${gitlabTitle}" : ${msg}`)
            recentNfoUpdates.unshift({ serieTitle, commitSha: latest.sha.slice(0, 8), commitMsg: latest.message, updatedAt: new Date().toISOString(), status: 'error', error: msg })
        }
        if (recentNfoUpdates.length > MAX_NFO_NOTIFS) recentNfoUpdates.pop()
    }
    if (hasChanges) saveNfoCommits(commits)
}

app.get('/api/nfo-updates/recent', requireAuth, (_req, res) => { res.json(recentNfoUpdates) })
app.post('/api/nfo-updates/check', requireAuth, async (_req, res) => {
    logger.info('nfo-update', 'Vérification manuelle des MAJ NFO lancée')
    checkNfoUpdates().catch(err => logger.error('nfo-update', `Vérif manuelle échouée : ${err instanceof Error ? err.message : err}`))
    res.json({ ok: true, message: 'Vérification lancée en arrière-plan' })
})

// ── Catch-all SPA ──────────────────────────────────────────────
if (fs.existsSync(PUBLIC_PATH)) {
    app.get('*path', (_req, res) => { res.sendFile(path.join(PUBLIC_PATH, 'index.html')) })
}

// ── Démarrage ──────────────────────────────────────────────────
const server = http.createServer({ maxHeaderSize: 32768 }, app)

server.listen(PORT, async () => {
    logger.info('api', `Serveur démarré sur le port ${PORT}`)
    try {
        const available = await readAvailable()
        logger.info('api', `Cache GitHub initialisé — ${available.length} séries disponibles`)
    } catch (err) {
        logger.warn('api', `Impossible de charger available.json au démarrage : ${err instanceof Error ? err.message : err}`)
    }

    const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
    const { mediaPath }  = readSettings()

    // Migration organized.json : si ancien format (valeurs string) → reset + rescan
    try {
        if (fs.existsSync(ORGANIZED_PATH)) {
            const raw = JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8'))
            const isOldFormat = Object.values(raw).some((entries: any) =>
                Object.values(entries).some(v => typeof v === 'string')
            )
            if (isOldFormat) {
                logger.info('api', 'Migration organized.json : ancien format détecté → réinitialisation')
                fs.writeFileSync(ORGANIZED_PATH, '{}', 'utf-8')
            }
        }
    } catch {}

    loadEnrichedSeriesData()
        .then(seriesData => scanMediaPath(mediaPath, ORGANIZED_PATH, seriesData))
        .catch(err => logger.error('api', `Scan initial échoué : ${err instanceof Error ? err.message : err}`))

    const autoOrganize = async () => {
        try {
            const { category } = readSettings()
            const infohashMap  = await readInfohashMap()
            const seriesData   = await loadEnrichedSeriesData()
            await autoOrganizeAll(
                () => dispatchList(category ?? 'fankai', infohashMap),
                seriesData,
                async (result) => {
                    if (result.done > 0 || result.errors > 0) {
                        pushNotif({ ...result, at: new Date().toISOString() })
                    }
                    // Supprimer le torrent après move si option activée
                    const { organizeMode, deleteTorrentOnMove } = readSettings()
                    if (organizeMode === 'move' && deleteTorrentOnMove && result.done > 0) {
                        try {
                            await dispatchRemove(result.hash, false)
                            logger.info('api', `Torrent "${result.name}" supprimé après move`)
                        } catch (err) {
                            logger.warn('api', `Impossible de supprimer le torrent "${result.name}" : ${err instanceof Error ? err.message : err}`)
                        }
                    }
                }
            )
        } catch (err) {
            logger.error('api', `Auto-organise échoué : ${err instanceof Error ? err.message : err}`)
        }
    }

    setTimeout(() => {
        autoOrganize()
        setInterval(autoOrganize, 5 * 60_000)
    }, 10_000)

    setTimeout(() => {
        checkNfoUpdates().catch(err => logger.error('nfo-update', `Vérif initiale échouée : ${err instanceof Error ? err.message : err}`))
        setInterval(() => {
            checkNfoUpdates().catch(err => logger.error('nfo-update', `Vérif horaire échouée : ${err instanceof Error ? err.message : err}`))
        }, 60 * 60_000)
    }, 30_000)
})

// ── Plex ───────────────────────────────────────────────────────

const PLEX_TV_API = 'https://plex.tv/api/v2'

async function plexFetch(url: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Accept'                  : 'application/json',
            'X-Plex-Client-Identifier': 'fankarr',
            'X-Plex-Product'          : 'FanKarr',
            'X-Plex-Version'          : '1.0',
            ...(options.headers ?? {}),
        },
    })
    if (!res.ok) throw new Error(`Plex ${res.status}: ${await res.text()}`)
    const text = await res.text()
    return text ? JSON.parse(text) : {}
}

// POST /api/plex/connect — auth plex.tv + liste serveurs
app.post('/api/plex/connect', requireAuth, async (req, res) => {
    const { username, password, code } = req.body
    if (!username || !password) { res.status(400).json({ error: 'Email et mot de passe requis' }); return }

    try {
        const params = new URLSearchParams({ login: username, password })
        if (code) params.set('verificationCode', code)

        const authData = await plexFetch(`${PLEX_TV_API}/users/signin`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body   : params.toString(),
        })

        const token = authData.authToken ?? authData.user?.authToken
        if (!token) throw new Error('Token non reçu')

        // Récupérer les serveurs disponibles
        const resources = await plexFetch(
            'https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1&includeIPv6=1',
            { headers: { 'X-Plex-Token': token } }
        )

        const servers = (Array.isArray(resources) ? resources : [])
            .filter((r: any) => r.product === 'Plex Media Server')
            .map((r: any) => ({
                name       : r.name,
                owned      : r.owned,
                connections: (r.connections ?? []).map((c: any) => ({
                    uri  : c.uri,
                    local: c.local,
                    relay: c.relay,
                })),
            }))

        logger.info('plex', `Auth réussie pour ${username} — ${servers.length} serveur(s)`)
        res.json({ ok: true, token, servers })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        if (msg.includes('401')) {
            res.status(401).json({ error: '2FA requis ou identifiants incorrects', requires2FA: true })
        } else {
            logger.error('plex', `Auth échouée : ${msg}`)
            res.status(401).json({ error: 'Authentification échouée — vérifiez vos identifiants' })
        }
    }
})

// POST /api/plex/oauth/start — démarre le flow OAuth (Google, Apple, etc.)
app.post('/api/plex/oauth/start', requireAuth, async (_req, res) => {
    try {
        const data = await plexFetch(`${PLEX_TV_API}/pins`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body   : new URLSearchParams({ strong: 'true' }).toString(),
        })
        const pinId   = data.id
        const pinCode = data.code
        if (!pinId || !pinCode) throw new Error('Pin non reçu')

        const authUrl = `https://app.plex.tv/auth#?clientID=fankarr&code=${pinCode}&context[device][product]=FanKarr&forwardUrl=`
        logger.info('plex', `OAuth démarré — pinId ${pinId}`)
        res.json({ ok: true, pinId, pinCode, authUrl })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        logger.error('plex', `OAuth start échoué : ${msg}`)
        res.status(500).json({ error: msg })
    }
})

// GET /api/plex/oauth/poll/:pinId — vérifie si l'OAuth est complété
app.get('/api/plex/oauth/poll/:pinId', requireAuth, async (req, res) => {
    const pinId = String(req.params.pinId)
    try {
        const data = await plexFetch(`${PLEX_TV_API}/pins/${pinId}`)
        const token = data.authToken
        if (!token) { res.json({ ok: false, pending: true }); return }

        // Token récupéré — récupérer les serveurs
        const resources = await plexFetch(
            'https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1&includeIPv6=1',
            { headers: { 'X-Plex-Token': token } }
        )
        const servers = (Array.isArray(resources) ? resources : [])
            .filter((r: any) => r.product === 'Plex Media Server')
            .map((r: any) => ({
                name       : r.name,
                owned      : r.owned,
                connections: (r.connections ?? []).map((c: any) => ({
                    uri  : c.uri,
                    local: c.local,
                    relay: c.relay,
                })),
            }))

        logger.info('plex', `OAuth complété — ${servers.length} serveur(s)`)
        res.json({ ok: true, pending: false, token, servers })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        res.status(500).json({ error: msg })
    }
})

// POST /api/plex/setup — enregistre l'agent Fankai + crée la bibliothèque
app.post('/api/plex/setup', requireAuth, async (req, res) => {
    const { token, serverUrl, libraryName, libraryPath } = req.body
    if (!token || !serverUrl || !libraryName || !libraryPath) {
        res.status(400).json({ error: 'token, serverUrl, libraryName, libraryPath requis' }); return
    }

    const headers: Record<string, string> = { 'X-Plex-Token': token, 'Accept': 'application/json' }
    const TARGET_AGENT_URI = 'https://metadata.fankai.fr/plex'
    const steps: { step: string; ok: boolean; message: string }[] = []

    let agentIdentifier = 'tv.plex.agents.custom.fankai'
    let groupId: string | null = null
    let agentSetupOk = false

    // ── Étape 1 : Enregistrer le provider Fankai ─────────────
    try {
        const providersRes = await fetch(`${serverUrl}/media/providers/metadata`, { headers })
        if (providersRes.ok) {
            const data = await providersRes.json()
            const providers: any[] = data?.MediaContainer?.MetadataAgentProvider ?? []
            let provider = providers.find((p: any) => p.uri === TARGET_AGENT_URI)

            if (!provider) {
                const r = await fetch(`${serverUrl}/media/providers/metadata?uri=${encodeURIComponent(TARGET_AGENT_URI)}`, { method: 'POST', headers })
                if (r.ok) provider = (await r.json())?.MediaContainer?.MetadataAgentProvider?.[0]
            }

            if (provider) {
                agentIdentifier = provider.identifier ?? agentIdentifier
                steps.push({ step: 'provider', ok: true, message: `Provider enregistré (${agentIdentifier})` })
            }

            // Groupe d'agents
            const groupsRes = await fetch(`${serverUrl}/media/providers/metadata/group`, { headers })
            if (groupsRes.ok) {
                const gdata = await groupsRes.json()
                const groups: any[] = gdata?.MediaContainer?.MetadataAgentProviderGroup ?? []
                let group = groups.find((g: any) => g.primaryIdentifier === agentIdentifier)

                if (!group) {
                    const r = await fetch(
                        `${serverUrl}/media/providers/metadata/group?title=Fankai&primaryIdentifier=${encodeURIComponent(agentIdentifier)}`,
                        { method: 'POST', headers }
                    )
                    if (r.ok) group = (await r.json())?.MediaContainer?.MetadataAgentProviderGroup?.[0]
                }

                if (group) {
                    groupId = String(group.id ?? '')
                    steps.push({ step: 'group', ok: true, message: `Groupe d'agents créé (ID: ${groupId})` })
                    agentSetupOk = true
                }
            }
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        steps.push({ step: 'agent', ok: false, message: `Agent non configuré (Plex < 1.43 ?) — setup manuel requis` })
        logger.warn('plex', `Setup agent Fankai échoué : ${msg}`)
    }

    // ── Étape 2 : Créer la bibliothèque ──────────────────────
    try {
        const params = new URLSearchParams({
            type    : 'show',
            name    : libraryName,
            agent   : agentIdentifier,
            scanner : 'Plex TV Series',
            language: 'fr-FR',
            location: libraryPath,
        })
        if (groupId) params.set('metadataAgentProviderGroupId', groupId)

        const libRes = await fetch(`${serverUrl}/library/sections?${params}`, { method: 'POST', headers })
        if (!libRes.ok) throw new Error(`HTTP ${libRes.status}: ${await libRes.text()}`)

        steps.push({ step: 'library', ok: true, message: `Bibliothèque "${libraryName}" créée` })
        logger.info('plex', `Bibliothèque "${libraryName}" créée sur ${serverUrl}`)
        res.json({ ok: true, agentSetupOk, steps, manualSetup: !agentSetupOk })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        steps.push({ step: 'library', ok: false, message: `Création bibliothèque échouée : ${msg}` })
        logger.error('plex', `Création bibliothèque échouée : ${msg}`)
        res.status(500).json({ ok: false, steps, error: msg })
    }
})