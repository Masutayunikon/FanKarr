import { Router } from 'express'
import { requireAuth, requireAdmin } from '../auth.js'
import { logger }      from '../logger.js'
import { loadSynced, setSync, setSyncBulk, isSynced, runRssSync } from '../lib/rss-sync.js'

const router = Router()

/** GET /api/rss-sync → liste des séries surveillées */
router.get('/rss-sync', requireAuth, (_req, res) => {
    res.json(Object.values(loadSynced()))
})

/** POST /api/rss-sync/run → forcer un cycle de sync maintenant (avant /:id) */
router.post('/rss-sync/run', requireAuth, async (_req, res) => {
    try {
        const result = await runRssSync()
        res.json({ ok: true, ...result })
    } catch (err) {
        logger.error('rss-sync', `Sync forcé échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

/** POST /api/rss-sync/bulk → activer/désactiver la surveillance de plusieurs séries (avant /:id) */
router.post('/rss-sync/bulk', requireAdmin, (req, res) => {
    const enabled = req.body?.enabled === true
    const series  = (Array.isArray(req.body?.series) ? req.body.series : [])
        .map((s: any) => ({ id: Number(s?.id), name: String(s?.name ?? '') }))
        .filter((s: { id: number; name: string }) => s.id && s.name)
    if (series.length === 0) { res.status(400).json({ error: 'series requis' }); return }
    const { changed, map } = setSyncBulk(series, enabled)
    logger.info('rss-sync', `Surveillance ${enabled ? 'activée' : 'désactivée'} en masse — ${changed} série(s) modifiée(s) sur ${series.length}`)
    res.json({ ok: true, changed, total: Object.keys(map).length })
})

/** GET /api/rss-sync/:id → statut sync pour une série */
router.get('/rss-sync/:id', requireAuth, (req, res) => {
    const serieId = Number(req.params.id)
    res.json({ synced: isSynced(serieId) })
})

/** POST /api/rss-sync/:id → activer la surveillance */
router.post('/rss-sync/:id', requireAuth, (req, res) => {
    const serieId   = Number(req.params.id)
    const serieName = String(req.body.serieName ?? '')
    if (!serieId || !serieName) { res.status(400).json({ error: 'serieId et serieName requis' }); return }
    const map = setSync(serieId, serieName, true)
    logger.info('rss-sync', `Surveillance activée pour "${serieName}" (id ${serieId})`)
    res.json({ synced: true, total: Object.keys(map).length })
})

/** DELETE /api/rss-sync/:id → désactiver la surveillance */
router.delete('/rss-sync/:id', requireAuth, (req, res) => {
    const serieId = Number(req.params.id)
    const map     = setSync(serieId, '', false)
    logger.info('rss-sync', `Surveillance désactivée pour la série ${serieId}`)
    res.json({ synced: false, total: Object.keys(map).length })
})

export default router
