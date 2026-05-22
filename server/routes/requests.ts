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
        const request = upsertRequest(
            req.user!.id,
            Number(serieId),
            String(serieName),
            Array.isArray(seasons)  ? seasons.map(Number)  : [],
            Array.isArray(episodes) ? episodes.map(Number) : [],
        )
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
            // Lancer le(s) téléchargement(s) correspondant à la demande
            autoDownloadRequest(request).catch(err =>
                logger.warn('requests', `Auto-dl échoué pour "${request.serieName}" : ${err instanceof Error ? err.message : err}`)
            )
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

    function addTorrent(t: any, file_index?: number | null, file_path?: string | null) {
        const key = `${t.infohash ?? t.magnet ?? t.torrent_url}:${file_index ?? ''}`
        if (seenHashes.has(key)) return
        seenHashes.add(key)
        toDownload.push({ url: t.torrent_url, magnet: t.magnet ?? null, infohash: t.infohash ?? null, file_index: file_index ?? null, file_path: file_path ?? null })
    }

    if (episodes.length > 0) {
        // ── Épisodes ciblés ───────────────────────────────────────
        for (const season of serieData.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                if (!episodes.includes(ep.id)) continue
                if (ep.torrents?.length > 0) {
                    // Torrent individuel
                    for (const t of ep.torrents) addTorrent(t)
                } else if (ep.paths?.length > 0) {
                    // Épisode contenu dans un pack — télécharger le fichier spécifique
                    for (const p of ep.paths) {
                        const pack = [...(serieData.torrents ?? []), ...(serieData.seasons ?? []).flatMap((s: any) => s.torrents ?? [])]
                            .find((t: any) => t.infohash?.toLowerCase() === p.infohash?.toLowerCase())
                        if (pack) addTorrent(pack, p.file_index ?? null, p.path ?? null)
                    }
                }
            }
        }
    } else if (seasons.length > 0) {
        // ── Saisons ciblées ───────────────────────────────────────
        for (const season of serieData.seasons ?? []) {
            if (!seasons.includes(season.season_number)) continue
            for (const t of season.torrents ?? []) addTorrent(t)
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
