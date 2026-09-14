import { Router }       from 'express'
import { requireAdmin } from '../auth.js'
import {
    readRequests, upsertRequest, approveRequest,
    rejectRequest, completeRequest, deleteRequest, withdrawRequest,
    getRequestsForUser, getPendingCount, mergedSeasons, mergedEpisodes,
    type SerieRequest,
} from '../requests.js'
import { dispatchDownload } from '../torrent-clients/index.js'
import { readSerieData }    from '../lib/github-cache.js'
import { resolveRequestTorrents, countRequestedEpisodes } from '../lib/request-scope.js'
import { readSettings }     from '../settings.js'
import { logger }           from '../logger.js'

const router = Router()

// GET /api/requests — admin voit tout, user voit les siennes
router.get('/requests', async (req, res) => {
    const list = req.user!.role === 'admin'
        ? readRequests()
        : getRequestsForUser(req.user!.id)
    res.json(await withScope(list))
})

async function withScope(list: SerieRequest[]) {
    const serieData = new Map<number, Promise<any | null>>()
    return Promise.all(list.map(async r => {
        if (!serieData.has(r.serieId)) serieData.set(r.serieId, readSerieData(r.serieId))
        const sd       = await serieData.get(r.serieId)
        const seasons  = mergedSeasons(r)
        const episodes = mergedEpisodes(r)
        return {
            ...r,
            episodeCount: sd ? countRequestedEpisodes(sd, seasons, episodes) : null,
            hasTorrents : !!sd && resolveRequestTorrents(sd, seasons, episodes).length > 0,
        }
    }))
}

// GET /api/requests/pending-count — pour le widget dashboard
router.get('/requests/pending-count', (req, res) => {
    const count = req.user!.role === 'admin'
        ? getPendingCount()
        : getRequestsForUser(req.user!.id).filter(r => r.status === 'pending').length
    res.json({ count })
})

// POST /api/requests — créer ou mettre à jour une demande
router.post('/requests', (req, res) => {
    const { serieId, serieName, seasons, episodes, torrentOverride } = req.body
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

        // Auto-approbation + téléchargement si l'utilisateur est autorisé
        const { requestAutoDownloadUsers } = readSettings()
        const userId = req.user!.id
        const allowed = requestAutoDownloadUsers === 'all'
            || (Array.isArray(requestAutoDownloadUsers) && requestAutoDownloadUsers.includes(userId))

        if (allowed) {
            const isNew = request.status === 'pending'
            if (isNew) request = approveRequest(request.id)

            if (torrentOverride?.torrent_url || torrentOverride?.magnet) {
                // L'utilisateur a sélectionné un torrent spécifique → l'envoyer directement
                const url = torrentOverride.torrent_url ?? torrentOverride.magnet
                dispatchDownload(url, {
                    infohash  : torrentOverride.infohash   ?? null,
                    magnet    : torrentOverride.magnet     ?? null,
                    file_index: torrentOverride.file_index ?? null,
                    file_path : torrentOverride.file_path  ?? null,
                }).catch(err =>
                    logger.warn('requests', `Auto-dl (override) échoué pour "${request.serieName}" : ${err instanceof Error ? err.message : err}`)
                )
            } else {
                // Pas de torrent sélectionné → résolution automatique
                const dlOverride = isNew ? undefined : { seasons: submittedSeasons, episodes: submittedEpisodes }
                autoDownloadRequest(request, dlOverride).catch(err =>
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
            // Approbation manuelle par l'admin → toujours lancer le téléchargement
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

/**
 * Trouve et envoie au client torrent les fichiers correspondant à la demande.
 * @param override - si fourni, utilise ces saisons/épisodes au lieu du merged de la demande
 *                   (utile pour ne télécharger que ce qui vient d'être ajouté)
 */
export async function autoDownloadRequest(req: SerieRequest, override?: { seasons: number[]; episodes: number[] }): Promise<void> {
    const serieData = await readSerieData(req.serieId)
    if (!serieData) {
        logger.warn('requests', `Auto-dl : aucune donnée torrent pour série ${req.serieId}`)
        return
    }

    const seasons  = override !== undefined ? override.seasons  : mergedSeasons(req)
    const episodes = override !== undefined ? override.episodes : mergedEpisodes(req)

    const toDownload = resolveRequestTorrents(serieData, seasons, episodes)

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

// DELETE /api/requests — admin : supprimer toutes les demandes
router.delete('/requests', requireAdmin, (_req, res) => {
    const all = readRequests()
    for (const r of all) {
        try { deleteRequest(r.id) } catch {}
    }
    logger.info('requests', `Toutes les demandes supprimées (${all.length})`)
    res.json({ deleted: all.length })
})

// DELETE /api/requests/:id/mine — retire l'utilisateur d'une demande en attente
router.delete('/requests/:id/mine', (req, res) => {
    try {
        res.json(withdrawRequest(String(req.params.id), req.user!.id))
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur' })
    }
})

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
