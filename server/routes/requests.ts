import { Router }       from 'express'
import { requireAdmin } from '../auth.js'
import {
    readRequests, upsertRequest, approveRequest,
    rejectRequest, completeRequest, deleteRequest,
    getRequestsForUser, getPendingCount, mergedSeasons,
} from '../requests.js'

const router = Router()

// GET /api/requests — admin voit tout, user voit les siennes
router.get('/requests', (req, res) => {
    const list = req.user!.role === 'admin'
        ? readRequests()
        : getRequestsForUser(req.user!.id)
    res.json(list)
})

// GET /api/requests/pending-count — pour le widget dashboard
router.get('/requests/pending-count', (req, res) => {
    const count = req.user!.role === 'admin'
        ? getPendingCount()
        : getRequestsForUser(req.user!.id).filter(r => r.status === 'pending').length
    res.json({ count })
})

// POST /api/requests — créer ou mettre à jour une demande
router.post('/requests', (req, res) => {
    const { serieId, serieName, seasons } = req.body
    if (!serieId || !serieName) {
        res.status(400).json({ error: 'serieId et serieName requis' }); return
    }
    try {
        const request = upsertRequest(
            req.user!.id,
            Number(serieId),
            String(serieName),
            Array.isArray(seasons) ? seasons.map(Number) : [],
        )
        res.json(request)
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

// PATCH /api/requests/:id — admin : approve / reject / complete
router.patch('/requests/:id', requireAdmin, (req, res) => {
    const { action, rejectionMessage } = req.body
    try {
        let request
        if (action === 'approve')   request = approveRequest(req.params.id)
        else if (action === 'reject')   request = rejectRequest(req.params.id, rejectionMessage)
        else if (action === 'complete') request = completeRequest(req.params.id)
        else { res.status(400).json({ error: 'Action invalide (approve | reject | complete)' }); return }
        res.json(request)
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

// DELETE /api/requests/:id — admin seulement
router.delete('/requests/:id', requireAdmin, (req, res) => {
    try {
        deleteRequest(req.params.id)
        res.json({ success: true })
    } catch (err) {
        res.status(404).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

export default router
