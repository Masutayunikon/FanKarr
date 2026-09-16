
import { Router }                from 'express'
import { findByApiToken }        from '../users.js'
import { validateJellyfinToken } from '../lib/jellyfin.js'
import { readUsers, safeUser }   from '../users.js'
import { upsertRequest, approveRequest, getRequestsForUser } from '../requests.js'
import { autoDownloadRequest } from './requests.js'
import { readSettings }        from '../settings.js'
import { readAvailable }         from '../lib/github-cache.js'
import { fankaiGet, normalizeSerie, normalizeSeason, normalizeEpisode } from '../lib/serie-helpers.js'
import { logger }                from '../logger.js'
import type { Request, Response, NextFunction } from 'express'

const router = Router()

// ── Jeton d'API ───────────────────────────────────────────────

function requireApiToken(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Jeton d\'API requis (Authorization: Bearer <jeton>)' }); return
    }
    const user = findByApiToken(header.slice(7))
    if (!user) {
        res.status(401).json({ error: 'Jeton d\'API invalide' }); return
    }
    req.user = user
    next()
}

// ── POST /api/v1/auth/jellyfin ────────────────────────────────
// Échange un jeton Jellyfin contre un jeton FanKarr
router.post('/v1/auth/jellyfin', async (req, res) => {
    const { jellyfinUserId, jellyfinToken } = req.body
    if (!jellyfinUserId || !jellyfinToken) {
        res.status(400).json({ error: 'jellyfinUserId et jellyfinToken requis' }); return
    }

    const info = await validateJellyfinToken(jellyfinUserId, jellyfinToken)
    if (!info.valid) {
        res.status(401).json({ error: info.error ?? 'Échec de l\'authentification Jellyfin' }); return
    }

    const users    = readUsers()
    const fanUser  = users.find(u => u.username.toLowerCase() === info.username!.toLowerCase())
    if (!fanUser) {
        logger.warn('public-api', `Connexion via Jellyfin : aucun compte FanKarr pour « ${info.username} » : synchronisation Jellyfin nécessaire`)
        res.status(404).json({
            error: `Aucun compte FanKarr pour « ${info.username} ». Demandez à l'administrateur de lancer la synchronisation Jellyfin.`,
        }); return
    }

    logger.info('public-api', `Connexion via Jellyfin réussie pour « ${fanUser.username} »`)
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
router.get('/v1/series/search', requireApiToken, async (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase()
    try {
        const [apiData, availableIds] = await Promise.all([
            fankaiGet('/series'),
            readAvailable(),
        ])
        const availableSet = new Set<number>(availableIds)
        const all: any[]   = (Array.isArray(apiData) ? apiData : (apiData.series ?? [])).map(normalizeSerie)

        // Demandes actives de cet utilisateur, indexées par serieId
        const activeRequests = getRequestsForUser(req.user!.id)
            .filter(r => r.status !== 'rejected' && r.status !== 'completed')
        const requestMap = new Map<number, { id: string; status: string; seasons: number[]; episodes: number[] }>()
        for (const r of activeRequests) {
            const me = r.requesters.find(rq => rq.userId === req.user!.id)
            if (!me) continue
            requestMap.set(r.serieId, {
                id      : r.id,
                status  : r.status,
                seasons : me.seasons,
                episodes: me.episodes ?? [],
            })
        }

        const results = all
            .filter(s => availableSet.has(s.id))
            .filter(s => !q || s.title?.toLowerCase().includes(q) || s.original_title?.toLowerCase().includes(q))
            .slice(0, 50)
            .map(s => ({
                id            : s.id,
                title         : s.title,
                original_title: s.original_title ?? null,
                image         : s.poster_image ?? null,
                year          : s.year ?? null,
                rating        : s.rating?.value ?? null,
                description   : s.plot ?? null,
                request       : requestMap.get(s.id) ?? null,
            }))

        res.json(results)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

// ── GET /api/v1/series/:id ────────────────────────────────────
// Relais de l'API Fankai
router.get('/v1/series/:id', requireApiToken, async (req, res) => {
    const id = Number(req.params.id)
    if (isNaN(id)) { res.status(400).json({ error: 'Identifiant de série invalide' }); return }
    try {
        const [serieRaw, seasonsData] = await Promise.all([
            fankaiGet(`/series/${id}`),
            fankaiGet(`/series/${id}/seasons`),
        ])
        const serie   = normalizeSerie(serieRaw)
        const seasons = Array.isArray(seasonsData) ? seasonsData : (seasonsData.seasons ?? [])

        const seasonsWithEpisodes = await Promise.all(
            seasons.map(async (season: any) => {
                const epsData  = await fankaiGet(`/seasons/${season.id}/episodes`)
                const episodes = (Array.isArray(epsData) ? epsData : (epsData.episodes ?? []))
                    .map((ep: any) => ({
                        id            : ep.id,
                        episode_number: ep.episode_number,
                        title         : ep.title ?? null,
                        image         : normalizeEpisode(ep).thumb_image ?? null,
                    }))
                return {
                    ...normalizeSeason(season),
                    season_number: season.season_number,
                    episodes,
                }
            })
        )

        res.json({
            id            : serie.id,
            title         : serie.title,
            original_title: serie.original_title ?? null,
            image         : serie.poster_image ?? null,
            seasons       : seasonsWithEpisodes,
        })
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

// ── POST /api/v1/requests ─────────────────────────────────────
router.post('/v1/requests', requireApiToken, (req, res) => {
    const { serieId, serieName, seasons, episodes } = req.body
    if (!serieId || !serieName) {
        res.status(400).json({ error: 'serieId et serieName requis' }); return
    }
    try {
        const submittedSeasons  = Array.isArray(seasons)  ? seasons.map(Number)  : []
        const submittedEpisodes = Array.isArray(episodes) ? episodes.map(Number) : []

        let request = upsertRequest(
            req.user!.id,
            Number(serieId),
            String(serieName),
            submittedSeasons,
            submittedEpisodes,
        )

        const { requestAutoDownloadUsers } = readSettings()
        const userId  = req.user!.id
        const allowed = requestAutoDownloadUsers === 'all'
            || (Array.isArray(requestAutoDownloadUsers) && requestAutoDownloadUsers.includes(userId))

        if (allowed) {
            const isNew     = request.status === 'pending'
            if (isNew) request = approveRequest(request.id)
            const dlOverride = isNew ? undefined : { seasons: submittedSeasons, episodes: submittedEpisodes }
            autoDownloadRequest(request, dlOverride).catch(err =>
                logger.warn('public-api', `Échec du téléchargement automatique de « ${request.serieName} » : ${err instanceof Error ? err.message : err}`)
            )
        }

        res.json(request)
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

// ── GET /api/v1/requests ──────────────────────────────────────
router.get('/v1/requests', requireApiToken, (req, res) => {
    res.json(getRequestsForUser(req.user!.id))
})

export default router
