import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { DATA_DIR } from '../config.js'
import { readSettings } from '../settings.js'
import { dispatchDownload, dispatchList, dispatchRemove } from '../torrent-clients/index.js'
import { readAvailable, readInfohashMap, readSerieData } from '../lib/github-cache.js'
import { extractTorrentsFromSerieData, buildResolvedEpisodes } from '../lib/serie-helpers.js'
import { recentOrganized } from '../lib/notifs.js'

const router = Router()

router.post('/download', requireAuth, async (req, res) => {
    const url = req.body.magnet ?? req.body.torrent_url
    if (!url) { res.status(400).json({ error: 'torrent_url ou magnet requis' }); return }
    logger.info('api', 'Téléchargement demandé')
    const results = await dispatchDownload(url)
    res.status(results.every((r: any) => r.ok) ? 200 : 207).json({ results })
})

router.delete('/torrent/:hash', requireAuth, async (req, res) => {
    const hash        = String(req.params.hash)
    const deleteFiles = req.query.deleteFiles === 'true'
    if (!hash) { res.status(400).json({ error: 'hash requis' }); return }
    try {
        const result = await dispatchRemove(hash, deleteFiles)
        res.json(result)
    } catch (err) {
        logger.error('api', `Suppression torrent échouée : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

router.get('/downloads', requireAuth, async (_req, res) => {
    try {
        const { category } = readSettings()
        const infohashMap = await readInfohashMap()
        const torrents = await dispatchList(category ?? 'fankai', infohashMap)
        let organized: Record<string, Record<string, any>> = {}
        try { const p = path.join(DATA_DIR, 'organized.json'); if (fs.existsSync(p)) organized = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}
        const enriched = await Promise.all(torrents.map(async (t: any) => {
            const orgFiles = organized[t.hash] ?? {}
            let totalFiles = 1
            try {
                const availableIds = await readAvailable()
                for (const id of availableIds) {
                    const sd = await readSerieData(id)
                    if (!sd) continue
                    const match = extractTorrentsFromSerieData(sd).find((st: any) => st.infohash?.toLowerCase() === t.hash?.toLowerCase())
                    if (match) { totalFiles = buildResolvedEpisodes(sd, match.infohash, match.season_number).length || 1; break }
                }
            } catch {}
            const doneFiles = Object.keys(orgFiles).length
            const organizeState: 'none' | 'partial' | 'done' = doneFiles >= totalFiles ? 'done' : doneFiles > 0 ? 'partial' : 'none'
            const notif = recentOrganized.find(n => n.hash === t.hash)
            return { ...t, organizeState, organizeProgress: { done: doneFiles, total: totalFiles }, errorFiles: notif?.errorFiles ?? [] }
        }))
        res.json(enriched)
    } catch (err) {
        logger.error('api', `GET /api/downloads échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

export default router
