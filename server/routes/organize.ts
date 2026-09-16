import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { organizeTorrent, migrateOrganizedEpisodeIds } from '../organize.js'
import { loadCatalog } from '../lib/serie-helpers.js'
import { recentOrganized, pushNotif, clearNotifs } from '../lib/notifs.js'
import { dispatchGetFiles } from '../torrent-clients/index.js'
import { AUTO_IMPORT_INTERVAL_MS, autoImportSchedule } from '../lib/schedule.js'
import { readSettings } from '../settings.js'
import { DATA_DIR } from '../config.js'
import path from 'path'

const router = Router()

router.post('/organize/migrate-ids', requireAuth, async (_req, res) => {
    try {
        const seriesData    = await loadCatalog()
        const organizedPath = path.join(DATA_DIR, 'organized.json')
        const result        = await migrateOrganizedEpisodeIds(organizedPath, seriesData)
        res.json({ ok: true, ...result })
    } catch (err) {
        logger.error('api', `Échec de la migration des IDs : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

router.get('/organize/recent', requireAuth, (_req, res) => {
    res.json(recentOrganized.slice(0, 20))
})

router.get('/organize/schedule', requireAuth, (_req, res) => {
    res.json({ autoImport: readSettings().autoImport, intervalMs: AUTO_IMPORT_INTERVAL_MS, ...autoImportSchedule })
})

router.post('/organize/recent/clear', requireAuth, (_req, res) => {
    clearNotifs()
    logger.info('api', 'Historique des imports effacé')
    res.json({ ok: true })
})

router.post('/organize', requireAuth, async (req, res) => {
    const { hash, name, save_path } = req.body
    if (!hash || !name || !save_path) { res.status(400).json({ error: 'Hash, nom et dossier du torrent requis' }); return }
    try {
        const seriesData = await loadCatalog()

        // Progression par fichier, facultative (client injoignable toléré)
        const files = await dispatchGetFiles(hash).catch(() => [])

        const result = await organizeTorrent(hash, name, save_path, seriesData, files)
        if (result.done > 0 || result.errors.length > 0) {
            pushNotif({ hash, name, serieId: result.serieId ?? null, done: result.done, skipped: result.skipped, errors: result.errors.length, errorFiles: result.errors, at: new Date().toISOString() })
        }
        res.json(result)
    } catch (err) {
        logger.error('api', `Échec de l'import manuel de « ${name} » : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

export default router
