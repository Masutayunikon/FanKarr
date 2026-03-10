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
import { organizeTorrent, autoOrganizeAll } from './organize.js'

registerDriver(qbittorrentDriver)

const app = express()
const PORT = 3001
const FANKAI_API    = 'https://metadata.fankai.fr'
const TORRENTS_PATH = path.join(process.cwd(), 'data', 'torrent_final.json')
const GITHUB_RAW_URL = process.env.GITHUB_RAW_URL
    ?? 'https://raw.githubusercontent.com/masutayunikon/fankarr-scraper/main/data/torrent_final.json'

app.use(express.json())
app.use(cookieParser())

// ── Static frontend (prod) ─────────────────────────────────────
const PUBLIC_PATH = path.join(process.cwd(), 'public')
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
    const { mediaPath, completePath, organizeMode, category } = req.body
    res.json(writeSettings({ mediaPath, completePath, organizeMode, category }))
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
function indexBySerie(torrents: any[]): Map<number, any[]> {
    const map = new Map<number, any[]>()
    for (const t of torrents) {
        if (!t.serie_id) continue
        if (!map.has(t.serie_id)) map.set(t.serie_id, [])
        map.get(t.serie_id)!.push(t)
    }
    return map
}

// ── Series ─────────────────────────────────────────────────────
app.get('/api/series', requireAuth, async (_req, res) => {
    try {
        const [apiData, torrents] = await Promise.all([fankaiGet('/series'), Promise.resolve(readTorrents())])
        const byId = indexBySerie(torrents)
        const seriesList = Array.isArray(apiData) ? apiData : (apiData.series ?? [])
        res.json({ series: seriesList.map((serie: any) => ({
                ...serie,
                torrent_count: byId.get(serie.id)?.length ?? 0,
                has_torrents : byId.has(serie.id)
            }))})
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

        const torrents = readTorrents().filter(t => t.serie_id === id)
        const allSeasonIds = new Set<number>(seasonsWithEpisodes.filter((s: any) => s.season_number !== 0).map((s: any) => s.id))
        const availableEpisodeIds  = new Set<number>()
        const episodeTorrentMap: Record<number, any> = {}
        const seasonTorrentMap : Record<number, any> = {}
        const integraleTorrents: any[] = []
        const packEpisodesTorrents: any[] = []

        for (const t of torrents) {
            const ref = { torrent_url: t.torrent_url, magnet: t.magnet, type: t.type, raw: t.raw }
            for (const ep of t.resolved_episodes ?? []) {
                availableEpisodeIds.add(ep.episode_id)
                if (t.type === 'episode') episodeTorrentMap[ep.episode_id] = ref
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

        const enrichedSeasons = seasonsWithEpisodes.map((season: any) => ({
            ...season,
            torrent: seasonTorrentMap[season.id] ?? null,
            episodes: season.episodes.map((ep: any) => ({
                ...ep,
                available: availableEpisodeIds.has(ep.id),
                torrent  : episodeTorrentMap[ep.id] ?? null
            }))
        }))

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
        res.json(torrents)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Organize ───────────────────────────────────────────────────
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

// ── SPA fallback (prod) — doit être après toutes les routes API ─
if (fs.existsSync(PUBLIC_PATH)) {
    app.get('*path', (_req, res) => {
        res.sendFile(path.join(PUBLIC_PATH, 'index.html'))
    })
}

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
    try {
        const data  = JSON.parse(fs.readFileSync(TORRENTS_PATH, 'utf-8'))
        const count = Array.isArray(data) ? data.length : 0
        if (count === 0) console.warn('[fankarr] ⚠ torrent_final.json est vide')
        else console.log(`[fankarr] ${count} torrents chargés`)
    } catch { console.warn('[fankarr] ⚠ torrent_final.json introuvable ou illisible') }
    console.log(`[fankarr] Serveur sur http://localhost:${PORT}`)

    // Auto-organise toutes les 30s
    const autoOrganize = async () => {
        try {
            const { category } = readSettings()
            await autoOrganizeAll(() => dispatchList(category ?? 'fankai'))
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