/**
 * API publique v1 — pour le plugin Jellyfin et intégrations tierces
 * Auth : Bearer {apiToken} dans le header Authorization
 */

import { Router }                from 'express'
import { findByApiToken }        from '../users.js'
import { validateJellyfinToken } from '../lib/jellyfin.js'
import { readUsers, safeUser }   from '../users.js'
import { upsertRequest, getRequestsForUser } from '../requests.js'
import { readAvailable }         from '../lib/github-cache.js'
import { fankaiGet, normalizeSerie } from '../lib/serie-helpers.js'
import { logger }                from '../logger.js'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// ── Middleware auth API token ─────────────────────────────────

function requireApiToken(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token requis (Authorization: Bearer <token>)' }); return
    }
    const user = findByApiToken(header.slice(7))
    if (!user) {
        res.status(401).json({ error: 'Token invalide' }); return
    }
    req.user = user
    next()
}

// ── POST /api/v1/auth/jellyfin ────────────────────────────────
// Échange un token Jellyfin contre un token FanKarr
// Body: { jellyfinUserId, jellyfinToken }
router.post('/v1/auth/jellyfin', async (req, res) => {
    const { jellyfinUserId, jellyfinToken } = req.body
    if (!jellyfinUserId || !jellyfinToken) {
        res.status(400).json({ error: 'jellyfinUserId et jellyfinToken requis' }); return
    }

    const info = await validateJellyfinToken(jellyfinUserId, jellyfinToken)
    if (!info.valid) {
        res.status(401).json({ error: info.error ?? 'Authentification Jellyfin échouée' }); return
    }

    // Trouver l'utilisateur FanKarr correspondant (par username)
    const users    = readUsers()
    const fanUser  = users.find(u => u.username.toLowerCase() === info.username!.toLowerCase())
    if (!fanUser) {
        logger.warn('public-api', `SSO Jellyfin : aucun compte FanKarr pour "${info.username}" — sync requise`)
        res.status(404).json({
            error: `Aucun compte FanKarr pour "${info.username}". Demandez à l'admin de lancer la synchronisation Jellyfin.`,
        }); return
    }

    logger.info('public-api', `SSO Jellyfin réussi pour "${fanUser.username}"`)
    res.json({
        token   : fanUser.apiToken,
        username: fanUser.username,
        role    : fanUser.role,
    })
})

// ── GET /api/v1/auth/me ───────────────────────────────────────
router.get('/v1/auth/me', requireApiToken, (req, res) => {
    res.json(safeUser(req.user!))
})

// ── GET /api/v1/series/search?q= ─────────────────────────────
// Recherche dans le catalogue FanKai
router.get('/v1/series/search', requireApiToken, async (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase()
    try {
        const [apiData, availableIds] = await Promise.all([
            fankaiGet('/series'),
            readAvailable(),
        ])
        const availableSet = new Set<number>(availableIds)
        const all: any[]   = (Array.isArray(apiData) ? apiData : (apiData.series ?? [])).map(normalizeSerie)

        const results = all
            .filter(s => !q || s.title?.toLowerCase().includes(q) || s.original_title?.toLowerCase().includes(q))
            .slice(0, 50)
            .map(s => ({
                id            : s.id,
                title         : s.title,
                original_title: s.original_title ?? null,
                image         : s.poster_image ?? null,
                available     : availableSet.has(s.id),
            }))

        res.json(results)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

// ── POST /api/v1/requests ─────────────────────────────────────
// Créer ou mettre à jour une demande
router.post('/v1/requests', requireApiToken, (req, res) => {
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

// ── GET /api/v1/requests ──────────────────────────────────────
// Demandes de l'utilisateur authentifié
router.get('/v1/requests', requireApiToken, (req, res) => {
    res.json(getRequestsForUser(req.user!.id))
})

export default router
