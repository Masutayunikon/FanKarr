import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { checkNfoUpdates, recentNfoUpdates, findMisplacedNfo, cleanupMisplacedNfo } from '../lib/nfo.js'

const router = Router()

router.get('/nfo-updates/recent', requireAuth, (_req, res) => {
    res.json(recentNfoUpdates)
})

router.post('/nfo-updates/check', requireAuth, async (_req, res) => {
    logger.info('nfo-update', 'Vérification manuelle des mises à jour NFO lancée')
    checkNfoUpdates().catch(err => logger.error('nfo-update', `Échec de la vérification manuelle des mises à jour NFO : ${err instanceof Error ? err.message : err}`))
    res.json({ ok: true, message: 'Vérification lancée en arrière-plan' })
})

router.get('/nfo-updates/misplaced', requireAuth, (_req, res) => {
    res.json(findMisplacedNfo())
})

router.post('/nfo-updates/misplaced/cleanup', requireAuth, (_req, res) => {
    try {
        res.json(cleanupMisplacedNfo())
    } catch (err) {
        logger.error('nfo-update', `Échec du nettoyage des NFO : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

export default router
