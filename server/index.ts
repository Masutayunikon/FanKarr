import express from 'express'
import cookieParser from 'cookie-parser'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { authStatus, authSetup, authLogin, authLogout, authMe, authChangePassword, authRegenerateToken, requireAuth, requireAdmin } from './auth.js'
import { migrateIfNeeded } from './users.js'
import { readSettings } from './settings.js'
import { registerDriver, dispatchList, dispatchRemove } from './torrent-clients/index.js'
import qbittorrentDriver  from './torrent-clients/qbittorrent.js'
import transmissionDriver from './torrent-clients/transmission.js'
import synologyDsDriver   from './torrent-clients/synology-ds.js'
import utorrentDriver     from './torrent-clients/utorrent.js'
import rtorrentDriver     from './torrent-clients/rtorrent.js'
import realDebridDriver   from './torrent-clients/real-debrid.js'
import allDebridDriver    from './torrent-clients/alldebrid.js'
import { autoOrganizeAll, scanMediaPath, syncFilenameChanges, migrateOrganizedEpisodeIds } from './organize.js'
import { logger } from './logger.js'
import { DATA_DIR, BASE_DIR } from './config.js'
import { readAvailable, readInfohashMap, loadEnrichedSeriesData } from './lib/github-cache.js'
import { pushNotif } from './lib/notifs.js'
import { readRequests, completeRequest } from './requests.js'
import { checkNfoUpdates } from './lib/nfo.js'
import { runJellyfinSync } from './routes/jellyfin.js'
import cors from 'cors';

import usersRouter         from './routes/users.js'
import invitesRouter       from './routes/invites.js'
import requestsRouter      from './routes/requests.js'
import jellyfinRouter      from './routes/jellyfin.js'
import publicApiRouter     from './routes/public-api.js'
import settingsRouter      from './routes/settings.js'
import torrentClientsRouter from './routes/torrent-clients.js'
import seriesRouter        from './routes/series.js'
import downloadsRouter     from './routes/downloads.js'
import organizeRouter      from './routes/organize.js'
import importRouter        from './routes/import.js'
import systemRouter        from './routes/system.js'
import nfoUpdatesRouter    from './routes/nfo-updates.js'
import plexRouter          from './routes/plex.js'
import rssSyncRouter       from './routes/rss-sync.js'
import { runRssSync }      from './lib/rss-sync.js'

registerDriver(qbittorrentDriver)
registerDriver(transmissionDriver)
registerDriver(synologyDsDriver)
registerDriver(utorrentDriver)
registerDriver(rtorrentDriver)
registerDriver(realDebridDriver)
registerDriver(allDebridDriver)

const app  = express()
const PORT = Number(process.env.PORT) || 9898

app.use(express.json())
app.use(cookieParser())


app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

const PUBLIC_PATH = path.join(BASE_DIR, 'public')
if (fs.existsSync(PUBLIC_PATH)) {
    app.use(express.static(PUBLIC_PATH))
}

// ── Migration mono-user → multi-user ──────────────────────────
migrateIfNeeded()

// ── Auth ───────────────────────────────────────────────────────
app.get ('/api/auth/status',          authStatus)
app.post('/api/auth/setup',           authSetup)
app.post('/api/auth/login',           authLogin)
app.post('/api/auth/logout',          authLogout)
app.get ('/api/auth/me',               requireAuth,  authMe)
app.post('/api/auth/change-password',  requireAuth,  authChangePassword)
app.post('/api/auth/regenerate-token', requireAuth,  authRegenerateToken)

// ── API publique v1 (auth par token) ──────────────────────────
app.use('/api', publicApiRouter)

// ── Garde admin : protège les préfixes réservés aux admins ────
// NOTE : app.use('/api', requireAdmin, router) s'applique à TOUTES
// les requêtes /api/* avant même que le router vérifie ses routes,
// ce qui bloquerait les utilisateurs standard. On utilise donc un
// middleware ciblé sur les chemins réellement admin-only.
const ADMIN_PREFIXES = [
    '/users', '/jellyfin', '/settings', '/torrent-clients',
    '/downloads', '/download', '/organize', '/import',
    '/system', '/nfo-updates', '/plex', '/rss-sync',
]
app.use('/api', (req, res, next) => {
    if (ADMIN_PREFIXES.some(p => req.path === p || req.path.startsWith(p + '/'))) {
        return requireAdmin(req, res, next)
    }
    next()
})

