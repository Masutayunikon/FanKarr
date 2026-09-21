import { Router }       from 'express'
import { readSettings, writeSettings, type Settings } from '../settings.js'
import { readUsers, importJellyfinUser } from '../users.js'
import { testJellyfinConnection, fetchJellyfinUsers, getJellyfinServerId, normalizeJellyfinId, type JellyfinUser } from '../lib/jellyfin.js'
import { logger } from '../logger.js'

const router = Router()

function settingsView(s: Settings) {
    return {
        jellyfinUrl         : s.jellyfinUrl,
        hasToken            : !!s.jellyfinAdminToken,
        jellyfinLogin       : s.jellyfinLogin,
        jellyfinNewUserLogin: s.jellyfinNewUserLogin,
        jellyfinAutoImport  : s.jellyfinAutoImport,
    }
}

router.get('/jellyfin/settings', (_req, res) => {
    res.json(settingsView(readSettings()))
})

router.post('/jellyfin/settings', (req, res) => {
    const { jellyfinUrl, jellyfinAdminToken } = req.body ?? {}
    const current = readSettings()
    const update: Partial<Settings> = {}
    if (jellyfinUrl        !== undefined) update.jellyfinUrl        = String(jellyfinUrl).trim()
    if (jellyfinAdminToken !== undefined) update.jellyfinAdminToken = String(jellyfinAdminToken).trim()
    for (const key of ['jellyfinLogin', 'jellyfinNewUserLogin', 'jellyfinAutoImport'] as const) {
        if (typeof req.body?.[key] === 'boolean') update[key] = req.body[key]
    }
    if ((update.jellyfinUrl        !== undefined && update.jellyfinUrl        !== current.jellyfinUrl) ||
        (update.jellyfinAdminToken !== undefined && update.jellyfinAdminToken !== current.jellyfinAdminToken)) {
        update.jellyfinServerId = ''
    }
    res.json(settingsView(writeSettings(update)))
})

router.post('/jellyfin/test', async (req, res) => {
    const settings = readSettings()

    const jellyfinUrl = req.body?.jellyfinUrl || settings.jellyfinUrl
    const jellyfinAdminToken = req.body?.jellyfinAdminToken || settings.jellyfinAdminToken

    if (!jellyfinUrl || !jellyfinAdminToken) {
        return res.status(400).json({
            ok: false,
            error: 'URL et clé API requises'
        })
    }

    const result = await testJellyfinConnection(
      jellyfinUrl,
      jellyfinAdminToken
    )

    res.json(result)
})

// ── Import des utilisateurs ───────────────────────────────────

export type JellyfinImportResult = { created: number; linked: number; skipped: number; users: string[] }

function importJellyfinUsers(jellyfinUsers: JellyfinUser[]): JellyfinImportResult {
    const results: JellyfinImportResult = { created: 0, linked: 0, skipped: 0, users: [] }

    for (const jUser of jellyfinUsers) {
        if (jUser.Policy?.IsDisabled) { results.skipped++; continue }
        const imported = importJellyfinUser(jUser)
        if (!imported || imported.action === 'existing') { results.skipped++; continue }
        results[imported.action]++
        results.users.push(imported.user.username)
    }

    logger.info('jellyfin', `Import Jellyfin : ${results.created} compte(s) créé(s), ${results.linked} lié(s), ${results.skipped} ignoré(s) (déjà importé, désactivé ou nom déjà pris)`)
    return results
}

export async function runJellyfinImport(): Promise<JellyfinImportResult> {
    const { jellyfinUrl, jellyfinAdminToken } = readSettings()
    if (!jellyfinUrl || !jellyfinAdminToken) return { created: 0, linked: 0, skipped: 0, users: [] }

    await getJellyfinServerId()
    return importJellyfinUsers(await fetchJellyfinUsers())
}

router.get('/jellyfin/users', async (_req, res) => {
    try {
        const jellyfinUsers = await fetchJellyfinUsers()
        const users         = readUsers()
        res.json(jellyfinUsers.map(j => {
            const id       = normalizeJellyfinId(j.Id)
            const linked   = users.find(u => u.jellyfinId === id)
            const sameName = users.find(u => u.username.toLowerCase() === j.Name.toLowerCase())
            const status   = linked               ? 'imported'
                           : j.Policy?.IsDisabled ? 'disabled'
                           : sameName?.jellyfinId ? 'conflict'
                           : sameName             ? 'match'
                           :                        'new'
            return {
                id,
                name           : j.Name,
                status,
                fankarrUsername: (linked ?? sameName)?.username ?? null,
            }
        }))
    } catch (err) {
        res.status(502).json({ error: err instanceof Error ? err.message : 'Impossible de récupérer les utilisateurs Jellyfin' })
    }
})

router.post('/jellyfin/import', async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id: unknown) => normalizeJellyfinId(String(id))) : []
    if (ids.length === 0) {
        res.status(400).json({ error: 'Aucun utilisateur sélectionné' }); return
    }
    try {
        await getJellyfinServerId()
        const selected = (await fetchJellyfinUsers()).filter(j => ids.includes(normalizeJellyfinId(j.Id)))
        res.json(importJellyfinUsers(selected))
    } catch (err) {
        res.status(502).json({ error: err instanceof Error ? err.message : 'Échec de l\'import des utilisateurs Jellyfin' })
    }
})

// Import de tous les comptes actifs (assistant d'installation)
router.post('/jellyfin/sync', async (_req, res) => {
    try {
        res.json(await runJellyfinImport())
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Échec de l\'import des utilisateurs Jellyfin' })
    }
})

export default router
