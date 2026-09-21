import express from 'express'
import cookieParser from 'cookie-parser'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { authStatus, authSetup, authLogin, authLogout, authMe, authChangePassword, authRegenerateToken, authTourSeen, requireAuth, requireAdmin } from './auth.js'
import { migrateIfNeeded } from './users.js'
import { migrateOnboarding } from './onboarding.js'
import { readSettings } from './settings.js'
import { registerDriver, dispatchList, dispatchRemove } from './torrent-clients/index.js'
import qbittorrentDriver  from './torrent-clients/qbittorrent.js'
import transmissionDriver from './torrent-clients/transmission.js'
import synologyDsDriver   from './torrent-clients/synology-ds.js'
import utorrentDriver     from './torrent-clients/utorrent.js'
import rtorrentDriver     from './torrent-clients/rtorrent.js'
import realDebridDriver   from './torrent-clients/real-debrid.js'
import delugeDriver       from './torrent-clients/deluge.js'
import { autoOrganizeAll, scanMediaPath, syncFilenameChanges, migrateOrganizedEpisodeIds, dedupeOrganizedEpisodes } from './organize.js'
import { logger } from './logger.js'
import { DATA_DIR, BASE_DIR } from './config.js'
import { readAvailable, readInfohashMap } from './lib/github-cache.js'
import { loadCatalog } from './lib/serie-helpers.js'
import { ORGANIZED_PATH, readOrganized, writeOrganized } from './lib/organized-store.js'
import { pushNotif } from './lib/notifs.js'
import { AUTO_IMPORT_INTERVAL_MS, autoImportSchedule, planNextAutoImport } from './lib/schedule.js'
import { readRequests, completeRequest } from './requests.js'
import { checkNfoUpdates } from './lib/nfo.js'
import { runJellyfinImport } from './routes/jellyfin.js'
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
registerDriver(delugeDriver)

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

// ── Migration vers le multi-utilisateur ───────────────────────
migrateIfNeeded()
migrateOnboarding()

// ── Authentification ───────────────────────────────────────────
app.get ('/api/auth/status',          authStatus)
app.post('/api/auth/setup',           authSetup)
app.post('/api/auth/login',           authLogin)
app.post('/api/auth/logout',          authLogout)
app.get ('/api/auth/me',               requireAuth,  authMe)
app.post('/api/auth/change-password',  requireAuth,  authChangePassword)
app.post('/api/auth/regenerate-token', requireAuth,  authRegenerateToken)
app.post('/api/auth/tour-seen',        requireAuth,  authTourSeen)

// ── API publique v1 (authentification par jeton) ──────────────
app.use('/api', publicApiRouter)

// ── Garde admin par préfixe ───────────────────────────────────
// requireAdmin sur app.use('/api') bloquerait tous les utilisateurs
const ADMIN_PREFIXES = [
    '/users', '/jellyfin', '/settings', '/torrent-clients',
    '/downloads', '/download', '/organize', '/import',
    '/system', '/nfo-updates', '/plex', '/rss-sync',
    '/torrent', '/manual-import', '/organized', '/organized-summary', '/organized-folders',
    '/rename-episode', '/rename-all', '/purge-nfo',
    '/logs', '/browse', '/browse-files', '/update', '/scan', '/debug',
]
app.use('/api', (req, res, next) => {
    if (ADMIN_PREFIXES.some(p => req.path === p || req.path.startsWith(p + '/'))) {
        return requireAdmin(req, res, next)
    }
    next()
})

// ── Routes (admins et utilisateurs connectés) ──────────────────
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
app.use('/api', invitesRouter)
app.use('/api', requireAuth, seriesRouter)
app.use('/api', requireAuth, requestsRouter)

// ── Application web (toutes les autres routes) ─────────────────
if (fs.existsSync(PUBLIC_PATH)) {
    app.get('*path', (_req, res) => { res.sendFile(path.join(PUBLIC_PATH, 'index.html')) })
}

// ── Démarrage ──────────────────────────────────────────────────
const server = http.createServer({ maxHeaderSize: 32768 }, app)

