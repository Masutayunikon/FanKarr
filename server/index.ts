import express from 'express'
import cookieParser from 'cookie-parser'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { authStatus, authSetup, authLogin, authLogout } from './auth.js'
import { readSettings } from './settings.js'
import { registerDriver, dispatchList, dispatchRemove } from './torrent-clients/index.js'
import qbittorrentDriver  from './torrent-clients/qbittorrent.js'
import transmissionDriver from './torrent-clients/transmission.js'
import synologyDsDriver   from './torrent-clients/synology-ds.js'
import utorrentDriver     from './torrent-clients/utorrent.js'
import rtorrentDriver     from './torrent-clients/rtorrent.js'
import { autoOrganizeAll, scanMediaPath } from './organize.js'
import { logger } from './logger.js'
import { DATA_DIR, BASE_DIR } from './config.js'
import { readAvailable, readInfohashMap, loadEnrichedSeriesData } from './lib/github-cache.js'
import { pushNotif } from './lib/notifs.js'
import { checkNfoUpdates } from './lib/nfo.js'

import settingsRouter      from './routes/settings.js'
import torrentClientsRouter from './routes/torrent-clients.js'
import seriesRouter        from './routes/series.js'
import downloadsRouter     from './routes/downloads.js'
import organizeRouter      from './routes/organize.js'
import importRouter        from './routes/import.js'
import systemRouter        from './routes/system.js'
import nfoUpdatesRouter    from './routes/nfo-updates.js'
import plexRouter          from './routes/plex.js'

registerDriver(qbittorrentDriver)
registerDriver(transmissionDriver)
registerDriver(synologyDsDriver)
registerDriver(utorrentDriver)
registerDriver(rtorrentDriver)

const app  = express()
const PORT = Number(process.env.PORT) || 9898

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

// ── Routes ─────────────────────────────────────────────────────
app.use('/api', settingsRouter)
app.use('/api', torrentClientsRouter)
app.use('/api', seriesRouter)
app.use('/api', downloadsRouter)
app.use('/api', organizeRouter)
app.use('/api', importRouter)
app.use('/api', systemRouter)
app.use('/api', nfoUpdatesRouter)
app.use('/api', plexRouter)

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
