import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { organizeTorrent, migrateOrganizedEpisodeIds } from '../organize.js'
import { loadEnrichedSeriesData } from '../lib/github-cache.js'
import { recentOrganized, pushNotif } from '../lib/notifs.js'
import { DATA_DIR } from '../config.js'
import path from 'path'

const router = Router()

router.post('/organize/migrate-ids', requireAuth, async (_req, res) => {
    try {
        const seriesData    = await loadEnrichedSeriesData()
        const organizedPath = path.join(DATA_DIR, 'organized.json')
        const result        = await migrateOrganizedEpisodeIds(organizedPath, seriesData)
        res.json({ ok: true, ...result })
    } catch (err) {
        logger.error('api', `Migration IDs échouée : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

router.get('/organize/recent', requireAuth, (_req, res) => {
    res.json(recentOrganized)
})

router.post('/organize/recent/clear', requireAuth, (_req, res) => {
    recentOrganized.length = 0
    logger.info('api', 'Historique des imports effacé')
    res.json({ ok: true })
})

router.post('/organize', requireAuth, async (req, res) => {
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

export default router
