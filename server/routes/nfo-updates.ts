import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { checkNfoUpdates, recentNfoUpdates } from '../lib/nfo.js'

const router = Router()

router.get('/nfo-updates/recent', requireAuth, (_req, res) => {
    res.json(recentNfoUpdates)
})

router.post('/nfo-updates/check', requireAuth, async (_req, res) => {
    logger.info('nfo-update', 'Vérification manuelle des MAJ NFO lancée')
    checkNfoUpdates().catch(err => logger.error('nfo-update', `Vérif manuelle échouée : ${err instanceof Error ? err.message : err}`))
    res.json({ ok: true, message: 'Vérification lancée en arrière-plan' })
})

export default router