server.listen(PORT, async () => {
    const url = `http://localhost:${PORT}`
    console.log(`\n  FanKarr  \x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\\n`)
    logger.info('api', `Serveur démarré sur ${url}`)
    try {
        const available = await readAvailable()
        logger.info('api', `Catalogue chargé : ${available.length} séries`)
    } catch (err) {
        logger.warn('api', `Impossible de charger le catalogue (available.json) au démarrage : ${err instanceof Error ? err.message : err}`)
    }

    const { mediaPath }  = readSettings()

    // Ancien format d'organized.json (valeurs texte) : réinitialisation, l'analyse le reconstruit
    try {
        const raw = readOrganized()
        const isOldFormat = Object.values(raw).some((entries: any) =>
            Object.values(entries).some(v => typeof v === 'string')
        )
        if (isOldFormat) {
            logger.info('api', 'Migration organized.json : ancien format détecté, fichier réinitialisé')
            writeOrganized({})
        }
    } catch (err) {
        logger.error('api', `Migration organized.json annulée : ${err instanceof Error ? err.message : err}`)
    }

    try {
        const raw = readOrganized()
        let patched = 0
        for (const episodes of Object.values(raw)) {
            for (const entry of Object.values(episodes)) {
                if (!entry.dest_dir && entry.dest_path) {
                    entry.dest_dir = path.dirname(entry.dest_path)
                    patched++
                }
            }
        }
        if (patched > 0) {
            writeOrganized(raw)
            logger.info('api', `Migration organized.json : ${patched} entrée(s) complétée(s) (dest_dir)`)
        }
    } catch (err) {
        logger.warn('api', `Échec de la migration dest_dir : ${err instanceof Error ? err.message : err}`)
    }

    loadCatalog()
        .then(async seriesData => {
            await migrateOrganizedEpisodeIds(ORGANIZED_PATH, seriesData)
            dedupeOrganizedEpisodes(ORGANIZED_PATH)
            return scanMediaPath(mediaPath, ORGANIZED_PATH, seriesData)
        })
        .catch(err => logger.error('api', `Échec de l'analyse initiale de la médiathèque : ${err instanceof Error ? err.message : err}`))

    const autoOrganize = async () => {
        autoImportSchedule.lastRunAt = new Date().toISOString()
        planNextAutoImport()
        try {
            const { category } = readSettings()
            const infohashMap  = await readInfohashMap()
            const seriesData   = await loadCatalog()
            await autoOrganizeAll(
                () => dispatchList(category ?? 'fankai', infohashMap),
                seriesData,
                async (result) => {
                    if (result.done > 0 || result.errors > 0) {
                        pushNotif({ ...result, at: new Date().toISOString() })
                    }
                    // Demandes actives passées en « disponible » dès qu'un fichier est importé
                    if (result.done > 0 && result.serieId != null) {
                        try {
                            const toComplete = readRequests().filter(r =>
                                r.serieId === result.serieId &&
                                (r.status === 'pending' || r.status === 'approved')
                            )
                            for (const r of toComplete) {
                                completeRequest(r.id)
                                logger.info('requests', `Demande « ${r.serieName} » passée en disponible (import automatique)`)
                            }
                        } catch (err) {
                            logger.warn('api', `Impossible de passer en « disponible » les demandes de la série ${result.serieId} : ${err instanceof Error ? err.message : err}`)
                        }
                    }
                    const { organizeMode, deleteTorrentOnMove } = readSettings()
                    if (organizeMode === 'move' && deleteTorrentOnMove && result.done > 0) {
                        const removeResult = await dispatchRemove(result.hash, false)
                        if (removeResult.ok) {
                            logger.info('api', `Torrent « ${result.name} » retiré du client après déplacement`)
                        } else {
                            logger.warn('api', `Échec du retrait de « ${result.name} » après déplacement : ${removeResult.error ?? 'aucun client n\'a pu le supprimer'}`)
                        }
                    }
                }
            )
        } catch (err) {
            logger.error('api', `Échec de l'import automatique : ${err instanceof Error ? err.message : err}`)
        }
    }

    planNextAutoImport(10_000)
    setTimeout(() => {
        autoOrganize()
        setInterval(autoOrganize, AUTO_IMPORT_INTERVAL_MS)
    }, 10_000)

    setTimeout(() => {
        checkNfoUpdates().catch(err => logger.error('nfo-update', `Échec de la vérification des mises à jour NFO : ${err instanceof Error ? err.message : err}`))
        setInterval(() => {
            checkNfoUpdates().catch(err => logger.error('nfo-update', `Échec de la vérification des mises à jour NFO : ${err instanceof Error ? err.message : err}`))
        }, 60 * 60_000)
    }, 30_000)

    setInterval(async () => {
        try {
            const seriesData   = await loadCatalog()
            const organizedPath = path.join(DATA_DIR, 'organized.json')
            const { updated }  = await migrateOrganizedEpisodeIds(organizedPath, seriesData)
            if (updated > 0)
                logger.info('api', `Migration automatique des IDs : ${updated} ID(s) mis à jour`)
            const { removed }  = dedupeOrganizedEpisodes(organizedPath)
            if (removed > 0)
                logger.info('api', `Dédoublonnage automatique : ${removed} entrée(s) redondante(s) supprimée(s)`)
            const { renamed }  = await syncFilenameChanges(seriesData, organizedPath)
            if (renamed > 0)
                logger.info('api', `Renommage automatique : ${renamed} fichier(s) renommé(s)`)
        } catch (err) {
            logger.error('api', `Échec de la mise à jour horaire des imports : ${err instanceof Error ? err.message : err}`)
        }
    }, 60 * 60_000)

    setTimeout(() => {
        runRssSync().catch(err => logger.error('rss-sync', `Échec de la surveillance des nouveaux épisodes : ${err instanceof Error ? err.message : err}`))
        setInterval(() => {
            runRssSync().catch(err => logger.error('rss-sync', `Échec de la surveillance des nouveaux épisodes : ${err instanceof Error ? err.message : err}`))
        }, 6 * 60 * 60_000)
    }, 60_000)

    // Sans effet si Jellyfin n'est pas configuré ou si l'import automatique est coupé
    const autoImportJellyfin = () => {
        if (!readSettings().jellyfinAutoImport) return
        runJellyfinImport().catch(err => logger.error('jellyfin', `Échec de l'import des utilisateurs Jellyfin : ${err instanceof Error ? err.message : err}`))
    }
    setTimeout(() => {
        autoImportJellyfin()
        setInterval(autoImportJellyfin, 60 * 60_000)
    }, 2 * 60_000)
})
