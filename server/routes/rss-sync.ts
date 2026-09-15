import { Router } from 'express'
import { requireAuth, requireAdmin } from '../auth.js'
import { logger }      from '../logger.js'
import { loadSynced, setSync, setSyncBulk, isSynced, runRssSync, reconcileSynced } from '../lib/rss-sync.js'
import { loadCatalogStatus } from '../lib/serie-helpers.js'

const router = Router()

router.get('/rss-sync', requireAuth, (_req, res) => {
    res.json(Object.values(loadSynced()))
})

// Routes fixes à déclarer avant /:id
router.post('/rss-sync/run', requireAuth, async (_req, res) => {
    try {
        const result = await runRssSync()
        res.json({ ok: true, ...result })
    } catch (err) {
        logger.error('rss-sync', `Échec de la vérification manuelle des séries surveillées : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

router.get('/rss-sync/orphans', requireAdmin, async (_req, res) => {
    const { series, complete } = await loadCatalogStatus()
    res.json({ checked: complete, orphans: complete ? reconcileSynced(series) : [] })
})

router.post('/rss-sync/bulk', requireAdmin, (req, res) => {
    const enabled = req.body?.enabled === true
    const series  = (Array.isArray(req.body?.series) ? req.body.series : [])
        .map((s: any) => ({ id: Number(s?.id), name: String(s?.name ?? '') }))
        .filter((s: { id: number; name: string }) => s.id && s.name)
    if (series.length === 0) { res.status(400).json({ error: 'Aucune série sélectionnée' }); return }
    const { changed, map } = setSyncBulk(series, enabled)
    logger.info('rss-sync', `Surveillance ${enabled ? 'activée' : 'désactivée'} pour plusieurs séries : ${changed} série(s) modifiée(s) sur ${series.length}`)
    res.json({ ok: true, changed, total: Object.keys(map).length })
})

router.get('/rss-sync/:id', requireAuth, (req, res) => {
    const serieId = Number(req.params.id)
    res.json({ synced: isSynced(serieId) })
})

router.post('/rss-sync/:id', requireAuth, (req, res) => {
    const serieId   = Number(req.params.id)
    const serieName = String(req.body.serieName ?? '')
    if (!serieId || !serieName) { res.status(400).json({ error: 'Série manquante' }); return }
    const map = setSync(serieId, serieName, true)
    logger.info('rss-sync', `Surveillance activée pour « ${serieName} » (série ${serieId})`)
    res.json({ synced: true, total: Object.keys(map).length })
})

router.delete('/rss-sync/:id', requireAuth, (req, res) => {
    const serieId = Number(req.params.id)
    const map     = setSync(serieId, '', false)
    logger.info('rss-sync', `Surveillance désactivée pour la série ${serieId}`)
    res.json({ synced: false, total: Object.keys(map).length })
})

export default router
