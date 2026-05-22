import { Router } from 'express'
import {
    readUsers, createUser, updateUser, deleteUser,
    regenerateApiToken, safeUser,
} from '../users.js'

const router = Router()

// GET /api/users
router.get('/users', (_req, res) => {
    res.json(readUsers().map(safeUser))
})

// POST /api/users
router.post('/users', (req, res) => {
    const { username, password, role } = req.body
    if (!username || !password) {
        res.status(400).json({ error: 'username et password requis' }); return
    }
    if (password.length < 6) {
        res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' }); return
    }
    try {
        const user = createUser(username, password, role === 'admin' ? 'admin' : 'user')
        res.json(safeUser(user))
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

// PATCH /api/users/:id
router.patch('/users/:id', (req, res) => {
    const { username, password, role } = req.body
    try {
        const user = updateUser(req.params.id, { username, password, role })
        res.json(safeUser(user))
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

// DELETE /api/users/:id
router.delete('/users/:id', (req, res) => {
    // Empêche l'admin de se supprimer lui-même
    if (req.user?.id === req.params.id) {
        res.status(400).json({ error: 'Impossible de supprimer son propre compte' }); return
    }
    try {
        deleteUser(req.params.id)
        res.json({ success: true })
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

// POST /api/users/:id/regenerate-token
router.post('/users/:id/regenerate-token', (req, res) => {
    try {
        const token = regenerateApiToken(req.params.id)
        res.json({ apiToken: token })
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

export default router
