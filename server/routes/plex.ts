import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'

const router = Router()

const PLEX_TV_API = 'https://plex.tv/api/v2'

async function plexFetch(url: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Accept'                  : 'application/json',
            'X-Plex-Client-Identifier': 'fankarr',
            'X-Plex-Product'          : 'FanKarr',
            'X-Plex-Version'          : '1.0',
            ...(options.headers ?? {}),
        },
    })
    if (!res.ok) throw new Error(`Plex ${res.status}: ${await res.text()}`)
    const text = await res.text()
    return text ? JSON.parse(text) : {}
}

function mapServers(resources: any[]) {
    return (Array.isArray(resources) ? resources : [])
        .filter((r: any) => r.product === 'Plex Media Server')
        .map((r: any) => ({
            name       : r.name,
            owned      : r.owned,
            connections: (r.connections ?? []).map((c: any) => ({ uri: c.uri, local: c.local, relay: c.relay })),
        }))
}

// POST /api/plex/connect — auth plex.tv + liste serveurs
router.post('/plex/connect', requireAuth, async (req, res) => {
    const { username, password, code } = req.body
    if (!username || !password) { res.status(400).json({ error: 'Email et mot de passe requis' }); return }
    try {
        const params = new URLSearchParams({ login: username, password })
        if (code) params.set('verificationCode', code)
        const authData = await plexFetch(`${PLEX_TV_API}/users/signin`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body   : params.toString(),
        })
        const token = authData.authToken ?? authData.user?.authToken
        if (!token) throw new Error('Token non reçu')
        const resources = await plexFetch('https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1&includeIPv6=1', { headers: { 'X-Plex-Token': token } })
        const servers = mapServers(resources)
        logger.info('plex', `Auth réussie pour ${username} — ${servers.length} serveur(s)`)
        res.json({ ok: true, token, servers })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        if (msg.includes('401')) {
            res.status(401).json({ error: '2FA requis ou identifiants incorrects', requires2FA: true })
        } else {
            logger.error('plex', `Auth échouée : ${msg}`)
            res.status(401).json({ error: 'Authentification échouée — vérifiez vos identifiants' })
        }
    }
})

// POST /api/plex/oauth/start — démarre le flow OAuth
router.post('/plex/oauth/start', requireAuth, async (_req, res) => {
    try {
        const data = await plexFetch(`${PLEX_TV_API}/pins`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body   : new URLSearchParams({ strong: 'true', 'X-Plex-Client-Identifier': 'fankarr' }).toString(),
        })
        const pinId   = data.id
        const pinCode = data.code
        if (!pinId || !pinCode) throw new Error('Pin non reçu')
        const authUrl = `https://app.plex.tv/auth#?clientID=fankarr&code=${pinCode}&context%5Bdevice%5D%5Bproduct%5D=FanKarr&forwardUrl=https%3A%2F%2Fplex.tv`
        logger.info('plex', `OAuth démarré — pinId ${pinId}`)
        res.json({ ok: true, pinId, pinCode, authUrl })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        logger.error('plex', `OAuth start échoué : ${msg}`)
        res.status(500).json({ error: msg })
    }
})

// GET /api/plex/oauth/poll/:pinId — vérifie si l'OAuth est complété
router.get('/plex/oauth/poll/:pinId', requireAuth, async (req, res) => {
    const pinId = String(req.params.pinId)
    try {
        const data = await plexFetch(`${PLEX_TV_API}/pins/${pinId}?X-Plex-Client-Identifier=fankarr`)
        const token = data.authToken
        if (!token) { res.json({ ok: false, pending: true }); return }
        const resources = await plexFetch('https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1&includeIPv6=1', { headers: { 'X-Plex-Token': token } })
        const servers = mapServers(resources)
        logger.info('plex', `OAuth complété — ${servers.length} serveur(s)`)
        res.json({ ok: true, pending: false, token, servers })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        res.status(500).json({ error: msg })
    }
})

