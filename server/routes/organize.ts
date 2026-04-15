import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { organizeTorrent } from '../organize.js'
import { loadEnrichedSeriesData } from '../lib/github-cache.js'
import { recentOrganized, pushNotif } from '../lib/notifs.js'

const router = Router()

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
