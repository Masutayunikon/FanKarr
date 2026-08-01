import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { DATA_DIR } from '../config.js'
import { readSettings } from '../settings.js'
import { dispatchList } from '../torrent-clients/index.js'
import { readAvailable, readInfohashMap, readSerieData } from '../lib/github-cache.js'
import { buildSerieDetail } from '../lib/serie-detail.js'
import {
    fankaiGet, normalizeSerie, normalizeSeason, normalizeEpisode,
    extractTorrentsFromSerieData, buildResolvedEpisodes, computeSerieDownloadState,
    deduplicateEpisodes,
} from '../lib/serie-helpers.js'

const router = Router()

router.get('/series', requireAuth, async (_req, res) => {
    try {
        const [apiData, availableIds] = await Promise.all([fankaiGet('/series'), readAvailable()])
        const availableSet = new Set<number>(availableIds)
        let organized: Record<string, Record<string, any>> = {}
        try { const p = path.join(DATA_DIR, 'organized.json'); if (fs.existsSync(p)) organized = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}
        const activeTorrents = new Set<string>()
        try { const { category } = readSettings(); const infohashMap = await readInfohashMap(); const active = await dispatchList(category ?? 'fankai', infohashMap); for (const t of active) { if (t.hash && t.state === 'downloading') activeTorrents.add(t.hash.toLowerCase()) } } catch {}
        const seriesRaw = (Array.isArray(apiData) ? apiData : (apiData.series ?? [])).map(normalizeSerie)
        const serieDataMap = new Map<number, any>()
        await Promise.all(seriesRaw.filter((s: any) => availableSet.has(s.id)).map(async (s: any) => { const sd = await readSerieData(s.id); if (sd) serieDataMap.set(s.id, sd) }))
        res.json({ series: seriesRaw.map((serie: any) => {
            const serieData   = serieDataMap.get(serie.id) ?? null
            const hasTorrents = serieData ? extractTorrentsFromSerieData(serieData).length > 0 : false
            return { ...serie, torrent_count: serieData ? extractTorrentsFromSerieData(serieData).length : 0, has_torrents: hasTorrents, download_state: computeSerieDownloadState(serieData, organized, activeTorrents) }
        })})
    } catch (err) {
        logger.error('api', `GET /api/series échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

router.get('/series/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id)
    try {
        res.json(await buildSerieDetail(id))
    } catch (err) {
        logger.error('api', `GET /api/series/${id} échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

export default router