// POST /api/plex/setup — enregistre l'agent Fankai + crée la bibliothèque
router.post('/plex/setup', requireAuth, async (req, res) => {
    const { token, serverUrl, libraryName, libraryPath } = req.body
    if (!token || !serverUrl || !libraryName || !libraryPath) {
        res.status(400).json({ error: 'token, serverUrl, libraryName, libraryPath requis' }); return
    }
    const headers: Record<string, string> = { 'X-Plex-Token': token, 'Accept': 'application/json' }
    const TARGET_AGENT_URI = 'https://metadata.fankai.fr/plex'
    const steps: { step: string; ok: boolean; message: string }[] = []
    let agentIdentifier = 'tv.plex.agents.custom.fankai'
    let groupId: string | null = null
    let agentSetupOk = false

    // ── Étape 1 : Enregistrer le provider Fankai ─────────────
    try {
        const providersRes = await fetch(`${serverUrl}/media/providers/metadata`, { headers })
        if (providersRes.ok) {
            const data = await providersRes.json()
            const providers: any[] = data?.MediaContainer?.MetadataAgentProvider ?? []
            let provider = providers.find((p: any) => p.uri === TARGET_AGENT_URI)
            if (!provider) {
                const r = await fetch(`${serverUrl}/media/providers/metadata?uri=${encodeURIComponent(TARGET_AGENT_URI)}`, { method: 'POST', headers })
                if (r.ok) provider = (await r.json())?.MediaContainer?.MetadataAgentProvider?.[0]
            }
            if (provider) {
                agentIdentifier = provider.identifier ?? agentIdentifier
                steps.push({ step: 'provider', ok: true, message: `Provider enregistré (${agentIdentifier})` })
            }
            const groupsRes = await fetch(`${serverUrl}/media/providers/metadata/group`, { headers })
            if (groupsRes.ok) {
                const gdata = await groupsRes.json()
                const groups: any[] = gdata?.MediaContainer?.MetadataAgentProviderGroup ?? []
                let group = groups.find((g: any) => g.primaryIdentifier === agentIdentifier)
                if (!group) {
                    const r = await fetch(`${serverUrl}/media/providers/metadata/group?title=Fankai&primaryIdentifier=${encodeURIComponent(agentIdentifier)}`, { method: 'POST', headers })
                    if (r.ok) group = (await r.json())?.MediaContainer?.MetadataAgentProviderGroup?.[0]
                }
                if (group) {
                    groupId = String(group.id ?? '')
                    steps.push({ step: 'group', ok: true, message: `Groupe d'agents créé (ID: ${groupId})` })
                    agentSetupOk = true
                }
            }
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        steps.push({ step: 'agent', ok: false, message: `Agent non configuré (Plex < 1.43 ?) — setup manuel requis` })
        logger.warn('plex', `Setup agent Fankai échoué : ${msg}`)
    }

    // ── Étape 2 : Créer la bibliothèque ──────────────────────
    try {
        const params = new URLSearchParams({ type: 'show', name: libraryName, agent: agentIdentifier, scanner: 'Plex TV Series', language: 'fr-FR', location: libraryPath })
        if (groupId) params.set('metadataAgentProviderGroupId', groupId)
        const libRes = await fetch(`${serverUrl}/library/sections?${params}`, { method: 'POST', headers })
        if (!libRes.ok) throw new Error(`HTTP ${libRes.status}: ${await libRes.text()}`)
        steps.push({ step: 'library', ok: true, message: `Bibliothèque "${libraryName}" créée` })
        logger.info('plex', `Bibliothèque "${libraryName}" créée sur ${serverUrl}`)
        res.json({ ok: true, agentSetupOk, steps, manualSetup: !agentSetupOk })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        steps.push({ step: 'library', ok: false, message: `Création bibliothèque échouée : ${msg}` })
        logger.error('plex', `Création bibliothèque échouée : ${msg}`)
        res.status(500).json({ ok: false, steps, error: msg })
    }
})

export default router