// ── Routers (admin + utilisateurs connectés) ───────────────────
app.use('/api', usersRouter)
app.use('/api', jellyfinRouter)
app.use('/api', settingsRouter)
app.use('/api', torrentClientsRouter)
app.use('/api', downloadsRouter)
app.use('/api', organizeRouter)
app.use('/api', importRouter)
app.use('/api', systemRouter)
app.use('/api', nfoUpdatesRouter)
app.use('/api', plexRouter)
app.use('/api', rssSyncRouter)
app.use('/api', requireAuth, seriesRouter)
app.use('/api', requireAuth, requestsRouter)
// Invites : mix public + admin (le router gère ses propres middlewares)
app.use('/api', invitesRouter)

// ── Catch-all SPA ──────────────────────────────────────────────
if (fs.existsSync(PUBLIC_PATH)) {
    app.get('*path', (_req, res) => { res.sendFile(path.join(PUBLIC_PATH, 'index.html')) })
}

// ── Démarrage ──────────────────────────────────────────────────
const server = http.createServer({ maxHeaderSize: 32768 }, app)

server.listen(PORT, async () => {
    const url = `http://localhost:${PORT}`
    console.log(`\n  FanKarr  →  \x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\\n`)
    logger.info('api', `Serveur démarré — ${url}`)
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
        .then(async seriesData => {
            await migrateOrganizedEpisodeIds(ORGANIZED_PATH, seriesData)
            return scanMediaPath(mediaPath, ORGANIZED_PATH, seriesData)
        })
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
                    // Marquer les demandes actives comme disponibles quand des fichiers sont importés
                    if (result.done > 0 && result.serieId != null) {
                        try {
                            const toComplete = readRequests().filter(r =>
                                r.serieId === result.serieId &&
                                (r.status === 'pending' || r.status === 'approved')
                            )
                            for (const r of toComplete) {
                                completeRequest(r.id)
                                logger.info('requests', `Demande "${r.serieName}" passée en disponible (import automatique)`)
                            }
                        } catch (err) {
                            logger.warn('api', `Impossible de compléter les demandes pour série ${result.serieId} : ${err instanceof Error ? err.message : err}`)
                        }
                    }
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

    // Sync automatique des noms de fichiers toutes les heures.
    // Le TTL du cache GitHub est de 1h — ce setInterval tire toujours sur des données fraîches.
    setInterval(async () => {
        try {
            const seriesData   = await loadEnrichedSeriesData()
            const organizedPath = path.join(DATA_DIR, 'organized.json')
            const { updated }  = await migrateOrganizedEpisodeIds(organizedPath, seriesData)
            if (updated > 0)
                logger.info('api', `Migration IDs auto — ${updated} ID(s) mis à jour`)
            const { renamed }  = await syncFilenameChanges(seriesData, organizedPath)
            if (renamed > 0)
                logger.info('api', `Sync noms auto — ${renamed} fichier(s) renommé(s)`)
        } catch (err) {
            logger.error('api', `Sync noms auto échoué : ${err instanceof Error ? err.message : err}`)
        }
    }, 60 * 60_000)

    // RSS sync — auto-téléchargement des nouveaux épisodes toutes les 6 heures.
    setTimeout(() => {
        runRssSync().catch(err => logger.error('rss-sync', `Sync initial échoué : ${err instanceof Error ? err.message : err}`))
        setInterval(() => {
            runRssSync().catch(err => logger.error('rss-sync', `Sync périodique échoué : ${err instanceof Error ? err.message : err}`))
        }, 6 * 60 * 60_000)
    }, 60_000) // premier cycle 1 min après le démarrage

    // Jellyfin sync — toutes les heures (no-op si Jellyfin non configuré)
    setTimeout(() => {
        runJellyfinSync().catch(err => logger.error('jellyfin', `Sync initiale échouée : ${err instanceof Error ? err.message : err}`))
        setInterval(() => {
            runJellyfinSync().catch(err => logger.error('jellyfin', `Sync périodique échouée : ${err instanceof Error ? err.message : err}`))
        }, 60 * 60_000)
    }, 2 * 60_000) // premier cycle 2 min après le démarrage
})
