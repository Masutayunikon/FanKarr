import { Router }       from 'express'
import { readSettings, writeSettings } from '../settings.js'
import { readUsers, createUser, safeUser } from '../users.js'
import { testJellyfinConnection, fetchJellyfinUsers } from '../lib/jellyfin.js'
import { logger } from '../logger.js'

const router = Router()

// GET /api/jellyfin/settings
router.get('/jellyfin/settings', (_req, res) => {
    const { jellyfinUrl, jellyfinAdminToken } = readSettings()
    res.json({
        jellyfinUrl,
        // Ne jamais retourner le token en clair — juste indiquer s'il est configuré
        hasToken: !!jellyfinAdminToken,
    })
})

// POST /api/jellyfin/settings
router.post('/jellyfin/settings', (req, res) => {
    const { jellyfinUrl, jellyfinAdminToken } = req.body
    const update: Record<string, string> = {}
    if (jellyfinUrl        !== undefined) update.jellyfinUrl        = String(jellyfinUrl).trim()
    if (jellyfinAdminToken !== undefined) update.jellyfinAdminToken = String(jellyfinAdminToken).trim()
    const updated = writeSettings(update)
    res.json({ jellyfinUrl: updated.jellyfinUrl, hasToken: !!updated.jellyfinAdminToken })
})

// POST /api/jellyfin/test
router.post('/jellyfin/test', async (_req, res) => {
    const { jellyfinUrl, jellyfinAdminToken } = readSettings()
    if (!jellyfinUrl || !jellyfinAdminToken) {
        res.status(400).json({ ok: false, error: 'URL et token requis' }); return
    }
    const result = await testJellyfinConnection(jellyfinUrl, jellyfinAdminToken)
    res.json(result)
})

// POST /api/jellyfin/sync
router.post('/jellyfin/sync', async (_req, res) => {
    try {
        const jellyfinUsers = await fetchJellyfinUsers()
        const fankarrUsers  = readUsers()

        const results = { created: 0, skipped: 0, users: [] as string[] }

        for (const jUser of jellyfinUsers) {
            // Ignorer les comptes désactivés
            if (jUser.Policy?.IsDisabled) { results.skipped++; continue }

            const exists = fankarrUsers.some(u =>
                u.username.toLowerCase() === jUser.Name.toLowerCase()
            )

            if (exists) { results.skipped++; continue }

            // Créer le compte avec un mot de passe aléatoire (auth via SSO uniquement)
            const randomPass = Math.random().toString(36).slice(2, 10) +
                               Math.random().toString(36).slice(2, 10)
            createUser(jUser.Name, randomPass, 'user')
            results.created++
            results.users.push(jUser.Name)
            logger.info('jellyfin', `Compte créé pour "${jUser.Name}" (sync Jellyfin)`)
        }

        logger.info('jellyfin', `Sync terminée — ${results.created} créés, ${results.skipped} ignorés`)
        res.json(results)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur sync Jellyfin' })
    }
})

export default router
