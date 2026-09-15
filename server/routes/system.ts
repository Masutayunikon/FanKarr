import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../auth.js'
import { logger, readLogs, clearLogs, logsFileSize } from '../logger.js'
import { DATA_DIR, BASE_DIR } from '../config.js'
import { readSettings } from '../settings.js'
import { systemInfo, checkPaths } from '../system.js'
import { scanMediaPath, syncFilenameChanges, migrateOrganizedEpisodeIds, dedupeOrganizedEpisodes } from '../organize.js'
import { readAvailable, cacheClear } from '../lib/github-cache.js'
import { loadCatalog } from '../lib/serie-helpers.js'
import { cacheSize, cacheFetchedAt } from '../lib/github-cache.js'
import { recentOrganized } from '../lib/notifs.js'
import { workerRunning, lastScan } from '../organize.js'

const router = Router()

const UNEXPECTED_ERROR = 'Erreur inattendue, consultez les journaux'

function readDirError(dirPath: string, err: unknown): string {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT')                     return `Dossier introuvable : ${dirPath}`
    if (code === 'EACCES' || code === 'EPERM') return `Accès refusé au dossier : ${dirPath}`
    if (code === 'ENOTDIR')                    return `Ce chemin n'est pas un dossier : ${dirPath}`
    return `Dossier inaccessible : ${dirPath}`
}

// ── Journaux ───────────────────────────────────────────────────
router.get('/logs', requireAuth, (req, res) => {
    const limit  = Number(req.query.limit)  || 100
    const level  = (req.query.level  as string) || 'all'
    const source = (req.query.source as string) || undefined
    res.json({ entries: readLogs({ limit, level: level as any, source }), size: logsFileSize() })
})

router.post('/logs/clear', requireAuth, (_req, res) => {
    clearLogs()
    logger.info('api', 'Journaux effacés')
    res.json({ ok: true })
})

// ── Système ────────────────────────────────────────────────────
router.get('/system/info', systemInfo)

router.get('/system', requireAuth, (_req, res) => {
    res.json({ isDocker: fs.existsSync('/.dockerenv') })
})

router.post('/system/check-paths', requireAuth, (req, res) => {
    const { mediaPath, completePath } = req.body ?? {}
    if (typeof mediaPath !== 'string' || (completePath !== undefined && typeof completePath !== 'string')) {
        res.status(400).json({ error: 'Chemin de la médiathèque requis' }); return
    }
    res.json(checkPaths(mediaPath, completePath))
})

router.get('/version', (_req, res) => {
    try {
        const versionPath = path.join(BASE_DIR, 'version.txt')
        const version = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf-8').trim() : 'dev'
        res.json({ version })
    } catch {
        res.json({ version: 'dev' })
    }
})

// ── Parcours des dossiers ──────────────────────────────────────
router.get('/browse', requireAuth, (req, res) => {
    const isWindows = process.platform === 'win32'
    const dirPath   = (req.query.path as string) || '/'

    // ── Racine virtuelle Windows : liste les lecteurs disponibles ──
    if (isWindows && dirPath === '/') {
        const drives: string[] = []
        for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
            const d = `${letter}:\\`
            try { fs.readdirSync(d); drives.push(d) } catch {}
        }
        res.json({ path: '/', parent: null, dirs: drives, drivesRoot: true })
        return
    }

    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true })
        const dirs    = entries.filter(e => e.isDirectory()).map(e => e.name).filter(n => !n.startsWith('.')).sort((a, b) => a.localeCompare(b))

        // Sous Windows, remonter à '/' depuis la racine d'un lecteur (ex. C:\)
        let parent: string | null
        if (dirPath === '/') {
            parent = null
        } else if (isWindows && /^[A-Za-z]:\\?$/.test(dirPath)) {
            parent = '/'
        } else {
            const up = path.dirname(dirPath)
            parent   = up === dirPath ? null : up   // dirname de C:\ renvoie C:\ : pas de parent
        }

        res.json({ path: dirPath, parent, dirs })
    } catch (err) {
        logger.warn('api', `Lecture du dossier « ${dirPath} » impossible : ${err instanceof Error ? err.message : err}`)
        res.status(400).json({ error: readDirError(dirPath, err) })
    }
})

