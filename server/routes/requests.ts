import { Router }       from 'express'
import { requireAdmin } from '../auth.js'
import {
    readRequests, upsertRequest, approveRequest,
    rejectRequest, completeRequest, deleteRequest,
    getRequestsForUser, getPendingCount, mergedSeasons, mergedEpisodes,
    type SerieRequest,
} from '../requests.js'
import { dispatchDownload } from '../torrent-clients/index.js'
import { readSerieData }    from '../lib/github-cache.js'
import { readSettings }     from '../settings.js'
import { logger }           from '../logger.js'

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
    const { serieId, serieName, seasons, episodes } = req.body
    if (!serieId || !serieName) {
        res.status(400).json({ error: 'serieId et serieName requis' }); return
    }
    try {
        let request = upsertRequest(
            req.user!.id,
            Number(serieId),
            String(serieName),
            Array.isArray(seasons)  ? seasons.map(Number)  : [],
            Array.isArray(episodes) ? episodes.map(Number) : [],
        )

        // Auto-approbation + téléchargement si l'utilisateur est autorisé
        if (request.status === 'pending') {
            const { requestAutoDownloadUsers } = readSettings()
            const userId = req.user!.id
            const allowed = requestAutoDownloadUsers === 'all'
                || (Array.isArray(requestAutoDownloadUsers) && requestAutoDownloadUsers.includes(userId))
            if (allowed) {
                request = approveRequest(request.id)
                autoDownloadRequest(request).catch(err =>
                    logger.warn('requests', `Auto-dl échoué pour "${request.serieName}" : ${err instanceof Error ? err.message : err}`)
                )
            }
        }

        res.json(request)
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

// PATCH /api/requests/:id — admin : approve / reject / complete
router.patch('/requests/:id', requireAdmin, async (req, res) => {
    const { action, rejectionMessage } = req.body
    try {
        let request: SerieRequest
        const id = String(req.params.id)
        if (action === 'approve') {
            request = approveRequest(id)
            // Lancer le(s) téléchargement(s) si au moins un requester est autorisé
            const { requestAutoDownloadUsers } = readSettings()
            const enabled = requestAutoDownloadUsers === 'all'
                ? true
                : Array.isArray(requestAutoDownloadUsers) && requestAutoDownloadUsers.length > 0
                  && request.requesters.some(r => (requestAutoDownloadUsers as string[]).includes(r.userId))
            if (enabled) {
                autoDownloadRequest(request).catch(err =>
                    logger.warn('requests', `Auto-dl échoué pour "${request.serieName}" : ${err instanceof Error ? err.message : err}`)
                )
            }
        } else if (action === 'reject')   request = rejectRequest(id, rejectionMessage)
        else if (action === 'complete')   request = completeRequest(id)
        else { res.status(400).json({ error: 'Action invalide (approve | reject | complete)' }); return }
        res.json(request)
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

/** Trouve et envoie au client torrent les fichiers correspondant à la demande. */
async function autoDownloadRequest(req: SerieRequest): Promise<void> {
    const serieData = await readSerieData(req.serieId)
    if (!serieData) {
        logger.warn('requests', `Auto-dl : aucune donnée torrent pour série ${req.serieId}`)
        return
    }

    const seasons  = mergedSeasons(req)   // [] = toutes
    const episodes = mergedEpisodes(req)  // IDs d'épisodes spécifiques

    type TorrentEntry = { url: string; magnet: string | null; infohash: string | null; file_index?: number | null; file_path?: string | null }
    const toDownload: TorrentEntry[] = []
    const seenHashes = new Set<string>()

    // Tous les torrents pack (série + saisons) pour résoudre les ep.paths
    const allPackTorrents: any[] = [
        ...(serieData.torrents ?? []),
        ...(serieData.seasons ?? []).flatMap((s: any) => s.torrents ?? []),
    ]

    function addTorrent(t: any, file_index?: number | null, file_path?: string | null) {
        const key = `${t.infohash ?? t.magnet ?? t.torrent_url}:${file_index ?? ''}`
        if (seenHashes.has(key)) return
        seenHashes.add(key)
        toDownload.push({ url: t.torrent_url, magnet: t.magnet ?? null, infohash: t.infohash ?? null, file_index: file_index ?? null, file_path: file_path ?? null })
    }

    /**
     * Ajoute tous les épisodes d'une liste via leurs torrents individuels ou via file_index dans un pack.
     * Utilisé en fallback quand il n'y a pas de torrent de saison/série globale.
     */
    function addEpisodesByIndex(epList: any[]) {
        for (const ep of epList) {
            if (ep.torrents?.length > 0) {
                for (const t of ep.torrents) addTorrent(t)
            } else if (ep.paths?.length > 0) {
                for (const p of ep.paths) {
                    const pack = allPackTorrents.find((t: any) => t.infohash?.toLowerCase() === p.infohash?.toLowerCase())
                    if (pack) addTorrent(pack, p.file_index ?? null, p.path ?? null)
                }
            }
        }
    }

    if (episodes.length > 0) {
        // ── Épisodes ciblés ───────────────────────────────────────
        for (const season of serieData.seasons ?? []) {
            const targets = (season.episodes ?? []).filter((ep: any) => episodes.includes(ep.id))
            addEpisodesByIndex(targets)
        }
    } else if (seasons.length > 0) {
        // ── Saisons ciblées ───────────────────────────────────────
        for (const season of serieData.seasons ?? []) {
            if (!seasons.includes(season.season_number)) continue
            if ((season.torrents ?? []).length > 0) {
                // Pack saison disponible → télécharger en bloc
                for (const t of season.torrents) addTorrent(t)
            } else {
                // Pas de pack → épisode par épisode avec file_index
                addEpisodesByIndex(season.episodes ?? [])
            }
        }
    } else {
        // ── Toutes les saisons : intégrale en priorité ────────────
        for (const t of serieData.torrents ?? []) addTorrent(t)
        // Sinon packs saison
        if (toDownload.length === 0) {
            for (const season of serieData.seasons ?? []) {
                for (const t of season.torrents ?? []) addTorrent(t)
            }
        }
        // Sinon épisode par épisode avec file_index
        if (toDownload.length === 0) {
            for (const season of serieData.seasons ?? []) {
                addEpisodesByIndex(season.episodes ?? [])
            }
        }
    }

    if (toDownload.length === 0) {
        logger.warn('requests', `Auto-dl : aucun torrent trouvé pour "${req.serieName}"`)
        return
    }

    let sent = 0
    for (const t of toDownload) {
        const url = t.url ?? t.magnet
        if (!url) continue
        try {
            await dispatchDownload(url, { infohash: t.infohash ?? undefined, magnet: t.magnet ?? undefined, file_index: t.file_index ?? null, file_path: t.file_path ?? null })
            sent++
        } catch (err) {
            logger.warn('requests', `Auto-dl erreur torrent : ${err instanceof Error ? err.message : err}`)
        }
    }
    logger.info('requests', `Auto-dl "${req.serieName}" — ${sent}/${toDownload.length} torrent(s) envoyé(s)`)
}

// DELETE /api/requests/:id — admin seulement
router.delete('/requests/:id', requireAdmin, (req, res) => {
    try {
        deleteRequest(String(req.params.id))
        res.json({ success: true })
    } catch (err) {
        res.status(404).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

export default router
