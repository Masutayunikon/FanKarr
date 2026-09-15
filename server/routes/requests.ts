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

router.get('/requests/pending-count', (req, res) => {
    const count = req.user!.role === 'admin'
        ? getPendingCount()
        : getRequestsForUser(req.user!.id).filter(r => r.status === 'pending').length
    res.json({ count })
})

router.post('/requests', (req, res) => {
    const { serieId, serieName, seasons, episodes, torrentOverride } = req.body
    if (!serieId || !serieName) {
        res.status(400).json({ error: 'Série manquante dans la demande' }); return
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
        const userId = req.user!.id
        const allowed = requestAutoDownloadUsers === 'all'
            || (Array.isArray(requestAutoDownloadUsers) && requestAutoDownloadUsers.includes(userId))

        if (allowed) {
            const isNew = request.status === 'pending'
            if (isNew) request = approveRequest(request.id)

            if (torrentOverride?.torrent_url || torrentOverride?.magnet) {
                const url = torrentOverride.torrent_url ?? torrentOverride.magnet
                dispatchDownload(url, {
                    infohash  : torrentOverride.infohash   ?? null,
                    magnet    : torrentOverride.magnet     ?? null,
                    file_index: torrentOverride.file_index ?? null,
                    file_path : torrentOverride.file_path  ?? null,
                }).catch(err =>
                    logger.warn('requests', `Échec du téléchargement automatique du torrent choisi pour « ${request.serieName} » : ${err instanceof Error ? err.message : err}`)
                )
            } else {
                const dlOverride = isNew ? undefined : { seasons: submittedSeasons, episodes: submittedEpisodes }
                autoDownloadRequest(request, dlOverride).catch(err =>
                    logger.warn('requests', `Échec du téléchargement automatique de « ${request.serieName} » : ${err instanceof Error ? err.message : err}`)
                )
            }
        }

        res.json(request)
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

router.patch('/requests/:id', requireAdmin, async (req, res) => {
    const { action, rejectionMessage } = req.body
    try {
        let request: SerieRequest
        const id = String(req.params.id)
        if (action === 'approve') {
            request = approveRequest(id)
            autoDownloadRequest(request).catch(err =>
                logger.warn('requests', `Échec du téléchargement automatique de « ${request.serieName} » : ${err instanceof Error ? err.message : err}`)
            )
        } else if (action === 'reject')   request = rejectRequest(id, rejectionMessage)
        else if (action === 'complete')   request = completeRequest(id)
        else { res.status(400).json({ error: 'Action inconnue (approve, reject ou complete)' }); return }
        res.json(request)
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

/** Envoie les torrents de la demande ; override limite aux saisons et épisodes qui viennent d'être ajoutés. */
export async function autoDownloadRequest(req: SerieRequest, override?: { seasons: number[]; episodes: number[] }): Promise<void> {
    const serieData = await readSerieData(req.serieId)
    if (!serieData) {
        logger.warn('requests', `Téléchargement automatique : aucune donnée de torrent pour la série ${req.serieId}`)
        return
    }

    const seasons  = override !== undefined ? override.seasons  : mergedSeasons(req)
    const episodes = override !== undefined ? override.episodes : mergedEpisodes(req)

    const toDownload = resolveRequestTorrents(serieData, seasons, episodes)

    if (toDownload.length === 0) {
        logger.warn('requests', `Téléchargement automatique : aucun torrent trouvé pour « ${req.serieName} »`)
        return
    }

    let sent = 0
    for (const t of toDownload) {
        const url = t.url ?? t.magnet
        if (!url) continue
        try {
            const results = await dispatchDownload(url, { infohash: t.infohash ?? undefined, magnet: t.magnet ?? undefined, file_index: t.file_index ?? null, file_path: t.file_path ?? null })
            if (results.some(r => r.ok)) sent++
        } catch (err) {
            logger.warn('requests', `Téléchargement automatique : erreur à l'envoi d'un torrent : ${err instanceof Error ? err.message : err}`)
        }
    }
    logger.info('requests', `Téléchargement automatique de « ${req.serieName} » : ${sent}/${toDownload.length} torrent(s) envoyé(s)`)
}

router.delete('/requests', requireAdmin, (_req, res) => {
    const all = readRequests()
    for (const r of all) {
        try { deleteRequest(r.id) } catch {}
    }
    logger.info('requests', `Toutes les demandes supprimées (${all.length})`)
    res.json({ deleted: all.length })
})

router.delete('/requests/:id/mine', (req, res) => {
    try {
        res.json(withdrawRequest(String(req.params.id), req.user!.id))
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

router.delete('/requests/:id', requireAdmin, (req, res) => {
    try {
        deleteRequest(String(req.params.id))
        res.json({ success: true })
    } catch (err) {
        res.status(404).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
})

export default router
