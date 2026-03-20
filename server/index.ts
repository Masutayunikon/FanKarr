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
const FANKAI_API    = 'https://metadata.fankai.fr'
const TORRENTS_PATH = path.join(DATA_DIR, 'torrent_final.json')
const GITHUB_RAW_URL = process.env.GITHUB_RAW_URL
    ?? 'https://raw.githubusercontent.com/masutayunikon/fankarr-scraper/main/data/torrent_final.json'

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
    const { mediaPath, completePath, organizeMode, category, nfoSupport } = req.body
    res.json(writeSettings({ mediaPath, completePath, organizeMode, category, nfoSupport }))
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

// ── Helpers ────────────────────────────────────────────────────
function readTorrents(): any[] {
    try {
        if (!fs.existsSync(TORRENTS_PATH)) return []
        return JSON.parse(fs.readFileSync(TORRENTS_PATH, 'utf-8'))
    } catch { return [] }
}
async function fankaiGet(endpoint: string): Promise<any> {
    const res = await fetch(`${FANKAI_API}${endpoint}`)
    if (!res.ok) throw new Error(`Fankai API ${res.status}: ${endpoint}`)
    return res.json()
}
function normalizeTitle(s: string): string {
    return s.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // strip accents (ï→i, é→e...)
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function indexBySerie(torrents: any[]): Map<number, any[]> {
    const map = new Map<number, any[]>()
    for (const t of torrents) {
        if (!t.serie_id) continue
        if (!map.has(t.serie_id)) map.set(t.serie_id, [])
        map.get(t.serie_id)!.push(t)
    }
    return map
}

function indexByNormalizedTitle(torrents: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>()
    for (const t of torrents) {
        const title = t.serie_title || t.show_title
        if (!title) continue
        const key = normalizeTitle(title)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
    }
    return map
}

// ── Series ─────────────────────────────────────────────────────

function computeSerieDownloadState(
    serieTorrents : any[],
    organized     : Record<string, Record<string, string>>,
    activeTorrents: Set<string>  // hashes actuellement dans qB en downloading
): 'none' | 'downloading' | 'partial' | 'complete' {
    if (serieTorrents.length === 0) return 'none'

    // Un torrent de la série est en cours de téléchargement ?
    const hasActive = serieTorrents.some(t => activeTorrents.has(t.infohash?.toLowerCase()))
    if (hasActive) return 'downloading'

    // Compter les fichiers attendus vs organisés
    let totalFiles = 0
    let doneFiles  = 0
    for (const t of serieTorrents) {
        const files: any[] = t.torrent_files ?? []
        if (files.length === 0) {
            // Fichier unique
            totalFiles++
            if (organized[t.infohash?.toLowerCase()]?.[t.raw]) doneFiles++
        } else {
            totalFiles += files.length
            doneFiles  += files.filter((f: any) => organized[t.infohash?.toLowerCase()]?.[f.filename]).length
        }
    }

    if (totalFiles === 0) return 'none'
    if (doneFiles === 0)  return 'none'
    if (doneFiles >= totalFiles) return 'complete'
    return 'partial'
}

app.get('/api/series', requireAuth, async (_req, res) => {
    try {
        const [apiData, torrents] = await Promise.all([fankaiGet('/series'), Promise.resolve(readTorrents())])
        const byId        = indexBySerie(torrents)
        const byNormTitle = indexByNormalizedTitle(torrents)

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
                if (t.state === 'downloading' && t.hash)
                    activeTorrents.add(t.hash.toLowerCase())
            }
        } catch {}

        const seriesRaw = Array.isArray(apiData) ? apiData : (apiData.series ?? [])

        // Dédupliquer les séries Kaï/Kai — garder celle qui a des torrents, sinon la plus récente (ID le plus grand)
        const seenTitles = new Map<string, any>()
        for (const serie of seriesRaw) {
            const key = normalizeTitle(serie.title ?? serie.show_title ?? '')
            if (!seenTitles.has(key)) {
                seenTitles.set(key, serie)
            } else {
                const existing = seenTitles.get(key)!
                const existingHasTorrents = (byId.get(existing.id) ?? byNormTitle.get(key) ?? []).length > 0
                const newHasTorrents      = (byId.get(serie.id)    ?? byNormTitle.get(key) ?? []).length > 0
                // Préférer celle qui a des torrents, sinon la plus récente
                if (!existingHasTorrents && newHasTorrents) seenTitles.set(key, serie)
                else if (existingHasTorrents === newHasTorrents && serie.id > existing.id) seenTitles.set(key, serie)
            }
        }
        const seriesList = [...seenTitles.values()]

        res.json({ series: seriesList.map((serie: any) => {
                // Fallback par titre normalisé si l'ID ne matche pas (Kaï→Kai migration)
                const serieTorrents = byId.get(serie.id)
                    ?? byNormTitle.get(normalizeTitle(serie.title ?? serie.show_title ?? ''))
                    ?? []
                return {
                    ...serie,
                    torrent_count : serieTorrents.length,
                    has_torrents  : serieTorrents.length > 0,
                    download_state: computeSerieDownloadState(serieTorrents, organized, activeTorrents),
                }
            })})
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

app.get('/api/series/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id)
    try {
        const [serie, seasonsData] = await Promise.all([fankaiGet(`/series/${id}`), fankaiGet(`/series/${id}/seasons`)])
        const seasons = Array.isArray(seasonsData) ? seasonsData : (seasonsData.seasons ?? [])
        const seasonsWithEpisodes = await Promise.all(seasons.map(async (season: any) => {
            const epsData = await fankaiGet(`/seasons/${season.id}/episodes`)
            return { ...season, episodes: Array.isArray(epsData) ? epsData : (epsData.episodes ?? []) }
        }))

        const allTorrents  = readTorrents()
        const serieMeta    = allTorrents.find(t => t.serie_id === id)
        const normApiTitle = normalizeTitle(serie.title ?? serie.show_title ?? '')
        const torrents     = allTorrents.filter(t =>
            t.serie_id === id ||
            normalizeTitle(t.serie_title ?? t.show_title ?? '') === normApiTitle
        )
        const allSeasonIds = new Set<number>(seasonsWithEpisodes.filter((s: any) => s.season_number !== 0).map((s: any) => s.id))
        const availableEpisodeIds  = new Set<number>()
        // Fallback par season_number+episode_number pour les séries migrées Kaï→Kai
        const availableBySnEn      = new Set<string>()  // "sn:en"
        const episodeTorrentMap: Record<number, any> = {}
        const episodeTorrentMapBySnEn: Record<string, any> = {}
        const seasonTorrentMap : Record<number, any> = {}
        const integraleTorrents: any[] = []
        const packEpisodesTorrents: any[] = []

        for (const t of torrents) {
            const ref = { torrent_url: t.torrent_url, magnet: t.magnet, type: t.type, raw: t.raw }
            for (const ep of t.resolved_episodes ?? []) {
                availableEpisodeIds.add(ep.episode_id)
                const snEnKey = `${ep.season_number}:${ep.episode_number}`
                availableBySnEn.add(snEnKey)
                if (t.type === 'episode') {
                    episodeTorrentMap[ep.episode_id] = ref
                    episodeTorrentMapBySnEn[snEnKey] = ref
                }
            }
            if (t.type === 'pack_saison') {
                const rs: any[] = t.resolved_seasons ?? []
                if (rs.length > 1) {
                    packEpisodesTorrents.push(t)
                } else {
                    const sids = rs.length > 0 ? rs.map((r: any) => r.season_id) : [t.season_id]
                    for (const sid of sids) { if (sid) seasonTorrentMap[sid] = ref }
                }
            } else if (t.type === 'pack_integrale') {
                integraleTorrents.push(t)
            } else if (t.type === 'pack_episodes') {
                packEpisodesTorrents.push(t)
            }
        }

        let promotedIntegrale: any = null
        if (integraleTorrents.length === 0 && allSeasonIds.size > 0) {
            for (const t of torrents.filter(t => t.type === 'pack_saison')) {
                const rs: any[] = t.resolved_seasons ?? []
                const tIds = new Set<number>(rs.length > 0 ? rs.map((r: any) => r.season_id) : t.season_id ? [t.season_id] : [])
                if ([...allSeasonIds].every(sid => tIds.has(sid))) { promotedIntegrale = t; break }
            }
        }

        if (integraleTorrents.length > 0 || promotedIntegrale) {
            for (const key of Object.keys(seasonTorrentMap)) delete seasonTorrentMap[Number(key)]
            if (promotedIntegrale) {
                const idx = packEpisodesTorrents.indexOf(promotedIntegrale)
                if (idx !== -1) packEpisodesTorrents.splice(idx, 1)
            }
        }

        function packEpisodesLabel(t: any): string {
            const eps: any[] = t.resolved_episodes ?? []
            if (!eps.length) return t.raw
            const bySeason = new Map<number, number[]>()
            for (const ep of eps) {
                const sn = ep.season_number ?? 0
                if (!bySeason.has(sn)) bySeason.set(sn, [])
                bySeason.get(sn)!.push(ep.episode_number)
            }
            return [...bySeason.entries()].sort(([a], [b]) => a - b).map(([sn, nums]) => {
                const s = nums.sort((a, b) => a - b)
                const label = sn === 0 ? 'S0' : `S${sn}`
                return s[0] === s[s.length-1] ? `${label} Ep ${s[0]}` : `${label} Eps ${s[0]}-${s[s.length-1]}`
            }).join(' · ')
        }

        // Charger organized.json pour les badges d'état
        let organized: Record<string, Record<string, string>> = {}
        try {
            const orgPath = path.join(DATA_DIR, 'organized.json')
            if (fs.existsSync(orgPath))
                organized = JSON.parse(fs.readFileSync(orgPath, 'utf-8'))
        } catch {}

        // Construire un set des episode_id organisés
        // On croise resolved_episodes de chaque torrent avec organized.json
        const organizedEpisodeIds = new Set<number>()
        const organizedBySnEn     = new Set<string>()
        for (const t of torrents) {
            const hash  = t.infohash?.toLowerCase()
            const files = t.torrent_files ?? []
            const orgFiles = organized[hash] ?? {}
            if (Object.keys(orgFiles).length === 0) continue
            // Au moins un fichier organisé pour ce torrent → on marque les épisodes résolus
            for (const ep of t.resolved_episodes ?? []) {
                // Vérifier si le fichier de cet épisode est organisé
                const epFile = files.find((f: any) =>
                    f.episode_ids?.includes(ep.episode_id) || f.episode_number === ep.episode_number
                )
                if (epFile ? orgFiles[epFile.filename] : Object.keys(orgFiles).length > 0) {
                    organizedEpisodeIds.add(ep.episode_id)
                    organizedBySnEn.add(`${ep.season_number}:${ep.episode_number}`)
                }
            }
        }

        const enrichedSeasons = seasonsWithEpisodes.map((season: any) => {
            const eps = season.episodes.map((ep: any) => ({
                ...ep,
                available : availableEpisodeIds.has(ep.id)
                    || availableBySnEn.has(`${season.season_number}:${ep.episode_number}`),
                torrent   : episodeTorrentMap[ep.id]
                    ?? episodeTorrentMapBySnEn[`${season.season_number}:${ep.episode_number}`]
                    ?? null,
                organized : organizedEpisodeIds.has(ep.id)
                    || organizedBySnEn.has(`${season.season_number}:${ep.episode_number}`),
            }))
            // State saison : none / partial / complete
            const total    = eps.filter((e: any) => e.available).length
            const orgCount = eps.filter((e: any) => e.organized).length
            const seasonOrganizedState =
                orgCount === 0              ? 'none'     :
                    orgCount >= total && total > 0 ? 'complete' : 'partial'
            return {
                ...season,
                torrent              : seasonTorrentMap[season.id] ?? null,
                organized_state      : seasonOrganizedState,
                organized_count      : orgCount,
                episodes             : eps,
            }
        })

        const heroBundles: any[] = [
            ...integraleTorrents.map(t => ({ label: 'Intégrale', torrent_url: t.torrent_url, magnet: t.magnet, raw: t.raw })),
            ...(promotedIntegrale ? [{ label: 'Intégrale', torrent_url: promotedIntegrale.torrent_url, magnet: promotedIntegrale.magnet, raw: promotedIntegrale.raw }] : []),
            ...packEpisodesTorrents.map(t => ({ label: packEpisodesLabel(t), torrent_url: t.torrent_url, magnet: t.magnet, raw: t.raw }))
        ]

        res.json({ serie, seasons: enrichedSeasons, torrents_integrale: heroBundles })
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Download ───────────────────────────────────────────────────
app.post('/api/download', requireAuth, async (req, res) => {
    const url = req.body.torrent_url ?? req.body.magnet
    if (!url) { res.status(400).json({ error: 'torrent_url ou magnet requis' }); return }
    const results = await dispatchDownload(url)
    res.status(results.every((r: any) => r.ok) ? 200 : 207).json({ results })
})

// ── Downloads — liste torrents Fankai ──────────────────────────
app.get('/api/downloads', requireAuth, async (_req, res) => {
    try {
        const { category } = readSettings()
        const torrents = await dispatchList(category ?? 'fankai')

        // Enrichir avec l'état d'organisation
        let organized: Record<string, Record<string, string>> = {}
        try {
            const orgPath = path.join(DATA_DIR, 'organized.json')
            if (fs.existsSync(orgPath))
                organized = JSON.parse(fs.readFileSync(orgPath, 'utf-8'))
        } catch {}

        let torrentFinal: any[] = []
        try {
            const tfPath = path.join(DATA_DIR, 'config', 'torrent_final.json')
            if (fs.existsSync(tfPath))
                torrentFinal = JSON.parse(fs.readFileSync(tfPath, 'utf-8'))
        } catch {}

        const enriched = torrents.map((t: any) => {
            const orgFiles  = organized[t.hash] ?? {}
            const meta      = torrentFinal.find((m: any) =>
                m.infohash?.toLowerCase() === t.hash?.toLowerCase()
            )
            const totalFiles = (meta?.torrent_files?.length ?? 0) || 1
            const doneFiles  = Object.keys(orgFiles).length
            let organizeState: 'none' | 'partial' | 'done' = 'none'
            if (doneFiles >= totalFiles) organizeState = 'done'
            else if (doneFiles > 0)      organizeState = 'partial'

            // Récupérer les erreurs depuis recentOrganized
            const notif = recentOrganized.find(n => n.hash === t.hash)
            const errorFiles = notif?.errorFiles ?? []

            return { ...t, organizeState, organizeProgress: { done: doneFiles, total: totalFiles }, errorFiles }
        })

        res.json(enriched)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Résultats d'organisation récents (pour notifications frontend) ──
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

// Vider les notifs lues
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
        const result = await organizeTorrent(hash, name, save_path)
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Torrents status ────────────────────────────────────────────
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

app.get('/api/torrents/status', requireAuth, (_req, res) => {
    try {
        if (!fs.existsSync(TORRENTS_PATH)) { res.json({ exists: false, count: 0, empty: true }); return }
        const raw = fs.readFileSync(TORRENTS_PATH, 'utf-8').trim()
        if (!raw || raw === '[]') { res.json({ exists: true, count: 0, empty: true }); return }
        const data = JSON.parse(raw)
        const count = Array.isArray(data) ? data.length : 0
        res.json({ exists: true, count, empty: count === 0 })
    } catch { res.json({ exists: false, count: 0, empty: true }) }
})

// ── Update torrent_final.json ──────────────────────────────────
app.post('/api/update', requireAuth, async (_req, res) => {
    try {
        const response = await fetch(GITHUB_RAW_URL)
        if (!response.ok) throw new Error(`GitHub a répondu ${response.status}`)
        const data = await response.json() as unknown[]
        if (!Array.isArray(data)) throw new Error('Format invalide')
        fs.mkdirSync(path.dirname(TORRENTS_PATH), { recursive: true })
        fs.writeFileSync(TORRENTS_PATH, JSON.stringify(data, null, 2), 'utf-8')
        res.json({ ok: true, count: data.length })
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

app.post('/api/scan', requireAuth, async (_req, res) => {
    try {
        const { mediaPath } = readSettings()
        const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
        const result = await scanMediaPath(mediaPath, TORRENTS_PATH, ORGANIZED_PATH)
        logger.info('api', `Scan manuel: ${result.found} fichiers scannés, ${result.added} ajoutés`)
        res.json({ ok: true, ...result })
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── SPA fallback (prod) — doit être après toutes les routes API ─
if (fs.existsSync(PUBLIC_PATH)) {
    app.get('*path', (_req, res) => {
        res.sendFile(path.join(PUBLIC_PATH, 'index.html'))
    })
}

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, async () => {
    // Télécharger torrent_final.json si absent
    if (!fs.existsSync(TORRENTS_PATH)) {
        try {
            console.log('[fankarr] torrent_final.json absent → téléchargement...')
            const response = await fetch(GITHUB_RAW_URL)
            if (!response.ok) throw new Error(`GitHub a répondu ${response.status}`)
            const data = await response.json() as unknown[]
            if (!Array.isArray(data)) throw new Error('Format invalide')
            fs.mkdirSync(path.dirname(TORRENTS_PATH), { recursive: true })
            fs.writeFileSync(TORRENTS_PATH, JSON.stringify(data, null, 2), 'utf-8')
            console.log(`[fankarr] ${data.length} torrents téléchargés`)
        } catch (err) {
            console.warn(`[fankarr] ⚠ Téléchargement échoué: ${err instanceof Error ? err.message : err}`)
        }
    }

    try {
        const data  = JSON.parse(fs.readFileSync(TORRENTS_PATH, 'utf-8'))
        const count = Array.isArray(data) ? data.length : 0
        if (count === 0) console.warn('[fankarr] ⚠ torrent_final.json est vide')
        else console.log(`[fankarr] ${count} torrents chargés`)
    } catch { console.warn('[fankarr] ⚠ torrent_final.json introuvable ou illisible') }
    console.log(`[fankarr] Serveur sur http://localhost:${PORT}`)

    // Scan initial du mediaPath pour reconnaître les fichiers déjà présents
    const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')
    const { mediaPath } = readSettings()
    scanMediaPath(mediaPath, TORRENTS_PATH, ORGANIZED_PATH).catch(err =>
        logger.error('organize', `scanMediaPath échoué: ${err}`)
    )

    // Auto-organise toutes les 30s
    const autoOrganize = async () => {
        try {
            const { category } = readSettings()
            await autoOrganizeAll(
                () => dispatchList(category ?? 'fankai'),
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
    // Premier run 30s après démarrage, puis toutes les 30s
    setTimeout(() => {
        autoOrganize()
        setInterval(autoOrganize, 30_000)
    }, 30_000)
})