router.get('/browse-files', requireAuth, (req, res) => {
    const dirPath = (req.query.path as string) || '/'
    const VIDEO_EXTS = new Set(['.mkv', '.mp4', '.avi', '.m4v', '.mov', '.wmv'])
    try {
        // Lecture seule : le dossier est créé au moment de l'import
        if (!fs.existsSync(dirPath)) { res.json({ path: dirPath, files: [], exists: false }); return }
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
        res.json({ path: dirPath, files, exists: true })
    } catch (err) {
        logger.warn('api', `Lecture du dossier « ${dirPath} » impossible : ${err instanceof Error ? err.message : err}`)
        res.status(400).json({ error: readDirError(dirPath, err) })
    }
})

// ── Catalogue ──────────────────────────────────────────────────
router.get('/torrents/status', requireAuth, async (_req, res) => {
    try {
        const available = await readAvailable()
        res.json({ exists: available.length > 0, count: available.length, empty: available.length === 0, syncedAt: cacheFetchedAt('available.json') })
    } catch { res.json({ exists: false, count: 0, empty: true }) }
})

router.post('/update', requireAuth, async (req, res) => {
    const force = req.body?.force === true
    const organizedPath = path.join(DATA_DIR, 'organized.json')
    try {
        cacheClear()
        logger.info('api', force
            ? 'Resynchronisation complète du catalogue (caches ignorés), noms de fichiers recalculés'
            : 'Cache GitHub vidé : rechargement du catalogue')

        const availableIds = await readAvailable(force)
        if (!Array.isArray(availableIds)) throw new Error('Catalogue GitHub invalide (available.json)')
        logger.info('api', `Catalogue rechargé : ${availableIds.length} séries disponibles`)

        if (force) {
            const seriesData      = await loadCatalog(true)
            const { updated }     = await migrateOrganizedEpisodeIds(organizedPath, seriesData)
            const { removed }     = dedupeOrganizedEpisodes(organizedPath)
            const { renamed, errors } = await syncFilenameChanges(seriesData, organizedPath)
            logger.info('api', `Resynchronisation terminée : ${updated} ID(s) migré(s), ${removed} doublon(s) retiré(s), ${renamed} fichier(s) renommé(s)${errors > 0 ? `, ${errors} erreur(s)` : ''}`)
            res.json({ ok: true, count: availableIds.length, migrated: updated, deduped: removed, renamed, errors })
            return
        }

        res.json({ ok: true, count: availableIds.length })
        ;(async () => {
            try {
                const seriesData = await loadCatalog()
                const { renamed } = await syncFilenameChanges(seriesData, organizedPath)
                if (renamed > 0)
                    logger.info('api', `Renommage après synchronisation : ${renamed} fichier(s) renommé(s)`)
            } catch (err) {
                logger.warn('api', `Échec du renommage après synchronisation : ${err instanceof Error ? err.message : err}`)
            }
        })()
    } catch (err) {
        logger.error('api', `Échec de la synchronisation du catalogue : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : UNEXPECTED_ERROR })
    }
})

router.get('/scan', requireAuth, (_req, res) => {
    res.json({ lastScan })
})

router.post('/scan', requireAuth, async (_req, res) => {
    try {
        const { mediaPath } = readSettings()
        logger.info('api', 'Analyse manuelle de la médiathèque lancée')
        const seriesData = await loadCatalog()
        const result     = await scanMediaPath(mediaPath, path.join(DATA_DIR, 'organized.json'), seriesData)
        res.json({ ok: true, ...result })
    } catch (err) {
        logger.error('api', `Échec de l'analyse de la médiathèque : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : UNEXPECTED_ERROR })
    }
})

// ── Diagnostic ─────────────────────────────────────────────────
router.get('/debug/stats', requireAuth, (req, res) => {
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
        cache    : { entries: cacheSize(), ttlHours: 1 },
        uptime   : `${h}h ${m}m ${s}s`,
        uptimeSeconds: uptimeS,
        worker   : { running: workerRunning },
        organized: { trackedFiles: organizedCount },
        requests : { notifs: recentOrganized.length },
    })
})

export default router
