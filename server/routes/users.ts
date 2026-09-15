import { Router } from 'express'
import {
    readUsers, createUser, updateUser, deleteUser,
    regenerateApiToken, safeUser,
} from '../users.js'

const router = Router()

router.get('/users', (_req, res) => {
    res.json(readUsers().map(safeUser))
})

router.post('/users', (req, res) => {
    const { username, password, role } = req.body
    if (!username || !password) {
        res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' }); return
    }
    if (password.length < 6) {
        res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }); return
    }
    try {
        const user = createUser(username, password, role === 'admin' ? 'admin' : 'user')
        res.json(safeUser(user))
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

router.patch('/users/:id', (req, res) => {
    const { username, password, role } = req.body
    try {
        const user = updateUser(req.params.id, { username, password, role })
        res.json(safeUser(user))
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

router.delete('/users/:id', (req, res) => {
    if (req.user?.id === req.params.id) {
        res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }); return
    }
    try {
        deleteUser(req.params.id)
        res.json({ success: true })
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

router.post('/users/:id/regenerate-token', (req, res) => {
    try {
        const token = regenerateApiToken(req.params.id)
        res.json({ apiToken: token })
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

export default router
