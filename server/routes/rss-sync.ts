import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { logger }      from '../logger.js'
import { loadSynced, setSync, getSync, runRssSync } from '../lib/rss-sync.js'

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

/** GET /api/rss-sync/:id → statut sync pour une série */
router.get('/rss-sync/:id', requireAuth, (req, res) => {
    const serieId = Number(req.params.id)
    const entry   = getSync(serieId)
    res.json({ synced: !!entry, multiOnly: !!entry?.multiOnly })
})

/** POST /api/rss-sync/:id → activer la surveillance (body: { serieName, multiOnly? }) */
router.post('/rss-sync/:id', requireAuth, (req, res) => {
    const serieId   = Number(req.params.id)
    const serieName = String(req.body.serieName ?? '')
    const multiOnly = !!req.body.multiOnly
    if (!serieId || !serieName) { res.status(400).json({ error: 'serieId et serieName requis' }); return }
    const map = setSync(serieId, serieName, true, multiOnly)
    logger.info('rss-sync', `Surveillance activée pour "${serieName}" (id ${serieId})${multiOnly ? ' — MULTI uniquement' : ''}`)
    res.json({ synced: true, multiOnly, total: Object.keys(map).length })
})

/** DELETE /api/rss-sync/:id → désactiver la surveillance */
router.delete('/rss-sync/:id', requireAuth, (req, res) => {
    const serieId = Number(req.params.id)
    const map     = setSync(serieId, '', false)
    logger.info('rss-sync', `Surveillance désactivée pour la série ${serieId}`)
    res.json({ synced: false, total: Object.keys(map).length })
})

export default router
