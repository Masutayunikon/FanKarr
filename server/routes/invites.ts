import { Router }       from 'express'
import { requireAdmin } from '../auth.js'
import {
    readInvites, createInvite, deleteInvite,
    validateInvite, consumeInvite,
} from '../invites.js'
import { createUser, safeUser } from '../users.js'

const router = Router()

// GET /api/invites  (admin)
router.get('/invites', requireAdmin, (_req, res) => {
    res.json(readInvites())
})

// POST /api/invites  (admin)
router.post('/invites', requireAdmin, (req, res) => {
    const { expiresInHours, maxUses, note } = req.body
    try {
        const invite = createInvite({
            createdBy    : req.user!.id,
            expiresInHours: expiresInHours ?? null,
            maxUses       : maxUses        ?? 1,
            note,
        })
        res.json(invite)
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

// DELETE /api/invites/:code  (admin)
router.delete('/invites/:code', requireAdmin, (req, res) => {
    try {
        deleteInvite(req.params.code)
        res.json({ success: true })
    } catch (err) {
        res.status(404).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

// GET /api/invites/:code/info  (public — pour afficher la page d'inscription)
router.get('/invites/:code/info', (req, res) => {
    const result = validateInvite(req.params.code)
    if (!result.valid) {
        res.status(400).json({ valid: false, reason: result.reason }); return
    }
    res.json({ valid: true, note: result.invite.note ?? null })
})

// POST /api/invites/:code/register  (public — inscription via invitation)
router.post('/invites/:code/register', (req, res) => {
    const result = validateInvite(req.params.code)
    if (!result.valid) {
        res.status(400).json({ error: result.reason }); return
    }

    const { username, password } = req.body
    if (!username || !password) {
        res.status(400).json({ error: 'username et password requis' }); return
    }
    if (password.length < 6) {
        res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' }); return
    }

    try {
        const user = createUser(username, password, 'user')
        consumeInvite(req.params.code)
        res.json({ success: true, user: safeUser(user) })
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

export default router
