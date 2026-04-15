import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../auth.js'
import { logger } from '../logger.js'
import { DATA_DIR } from '../config.js'
import { readSettings } from '../settings.js'
import { getGitlabTitle } from '../gitlab-map.js'
import { readSerieData, loadEnrichedSeriesData } from '../lib/github-cache.js'
import { GITLAB_API_NFO, GITLAB_RAW_NFO } from '../lib/nfo.js'

const router = Router()

const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')

function loadOrganizedJson(): Record<string, Record<string, any>> {
    try { if (fs.existsSync(ORGANIZED_PATH)) return JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8')) } catch {}
    return {}
}

function saveOrganizedJson(data: Record<string, Record<string, any>>) {
    fs.writeFileSync(ORGANIZED_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// ── Import manuel ──────────────────────────────────────────────
router.post('/manual-import', requireAuth, async (req, res) => {
    const { serie_id, items } = req.body
    if (!serie_id || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'serie_id et items requis' }); return
    }
    const { mediaPath, organizeMode, nfoSupport } = readSettings()
    const organized = loadOrganizedJson()
    const sd = await readSerieData(Number(serie_id))
    if (!sd) { res.status(404).json({ error: 'Série introuvable dans le catalogue' }); return }
    const rawTitle   = sd.title ?? sd.show_title ?? ''
    const serieTitle = rawTitle.replace(/:/g, ' -').replace(/[<>"/\\|?*]/g, '').replace(/\s+/g, ' ').trim()
    const episodeIndex = new Map<number, { ep: any; season: any }>()
    for (const season of sd.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            episodeIndex.set(ep.id, { ep, season })
        }
    }
    const done: number[] = []
    const errors: { file: string; error: string }[] = []
    for (const item of items) {
        const { file_path, episode_id, hash } = item
        if (!file_path || !episode_id) { errors.push({ file: file_path ?? '?', error: 'Paramètres manquants' }); continue }
        const found = episodeIndex.get(Number(episode_id))
        if (!found) { errors.push({ file: file_path, error: `Épisode ${episode_id} introuvable` }); continue }
        const { ep, season } = found
        const srcFilename   = path.basename(file_path)
        const srcExt        = path.extname(srcFilename)
        const fmtName       = ep.formatted_name?.trim() ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '') + '.mkv' : null
        const resolvedName  = nfoSupport
            ? (ep.nfo_filename ?? ep.original_filename ?? srcFilename)
            : (fmtName ?? ep.nfo_filename ?? ep.original_filename ?? srcFilename)
        const resolvedExt  = path.extname(resolvedName)
        const destFilename = resolvedExt && resolvedExt !== srcExt
            ? resolvedName.slice(0, -resolvedExt.length) + srcExt
            : resolvedName
        const seasonFolder  = season.season_number === 0 ? 'Specials' : `Saison ${season.season_number}`
        const destDir       = path.join(mediaPath, serieTitle, seasonFolder)
        const destPath      = path.join(destDir, destFilename)
        try {
            if (!fs.existsSync(file_path)) throw new Error('Fichier source introuvable')
            fs.mkdirSync(destDir, { recursive: true })
            if (file_path !== destPath) {
                const serieRootPath  = path.join(mediaPath, serieTitle)
                const isInSeriePath  = file_path.startsWith(serieRootPath + path.sep) || file_path.startsWith(serieRootPath + '/')
                if (isInSeriePath && !fs.existsSync(destPath)) {
                    fs.renameSync(file_path, destPath)
                    logger.info('api', `Import manuel (rename) : "${srcFilename}" → "${destFilename}"`)
                } else if (!isInSeriePath && !fs.existsSync(destPath)) {
                    if (organizeMode === 'hardlink') {
                        try { fs.linkSync(file_path, destPath) }
                        catch { await fs.promises.copyFile(file_path, destPath) }
                    } else if (organizeMode === 'move') {
                        try { fs.renameSync(file_path, destPath) }
                        catch { await fs.promises.copyFile(file_path, destPath); await fs.promises.unlink(file_path) }
                    } else {
                        await fs.promises.copyFile(file_path, destPath)
                    }
                    logger.info('api', `Import manuel : "${srcFilename}" → "${destPath}"`)
                }
            } else {
                logger.debug('api', `Import manuel : "${srcFilename}" déjà en place`)
            }
            const torrentHash = String(hash || '').toLowerCase() || 'manual'
            if (!organized[torrentHash]) organized[torrentHash] = {}
            organized[torrentHash][String(episode_id)] = {
                at: new Date().toISOString(), season: season.season_number,
                episode: ep.episode_number, episode_id: ep.id,
                src_filename: srcFilename, dest_filename: destFilename, dest_path: destPath,
            }
            done.push(episode_id)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            errors.push({ file: srcFilename, error: msg })
            logger.error('api', `Import manuel échoué pour "${srcFilename}" : ${msg}`)
        }
    }
    saveOrganizedJson(organized)

    if (nfoSupport && done.length > 0) {
        const gitlabTitle = getGitlabTitle(serieTitle)
        ;(async () => {
            try {
                let files: any[] = [], page = 1
                while (true) {
                    const batch = await fetch(`${GITLAB_API_NFO}/tree?path=${encodeURIComponent('pack/' + gitlabTitle)}&recursive=true&per_page=100&page=${page}&ref=main`, { headers: { 'User-Agent': 'fankarr' } }).then(r => r.ok ? r.json() : [])
                    if (!Array.isArray(batch) || batch.length === 0) break
                    files.push(...batch); if (batch.length < 100) break; page++
                }
                for (const entry of files.filter((f: any) => f.type === 'blob')) {
                    const rel  = entry.path.replace(`pack/${gitlabTitle}/`, '')
                    const dest = path.join(mediaPath, serieTitle, rel)
                    if (fs.existsSync(dest)) continue
                    const raw  = await fetch(`${GITLAB_RAW_NFO}/${encodeURIComponent(gitlabTitle)}/${rel.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'User-Agent': 'fankarr' } })
                    if (!raw.ok) continue
                    fs.mkdirSync(path.dirname(dest), { recursive: true })
                    fs.writeFileSync(dest, Buffer.from(await raw.arrayBuffer()))
                }
                logger.info('api', `NFO téléchargés pour "${gitlabTitle}" (import manuel)`)
            } catch (err) {
                logger.warn('api', `Échec téléchargement NFO pour "${gitlabTitle}" : ${err instanceof Error ? err.message : err}`)
            }
        })()
    }

    res.json({ ok: true, done: done.length, errors })
})

// ── Récap organisés d'une série ────────────────────────────────
router.get('/organized/:serieId', requireAuth, async (req, res) => {
    const serieId = Number(req.params.serieId)
    try {
        const sd = await readSerieData(serieId)
        if (!sd) { res.status(404).json({ error: 'Série introuvable' }); return }
        const organized = loadOrganizedJson()
        const result: Record<string, any> = {}
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                for (const p of ep.paths ?? []) {
                    if (typeof p !== 'object' || !p.infohash) continue
                    const hash    = p.infohash.toLowerCase()
                    const entry   = (organized[hash] ?? {})[String(ep.id)]
                    if (entry) { result[String(ep.id)] = entry; break }
                }
                if (!result[String(ep.id)] && organized['manual']?.[String(ep.id)]) {
                    result[String(ep.id)] = organized['manual'][String(ep.id)]
                }
            }
        }
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Rename épisode ─────────────────────────────────────────────
router.post('/rename-episode', requireAuth, async (req, res) => {
    const { serie_id, episode_id, torrent_hash } = req.body
    if (!serie_id || !episode_id) { res.status(400).json({ error: 'serie_id et episode_id requis' }); return }
    const { nfoSupport } = readSettings()
    const organized = loadOrganizedJson()
    const sd = await readSerieData(Number(serie_id))
    if (!sd) { res.status(404).json({ error: 'Série introuvable' }); return }
    let foundEp: any = null
    for (const season of sd.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            if (ep.id === Number(episode_id)) { foundEp = { ep, season }; break }
        }
        if (foundEp) break
    }
    if (!foundEp) { res.status(404).json({ error: 'Épisode introuvable' }); return }
    const { ep, season } = foundEp
    const hash = torrent_hash?.toLowerCase() ?? 'manual'
    const orgEntry = organized[hash]?.[String(episode_id)] ?? organized['manual']?.[String(episode_id)]
    if (!orgEntry) { res.status(404).json({ error: 'Épisode non importé' }); return }
    const currentName = orgEntry.dest_path ? path.basename(orgEntry.dest_path) : orgEntry.dest_filename
    const srcExt = path.extname(currentName)
    let newName: string
    if (nfoSupport) {
        newName = ep.nfo_filename ? ep.nfo_filename.replace(/\.[^.]+$/, '') + srcExt : currentName
    } else {
        newName = ep.formatted_name?.trim() ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt : currentName
    }
    if (newName === currentName) { res.json({ ok: true, renamed: false, message: 'Nom déjà correct' }); return }
    const oldPath = orgEntry.dest_path
    const newPath = path.join(path.dirname(oldPath), newName)
    try {
        if (!fs.existsSync(oldPath)) throw new Error('Fichier source introuvable sur le disque')
        if (fs.existsSync(newPath)) throw new Error(`Un fichier avec ce nom existe déjà : ${newName}`)
        fs.renameSync(oldPath, newPath)
        const entryHash = organized[hash]?.[String(episode_id)] ? hash : 'manual'
        organized[entryHash][String(episode_id)] = { ...orgEntry, dest_filename: newName, dest_path: newPath, at: new Date().toISOString() }
        saveOrganizedJson(organized)
        logger.info('api', `Rename : "${orgEntry.dest_filename}" → "${newName}"`)
        res.json({ ok: true, renamed: true, old_name: orgEntry.dest_filename, new_name: newName })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        logger.error('api', `Rename échoué pour ep ${episode_id} : ${msg}`)
        res.status(500).json({ error: msg })
    }
})

// ── Désimport série complète ───────────────────────────────────
router.delete('/organized/:serieId', requireAuth, async (req, res) => {
    const serieId    = String(req.params.serieId)
    const deleteFile = req.query.deleteFile === 'true'
    const organized  = loadOrganizedJson()
    const sd = await readSerieData(Number(serieId))
    if (!sd) { res.status(404).json({ error: 'Série introuvable' }); return }
    const episodeIds = new Set<string>()
    for (const season of sd.seasons ?? []) {
        for (const ep of season.episodes ?? []) episodeIds.add(String(ep.id))
    }
    let removed = 0
    const errors: string[] = []
    for (const [hash, episodes] of Object.entries(organized)) {
        for (const epId of Object.keys(episodes)) {
            if (!episodeIds.has(epId)) continue
            const entry = episodes[epId]
            if (deleteFile && entry?.dest_path && fs.existsSync(entry.dest_path)) {
                try { fs.unlinkSync(entry.dest_path) } catch { errors.push(entry.dest_path) }
            }
            delete organized[hash][epId]
            removed++
        }
        if (Object.keys(organized[hash]).length === 0) delete organized[hash]
    }
    saveOrganizedJson(organized)
    logger.info('api', `Désimport série ${serieId} — ${removed} épisode(s) retirés`)
    res.json({ ok: true, removed, errors })
})

// ── Désimport épisode ──────────────────────────────────────────
router.delete('/organized/:serieId/:episodeId', requireAuth, async (req, res) => {
    const episodeId  = String(req.params.episodeId)
    const deleteFile = req.query.deleteFile === 'true'
    const organized  = loadOrganizedJson()
    let foundHash: string | null = null
    let foundEntry: any = null
    for (const [hash, episodes] of Object.entries(organized)) {
        if (episodes[episodeId]) { foundHash = hash; foundEntry = episodes[episodeId]; break }
    }
    if (!foundHash || !foundEntry) { res.status(404).json({ error: 'Épisode non importé' }); return }
    try {
        if (deleteFile && foundEntry.dest_path && fs.existsSync(foundEntry.dest_path)) {
            fs.unlinkSync(foundEntry.dest_path)
            logger.info('api', `Désimport + suppression fichier : "${foundEntry.dest_path}"`)
        }
        delete organized[foundHash][episodeId]
        if (Object.keys(organized[foundHash]).length === 0) delete organized[foundHash]
        saveOrganizedJson(organized)
        logger.info('api', `Désimport ep ${episodeId}`)
        res.json({ ok: true })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        logger.error('api', `Désimport échoué : ${msg}`)
        res.status(500).json({ error: msg })
    }
})

// ── Récap global des imports ───────────────────────────────────
router.get('/organized-summary', requireAuth, async (_req, res) => {
    try {
        const { nfoSupport } = readSettings()
        const organized  = loadOrganizedJson()
        const seriesData = await loadEnrichedSeriesData()
        const result: any[] = []
        for (const sd of seriesData) {
            const rawTitle   = sd.title ?? sd.show_title ?? ''
            const serieTitle = rawTitle.replace(/:/g, ' -').replace(/[<>"/\\|?*]/g, '').replace(/\s+/g, ' ').trim()
            const episodes: any[] = []
            for (const season of sd.seasons ?? []) {
                for (const ep of season.episodes ?? []) {
                    let orgEntry: any = null
                    let orgHash: string | null = null
                    for (const [hash, eps] of Object.entries(organized)) {
                        if (eps[String(ep.id)]) { orgEntry = eps[String(ep.id)]; orgHash = hash; break }
                    }
                    if (!orgEntry) continue
                    const currentName = orgEntry.dest_path ? path.basename(orgEntry.dest_path) : orgEntry.dest_filename
                    const srcExt = path.extname(currentName)
                    let expectedName: string
                    if (nfoSupport) {
                        expectedName = ep.nfo_filename ? ep.nfo_filename.replace(/\.[^.]+$/, '') + srcExt : currentName
                    } else {
                        expectedName = ep.formatted_name?.trim() ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt : currentName
                    }
                    const needsRename = expectedName !== currentName
                    const fileExists  = orgEntry.dest_path ? fs.existsSync(orgEntry.dest_path) : false
                    episodes.push({ episode_id: ep.id, episode_number: ep.episode_number, season_number: season.season_number, title: ep.title, current_name: currentName, expected_name: expectedName, dest_path: orgEntry.dest_path, torrent_hash: orgHash, needs_rename: needsRename, file_exists: fileExists })
                }
            }
            if (episodes.length > 0) {
                result.push({ serie_id: sd.id, serie_title: rawTitle, serie_title_clean: serieTitle, total: episodes.length, needs_rename: episodes.filter(e => e.needs_rename).length, episodes })
            }
        }
        res.json({ series: result, nfo_support: nfoSupport })
    } catch (err) {
        logger.error('api', `organized-summary échoué : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
})

// ── Rename en masse ────────────────────────────────────────────
router.post('/rename-all', requireAuth, async (req, res) => {
    const { serie_id } = req.body
    const { nfoSupport } = readSettings()
    const organized  = loadOrganizedJson()
    const seriesData = await loadEnrichedSeriesData()
    const done: number[] = []
    const errors: { episode_id: number; error: string }[] = []
    for (const sd of seriesData) {
        if (serie_id && sd.id !== Number(serie_id)) continue
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                let orgEntry: any = null
                let orgHash: string | null = null
                for (const [hash, eps] of Object.entries(organized)) {
                    if (eps[String(ep.id)]) { orgEntry = eps[String(ep.id)]; orgHash = hash; break }
                }
                if (!orgEntry || !orgHash) continue
                const currentName = orgEntry.dest_path ? path.basename(orgEntry.dest_path) : orgEntry.dest_filename
                const srcExt = path.extname(currentName)
                let expectedName: string
                if (nfoSupport) {
                    expectedName = ep.nfo_filename ? ep.nfo_filename.replace(/\.[^.]+$/, '') + srcExt : currentName
                } else {
                    expectedName = ep.formatted_name?.trim() ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt : currentName
                }
                if (expectedName === currentName) continue
                const oldPath = orgEntry.dest_path
                const newPath = path.join(path.dirname(oldPath), expectedName)
                try {
                    if (!fs.existsSync(oldPath)) { errors.push({ episode_id: ep.id, error: 'Fichier introuvable' }); continue }
                    if (fs.existsSync(newPath)) { errors.push({ episode_id: ep.id, error: `Fichier existant : ${expectedName}` }); continue }
                    fs.renameSync(oldPath, newPath)
                    organized[orgHash][String(ep.id)] = { ...orgEntry, dest_filename: expectedName, dest_path: newPath, at: new Date().toISOString() }
                    done.push(ep.id)
                    logger.info('api', `Rename masse : "${currentName}" → "${expectedName}"`)
                } catch (err) {
                    errors.push({ episode_id: ep.id, error: err instanceof Error ? err.message : 'Erreur' })
                }
            }
        }
    }
    saveOrganizedJson(organized)
    res.json({ ok: true, done: done.length, errors })
})

export default router
