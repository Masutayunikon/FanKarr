import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../auth.js'
import { logger, readLogs, clearLogs, logsFileSize } from '../logger.js'
import { DATA_DIR, BASE_DIR } from '../config.js'
import { readSettings } from '../settings.js'
import { systemInfo } from '../system.js'
import { scanMediaPath } from '../organize.js'
import { readAvailable, loadEnrichedSeriesData, cacheClear } from '../lib/github-cache.js'
import { cacheSize } from '../lib/github-cache.js'
import { recentOrganized } from '../lib/notifs.js'
import { workerRunning } from '../organize.js'

const router = Router()

// ── Logs ───────────────────────────────────────────────────────
router.get('/logs', requireAuth, (req, res) => {
    const limit  = Number(req.query.limit)  || 100
    const level  = (req.query.level  as string) || 'all'
    const source = (req.query.source as string) || undefined
    res.json({ entries: readLogs({ limit, level: level as any, source }), size: logsFileSize() })
})

router.post('/logs/clear', requireAuth, (_req, res) => {
    clearLogs()
    logger.info('api', 'Logs effacés')
    res.json({ ok: true })
})

// ── Système ────────────────────────────────────────────────────
router.get('/system/info', systemInfo)

router.get('/system', requireAuth, (_req, res) => {
    res.json({ isDocker: fs.existsSync('/.dockerenv') })
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

// ── Parcours fichiers ──────────────────────────────────────────
router.get('/browse', requireAuth, (req, res) => {
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

router.get('/browse-files', requireAuth, (req, res) => {
    const dirPath = (req.query.path as string) || '/'
    const VIDEO_EXTS = new Set(['.mkv', '.mp4', '.avi', '.m4v', '.mov', '.wmv'])
    try {
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

// ── Catalogue ──────────────────────────────────────────────────
router.get('/torrents/status', requireAuth, async (_req, res) => {
    try {
        const available = await readAvailable()
        res.json({ exists: available.length > 0, count: available.length, empty: available.length === 0 })
    } catch { res.json({ exists: false, count: 0, empty: true }) }
})

router.post('/update', requireAuth, async (_req, res) => {
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

router.post('/scan', requireAuth, async (_req, res) => {
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

// ── Debug ──────────────────────────────────────────────────────
router.get('/debug/stats', requireAuth, (req, res) => {
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
        cache    : { entries: cacheSize(), ttlHours: 6 },
        uptime   : `${h}h ${m}m ${s}s`,
        uptimeSeconds: uptimeS,
        worker   : { running: workerRunning },
        organized: { trackedFiles: organizedCount },
        requests : { notifs: recentOrganized.length },
    })
})

export default router
