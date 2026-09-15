import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { requireAuth, requireAdmin } from '../auth.js'
import { logger } from '../logger.js'
import { readSettings } from '../settings.js'
import { getGitlabTitle } from '../gitlab-map.js'
import {
    resolveEpNaming, computeExpectedName, resolveSerieData, loadCatalog, loadCatalogStatus,
    serieFolderName, seasonFolderName,
} from '../lib/serie-helpers.js'
import { GITLAB_API_NFO, GITLAB_RAW_NFO } from '../lib/nfo.js'
import { dispatchRemove } from '../torrent-clients/index.js'
import { readRequests, deleteRequest } from '../requests.js'
import { readOrganized, writeOrganized, updateOrganized, retargetEntries, type Organized } from '../lib/organized-store.js'

const router = Router()

const serieNotFound = (id: unknown) => `Série ${id} introuvable dans le catalogue Fankai. Synchronisez le catalogue ou consultez les journaux.`
const ORGANIZED_UNREADABLE = 'Fichier de suivi des imports (organized.json) illisible'
const UNEXPECTED_ERROR     = 'Erreur inattendue, consultez les journaux'

// Entrée d'un épisode sous n'importe quel hash (torrent absent des paths du scraper)
function findEntry(organized: Organized, episodeId: number): { hash: string; entry: any } | null {
    for (const [hash, eps] of Object.entries(organized))
        if (eps[String(episodeId)]) return { hash, entry: eps[String(episodeId)] }
    return null
}

// Entrées dont l'épisode n'existe plus dans le catalogue
function findOrphans(organized: Organized, catalog: any[]) {
    const known = new Set<string>()
    for (const sd of catalog)
        for (const season of sd.seasons ?? [])
            for (const ep of season.episodes ?? []) known.add(String(ep.id))
    const orphans: { hash: string; episode_id: number; season: number | null; episode: number | null; dest_path: string | null }[] = []
    for (const [hash, eps] of Object.entries(organized))
        for (const [episodeId, entry] of Object.entries(eps))
            if (!known.has(episodeId))
                orphans.push({ hash, episode_id: Number(episodeId), season: entry?.season ?? null, episode: entry?.episode ?? null, dest_path: entry?.dest_path ?? null })
    return orphans
}

// Dossiers série (enfants directs de la médiathèque) contenant les fichiers suivis d'une série
function serieFolders(sd: any, organized: Organized, mediaPath: string, exclude = new Set<string>()): Map<string, number> {
    const ids = new Set<string>()
    for (const season of sd.seasons ?? [])
        for (const ep of season.episodes ?? []) ids.add(String(ep.id))
    const folders = new Map<string, number>()
    if (!mediaPath) return folders
    for (const eps of Object.values(organized)) {
        for (const [episodeId, entry] of Object.entries(eps)) {
            if (!ids.has(episodeId) || !entry?.dest_path) continue
            const parts = path.relative(mediaPath, entry.dest_path).split(path.sep)
            if (parts.length < 2 || parts[0] === '..' || path.isAbsolute(parts[0])) continue
            const folder = path.join(mediaPath, parts[0])
            if (exclude.has(folder)) continue
            folders.set(folder, (folders.get(folder) ?? 0) + 1)
        }
    }
    return folders
}

function otherSerieFolders(catalog: any[], serieId: number, mediaPath: string): Set<string> {
    return new Set(catalog.filter(sd => sd.id !== serieId).map(sd => path.join(mediaPath, serieFolderName(sd.title ?? sd.show_title ?? ''))))
}

function listFiles(dir: string): string[] {
    const files: string[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) files.push(...listFiles(full))
        else files.push(full)
    }
    return files
}

function removeEmptyDirs(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }))
        if (entry.isDirectory()) removeEmptyDirs(path.join(dir, entry.name))
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir)
}

// ── Import manuel ──────────────────────────────────────────────
router.post('/manual-import', requireAuth, async (req, res) => {
    const { serie_id, items } = req.body
    if (!serie_id || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Série ou fichiers à importer manquants' }); return
    }
    const { mediaPath, organizeMode, nfoSupport, englishDirectory } = readSettings()
    let organized: Organized
    try { organized = readOrganized() }
    catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return }
    // Copies asynchrones : modifications réappliquées sur le fichier relu à la fin
    const ops: ((data: Organized) => void)[] = []
    const apply = (op: (data: Organized) => void) => { op(organized); ops.push(op) }
    const sd = await resolveSerieData(Number(serie_id), 'Import manuel')
    if (!sd) { res.status(404).json({ error: serieNotFound(serie_id) }); return }
    const serieTitle = serieFolderName(sd.title ?? sd.show_title ?? '')
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
        const { formatted_name: rawFmt, nfo_filename: rawNfo, original_filename: rawOrig } = resolveEpNaming(ep, hash)
        const fmtName       = rawFmt?.trim() ? rawFmt.replace(/[<>:"/\\|?*]/g, '') + '.mkv' : null
        const resolvedName  = nfoSupport
            ? (rawNfo ?? rawOrig ?? srcFilename)
            : (fmtName ?? rawNfo ?? rawOrig ?? srcFilename)
        const resolvedExt  = path.extname(resolvedName)
        const destFilename = resolvedExt && resolvedExt !== srcExt
            ? resolvedName.slice(0, -resolvedExt.length) + srcExt
            : resolvedName
        const destDir       = path.join(mediaPath, serieTitle, seasonFolderName(season.season_number, englishDirectory))
        const destPath      = path.join(destDir, destFilename)
        try {
            if (!fs.existsSync(file_path)) throw new Error('Fichier source introuvable')

            // Réassignation : retirer les entrées qui pointent ce fichier sous un autre épisode
            for (const [h, eps] of Object.entries(organized)) {
                for (const [epId, entry] of Object.entries(eps)) {
                    if (entry?.dest_path === file_path && Number(epId) !== Number(episode_id))
                        logger.info('api', `Import manuel : entrée obsolète de l'épisode ${epId} retirée (fichier réassigné)`)
                }
            }
            apply(data => {
                for (const eps of Object.values(data))
                    for (const [epId, entry] of Object.entries(eps))
                        if (entry?.dest_path === file_path && Number(epId) !== Number(episode_id)) delete eps[epId]
            })

            fs.mkdirSync(destDir, { recursive: true })
            if (file_path !== destPath) {
                const serieRootPath  = path.join(mediaPath, serieTitle)
                const isInSeriePath  = file_path.startsWith(serieRootPath + path.sep) || file_path.startsWith(serieRootPath + '/')
                if (isInSeriePath && fs.existsSync(destPath) && destPath !== file_path) {
                    fs.unlinkSync(destPath)
                    logger.info('api', `Import manuel (réassignation) : suppression de l'ancien fichier « ${destFilename} »`)
                    for (const eps of Object.values(organized)) {
                        for (const [epId, entry] of Object.entries(eps)) {
                            if (entry?.dest_path === destPath)
                                logger.info('api', `Import manuel : entrée obsolète de l'épisode ${epId} retirée (ancien fichier supprimé)`)
                        }
                    }
                    apply(data => {
                        for (const eps of Object.values(data))
                            for (const [epId, entry] of Object.entries(eps))
                                if (entry?.dest_path === destPath) delete eps[epId]
                    })
                }
                if (isInSeriePath && !fs.existsSync(destPath)) {
                    fs.renameSync(file_path, destPath)
                    apply(data => { retargetEntries(data, new Map([[file_path, destPath]])) })
                    logger.info('api', `Import manuel : « ${srcFilename} » renommé en « ${destFilename} »`)
                } else if (!isInSeriePath && !fs.existsSync(destPath)) {
                    if (organizeMode === 'hardlink') {
                        try { fs.linkSync(file_path, destPath) }
                        catch { await fs.promises.copyFile(file_path, destPath) }
                    } else if (organizeMode === 'move') {
                        try { fs.renameSync(file_path, destPath) }
                        catch { await fs.promises.copyFile(file_path, destPath); await fs.promises.unlink(file_path) }
                        apply(data => { retargetEntries(data, new Map([[file_path, destPath]])) })
                    } else {
                        await fs.promises.copyFile(file_path, destPath)
                    }
                    logger.info('api', `Import manuel : « ${srcFilename} » importé vers « ${destPath} »`)
                }
            } else {
                logger.debug('api', `Import manuel : « ${srcFilename} » déjà en place`)
            }
            const torrentHash = String(hash || '').toLowerCase() || 'manual'
            const entry = {
                at: new Date().toISOString(), season: season.season_number,
                episode: ep.episode_number, episode_id: ep.id,
                src_filename: srcFilename, dest_filename: destFilename, dest_path: destPath,
            }
            apply(data => { (data[torrentHash] ??= {})[String(episode_id)] = entry })
            done.push(episode_id)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            errors.push({ file: srcFilename, error: msg })
            logger.error('api', `Échec de l'import manuel de « ${srcFilename} » : ${msg}`)
        }
    }
    if (ops.length > 0) {
        try { updateOrganized(data => { for (const op of ops) op(data) }) }
        catch (err) {
            logger.error('api', `Import manuel : échec de l'enregistrement (${err instanceof Error ? err.message : err})`)
            res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return
        }
    }

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
                logger.info('api', `NFO téléchargés pour « ${gitlabTitle} » (import manuel)`)
            } catch (err) {
                logger.warn('api', `Échec du téléchargement des NFO de « ${gitlabTitle} » :${err instanceof Error ? err.message : err}`)
            }
        })()
    }

    res.json({ ok: true, done: done.length, errors })
})

// ── Épisodes importés d'une série ──────────────────────────────
router.get('/organized/:serieId', requireAuth, async (req, res) => {
    const serieId = Number(req.params.serieId)
    try {
        const sd = await resolveSerieData(serieId)
        if (!sd) { res.status(404).json({ error: serieNotFound(serieId) }); return }
        const organized    = readOrganized()
        const { nfoSupport } = readSettings()
        const result: Record<string, any> = {}
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                let entry: any    = null
                let entryHash     = 'manual'
                for (const p of ep.paths ?? []) {
                    if (typeof p !== 'object' || !p.infohash) continue
                    const h = p.infohash.toLowerCase()
                    const e = (organized[h] ?? {})[String(ep.id)]
                    if (e) { entry = e; entryHash = h; break }
                }
                if (!entry && organized['manual']?.[String(ep.id)]) {
                    entry = organized['manual'][String(ep.id)]
                }
                if (!entry) {
                    const found = findEntry(organized, ep.id)
                    if (found) { entry = found.entry; entryHash = found.hash }
                }
                if (!entry) continue

                const { needsRename } = computeExpectedName(ep, entry, entryHash, nfoSupport)
                result[String(ep.id)] = { ...entry, hash: entryHash, needs_rename: needsRename }
            }
        }
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : UNEXPECTED_ERROR })
    }
})

// ── Renommage d'un épisode ─────────────────────────────────────
router.post('/rename-episode', requireAuth, async (req, res) => {
    const { serie_id, episode_id, torrent_hash } = req.body
    if (!serie_id || !episode_id) { res.status(400).json({ error: 'Série ou épisode manquant' }); return }
    const { nfoSupport } = readSettings()
    const sd = await resolveSerieData(Number(serie_id), 'Renommage')
    if (!sd) { res.status(404).json({ error: serieNotFound(serie_id) }); return }
    let organized: Organized
    try { organized = readOrganized() }
    catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return }
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
    let orgEntry = organized[hash]?.[String(episode_id)] ?? organized['manual']?.[String(episode_id)]
    let entryHash = organized[hash]?.[String(episode_id)] ? hash : 'manual'
    if (!orgEntry) {
        const found = findEntry(organized, Number(episode_id))
        if (found) { orgEntry = found.entry; entryHash = found.hash }
    }
    if (!orgEntry) { res.status(404).json({ error: 'Épisode non importé' }); return }
    const { currentName, expectedName: newName, needsRename } = computeExpectedName(ep, orgEntry, entryHash, nfoSupport)
    if (!needsRename) { res.json({ ok: true, renamed: false, message: 'Nom déjà correct' }); return }
    const oldPath = orgEntry.dest_path
    const newPath = path.join(path.dirname(oldPath), newName)
    try {
        if (!fs.existsSync(oldPath)) throw new Error('Fichier introuvable sur le disque')
        if (fs.existsSync(newPath)) throw new Error(`Un fichier nommé « ${newName} » existe déjà`)
        fs.renameSync(oldPath, newPath)
        organized[entryHash][String(episode_id)] = { ...orgEntry, dest_filename: newName, dest_path: newPath, at: new Date().toISOString() }
        retargetEntries(organized, new Map([[oldPath, newPath]]))
        writeOrganized(organized)
        logger.info('api', `Renommage : « ${orgEntry.dest_filename} » en « ${newName} »`)
        res.json({ ok: true, renamed: true, old_name: orgEntry.dest_filename, new_name: newName })
    } catch (err) {
        const msg = err instanceof Error ? err.message : UNEXPECTED_ERROR
        logger.error('api', `Échec du renommage de l'épisode ${episode_id} : ${msg}`)
        res.status(500).json({ error: msg })
    }
})

// ── Retrait d'une série ────────────────────────────────────────
router.delete('/organized/:serieId', requireAuth, async (req, res) => {
    const serieId    = String(req.params.serieId)
    const deleteFile = req.query.deleteFile === 'true'
    const sd = await resolveSerieData(Number(serieId), 'Retrait de la série')
    if (!sd) { res.status(404).json({ error: serieNotFound(serieId) }); return }
    let organized: Organized
    try { organized = readOrganized() }
    catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return }
    const episodeIds = new Set<string>()
    for (const season of sd.seasons ?? []) {
        for (const ep of season.episodes ?? []) episodeIds.add(String(ep.id))
    }
    let removed = 0
    const errors: string[] = []
    const emptyHashes: string[] = []
    let serieFolder: string | null = null
    for (const [hash, episodes] of Object.entries(organized)) {
        for (const epId of Object.keys(episodes)) {
            if (!episodeIds.has(epId)) continue
            const entry = episodes[epId]
            if (!serieFolder && entry) {
                const dir = entry.dest_dir ?? path.dirname(entry.dest_path)
                serieFolder = path.dirname(dir)
            }
            if (deleteFile && entry?.dest_path && fs.existsSync(entry.dest_path)) {
                try { fs.unlinkSync(entry.dest_path) } catch { errors.push(entry.dest_path) }
            }
            delete organized[hash][epId]
            removed++
        }
        if (Object.keys(organized[hash]).length === 0) { delete organized[hash]; emptyHashes.push(hash) }
    }
    writeOrganized(organized)
    if (deleteFile) {
        for (const hash of emptyHashes) {
            if (hash === 'manual') continue
            dispatchRemove(hash, false).catch(err => logger.warn('api', `Impossible de retirer le torrent ${hash.slice(0, 8)}… du client : ${err instanceof Error ? err.message : err}`))
        }
        if (serieFolder && fs.existsSync(serieFolder)) {
            try {
                fs.rmSync(serieFolder, { recursive: true, force: true })
                logger.info('api', `Dossier de la série supprimé : ${serieFolder}`)
            } catch (err) {
                logger.warn('api', `Impossible de supprimer le dossier de la série « ${serieFolder} » :${err instanceof Error ? err.message : err}`)
            }
        }
    }
    const completedRequests = readRequests().filter(r => r.serieId === Number(serieId) && r.status === 'completed')
    for (const r of completedRequests) {
        try { deleteRequest(r.id) } catch {}
    }
    if (completedRequests.length > 0)
        logger.info('api', `Retrait de la série ${serieId} : ${completedRequests.length} demande(s) « disponible » supprimée(s)`)

    logger.info('api', `Retrait de la série ${serieId} : ${removed} épisode(s) retiré(s)${deleteFile && emptyHashes.length ? `, ${emptyHashes.length} torrent(s) retiré(s) du client` : ''}`)
    res.json({ ok: true, removed, errors })
})

// ── Retrait d'une saison ───────────────────────────────────────
router.delete('/organized/:serieId/seasons/:seasonId', requireAuth, async (req, res) => {
    const serieId    = String(req.params.serieId)
    const seasonId   = Number(req.params.seasonId)
    const deleteFile = req.query.deleteFile === 'true'
    const sd = await resolveSerieData(Number(serieId), 'Retrait de la saison')
    if (!sd) { res.status(404).json({ error: serieNotFound(serieId) }); return }
    let organized: Organized
    try { organized = readOrganized() }
    catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return }
    const season = sd.seasons?.find((s: any) => s.id === seasonId)
    if (!season) { res.status(404).json({ error: 'Saison introuvable' }); return }
    const episodeIds = new Set<string>(season.episodes?.map((e: any) => String(e.id)) ?? [])
    let removed = 0
    const errors: string[] = []
    const emptyHashes: string[] = []
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
        if (Object.keys(organized[hash]).length === 0) { delete organized[hash]; emptyHashes.push(hash) }
    }
    writeOrganized(organized)
    if (deleteFile) {
        for (const hash of emptyHashes) {
            if (hash === 'manual') continue
            dispatchRemove(hash, false).catch(err => logger.warn('api', `Impossible de retirer le torrent ${hash.slice(0, 8)}… du client : ${err instanceof Error ? err.message : err}`))
        }
    }
    logger.info('api', `Retrait de la saison ${seasonId} (série ${serieId}) : ${removed} épisode(s) retiré(s)${deleteFile && emptyHashes.length ? `, ${emptyHashes.length} torrent(s) retiré(s) du client` : ''}`)
    res.json({ ok: true, removed, errors })
})

// ── Retrait d'un épisode ───────────────────────────────────────
router.delete('/organized/:serieId/:episodeId', requireAuth, async (req, res) => {
    const episodeId  = String(req.params.episodeId)
    const deleteFile = req.query.deleteFile === 'true'
    let organized: Organized
    try { organized = readOrganized() }
    catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return }
    const found: { hash: string; entry: any }[] = []
    for (const [hash, episodes] of Object.entries(organized)) {
        if (episodes[episodeId]) found.push({ hash, entry: episodes[episodeId] })
    }
    if (found.length === 0) { res.status(404).json({ error: 'Épisode non importé' }); return }
    try {
        const deletedPaths = new Set<string>()
        if (deleteFile) {
            for (const { entry } of found) {
                const p = entry?.dest_path
                if (!p || deletedPaths.has(p) || !fs.existsSync(p)) continue
                fs.unlinkSync(p)
                deletedPaths.add(p)
                logger.info('api', `Retrait et suppression du fichier « ${p} »`)
            }
        }
        const emptyHashes: string[] = []
        for (const { hash } of found) {
            delete organized[hash][episodeId]
            if (Object.keys(organized[hash]).length === 0) { delete organized[hash]; emptyHashes.push(hash) }
        }
        writeOrganized(organized)
        if (deleteFile) {
            for (const hash of emptyHashes) {
                if (hash === 'manual') continue
                dispatchRemove(hash, false).catch(err => logger.warn('api', `Impossible de retirer le torrent ${hash.slice(0, 8)}… du client : ${err instanceof Error ? err.message : err}`))
            }
        }
        const removedTorrents = deleteFile ? emptyHashes.filter(h => h !== 'manual') : []
        logger.info('api', `Retrait de l'épisode ${episodeId}${removedTorrents.length ? `, ${removedTorrents.length} torrent(s) retiré(s) du client` : ''}`)
        res.json({ ok: true })
    } catch (err) {
        const msg = err instanceof Error ? err.message : UNEXPECTED_ERROR
        logger.error('api', `Échec du retrait de l'épisode ${episodeId} : ${msg}`)
        res.status(500).json({ error: msg })
    }
})

// ── Récapitulatif des imports ──────────────────────────────────
router.get('/organized-summary', requireAuth, async (_req, res) => {
    try {
        const { nfoSupport } = readSettings()
        const { series: seriesData, complete } = await loadCatalogStatus()
        const organized  = readOrganized()
        const result: any[] = []
        for (const sd of seriesData) {
            const rawTitle   = sd.title ?? sd.show_title ?? ''
            const serieTitle = serieFolderName(rawTitle)
            const episodes: any[] = []
            for (const season of sd.seasons ?? []) {
                for (const ep of season.episodes ?? []) {
                    let orgEntry: any = null
                    let orgHash: string | null = null
                    // Chercher d'abord via ep.paths : le hash détermine le formatted_name
                    for (const p of ep.paths ?? []) {
                        if (typeof p !== 'object' || !p.infohash) continue
                        const h = p.infohash.toLowerCase()
                        const e = (organized[h] ?? {})[String(ep.id)]
                        if (e) { orgEntry = e; orgHash = h; break }
                    }
                    if (!orgEntry && organized['manual']?.[String(ep.id)]) {
                        orgEntry = organized['manual'][String(ep.id)]; orgHash = 'manual'
                    }
                    if (!orgEntry) {
                        const found = findEntry(organized, ep.id)
                        if (found) { orgEntry = found.entry; orgHash = found.hash }
                    }
                    if (!orgEntry) continue
                    const { currentName, expectedName, needsRename } = computeExpectedName(ep, orgEntry, orgHash, nfoSupport)
                    const fileExists = orgEntry.dest_path ? fs.existsSync(orgEntry.dest_path) : false
                    episodes.push({ episode_id: ep.id, episode_number: ep.episode_number, season_number: season.season_number, title: ep.title, current_name: currentName, expected_name: expectedName, dest_path: orgEntry.dest_path, torrent_hash: orgHash, needs_rename: needsRename, file_exists: fileExists })
                }
            }
            if (episodes.length > 0) {
                result.push({ serie_id: sd.id, serie_title: rawTitle, serie_title_clean: serieTitle, total: episodes.length, needs_rename: episodes.filter(e => e.needs_rename).length, episodes })
            }
        }
        const orphans = complete
            ? findOrphans(organized, seriesData).map(o => ({ ...o, file_exists: !!o.dest_path && fs.existsSync(o.dest_path) }))
            : []
        res.json({ series: result, nfo_support: nfoSupport, orphans, orphans_checked: complete })
    } catch (err) {
        logger.error('api', `Échec du récapitulatif des imports : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : UNEXPECTED_ERROR })
    }
})

// ── Retrait des épisodes disparus du catalogue ─────────────────
router.delete('/organized-summary/orphans', requireAdmin, async (req, res) => {
    const only = Array.isArray(req.body?.episode_ids) ? new Set(req.body.episode_ids.map(String)) : null
    const { series, complete } = await loadCatalogStatus()
    if (!complete) { res.status(503).json({ error: 'Catalogue incomplet (scraper GitHub ou API Fankai injoignable), réessayez plus tard' }); return }
    let removed = 0
    try {
        updateOrganized(data => {
            for (const o of findOrphans(data, series)) {
                if (only && !only.has(String(o.episode_id))) continue
                delete data[o.hash][String(o.episode_id)]
                removed++
            }
            return removed > 0
        })
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return
    }
    logger.info('api', `Épisodes disparus du catalogue retirés du suivi : ${removed}`)
    res.json({ ok: true, removed })
})

// ── Dossier de série ───────────────────────────────────────────
router.get('/organized-folders', requireAdmin, async (_req, res) => {
    const { mediaPath } = readSettings()
    if (!mediaPath) { res.json([]); return }
    let organized: Organized
    try { organized = readOrganized() }
    catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return }
    try {
        const result: { serie_id: number; serie_title: string; expected: string; current: string[] }[] = []
        const catalog = await loadCatalog()
        for (const sd of catalog) {
            const title    = sd.title ?? sd.show_title ?? ''
            const expected = path.join(mediaPath, serieFolderName(title))
            const stale    = [...serieFolders(sd, organized, mediaPath, otherSerieFolders(catalog, sd.id, mediaPath)).keys()].filter(f => f !== expected && fs.existsSync(f))
            if (stale.length > 0) result.push({ serie_id: sd.id, serie_title: title, expected, current: stale })
        }
        res.json(result)
    } catch (err) {
        logger.error('api', `Échec de la vérification des dossiers de séries : ${err instanceof Error ? err.message : err}`)
        res.status(500).json({ error: err instanceof Error ? err.message : UNEXPECTED_ERROR })
    }
})

router.get('/organized/:serieId/folder', requireAuth, async (req, res) => {
    const serieId = Number(req.params.serieId)
    const sd = await resolveSerieData(serieId)
    if (!sd) { res.status(404).json({ error: serieNotFound(serieId) }); return }
    const { mediaPath } = readSettings()
    let organized: Organized
    try { organized = readOrganized() }
    catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return }
    const expected = path.join(mediaPath, serieFolderName(sd.title ?? sd.show_title ?? ''))
    const others   = otherSerieFolders(await loadCatalog().catch(() => []), serieId, mediaPath)
    const current  = [...serieFolders(sd, organized, mediaPath, others)].map(([folder, entries]) => ({ path: folder, entries, exists: fs.existsSync(folder) }))
    res.json({ expected, current, needs_rename: current.some(f => f.exists && f.path !== expected) })
})

router.post('/organized/:serieId/folder', requireAdmin, async (req, res) => {
    const serieId = Number(req.params.serieId)
    const sd = await resolveSerieData(serieId, 'Renommage du dossier')
    if (!sd) { res.status(404).json({ error: serieNotFound(serieId) }); return }
    const { mediaPath } = readSettings()
    if (!mediaPath) { res.status(400).json({ error: 'Chemin de la médiathèque non configuré' }); return }
    let organized: Organized
    try { organized = readOrganized() }
    catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return }
    let catalog: any[]
    try { catalog = await loadCatalog() }
    catch (err) { res.status(503).json({ error: `Catalogue indisponible : ${err instanceof Error ? err.message : err}` }); return }
    const expected = path.join(mediaPath, serieFolderName(sd.title ?? sd.show_title ?? ''))
    const sources  = [...serieFolders(sd, organized, mediaPath, otherSerieFolders(catalog, serieId, mediaPath)).keys()].filter(f => f !== expected && fs.existsSync(f))
    if (sources.length === 0) { res.json({ ok: true, moved: 0, updated: 0 }); return }

    // Tout le contenu (vidéos, NFO, images…) est fusionné dans le dossier attendu, sans jamais écraser
    const moves = new Map<string, string>()
    for (const src of sources)
        for (const file of listFiles(src)) moves.set(file, path.join(expected, path.relative(src, file)))
    const targets   = [...moves.values()]
    const conflicts = targets.filter((to, i) => fs.existsSync(to) || targets.indexOf(to) !== i)
    if (conflicts.length > 0) {
        res.status(409).json({ error: `${conflicts.length} fichier(s) existe(nt) déjà dans « ${path.basename(expected)} »`, conflicts: conflicts.slice(0, 10) }); return
    }

    const done = new Map<string, string>()
    let failure: string | null = null
    for (const [from, to] of moves) {
        try {
            fs.mkdirSync(path.dirname(to), { recursive: true })
            fs.renameSync(from, to)
            done.set(from, to)
        } catch (err) {
            failure = `${path.basename(from)} : ${err instanceof Error ? err.message : err}`
            break
        }
    }
    for (const src of sources) {
        try { removeEmptyDirs(src) } catch {}
    }
    let updated = 0
    try { updateOrganized(data => { updated = retargetEntries(data, done); return updated > 0 }) }
    catch (err) {
        logger.error('api', `Renommage du dossier de la série ${serieId} : fichiers déplacés mais suivi non mis à jour (${err instanceof Error ? err.message : err})`)
        res.status(500).json({ error: 'Fichiers déplacés mais suivi non mis à jour, lancez une analyse de la médiathèque' }); return
    }
    const label = `« ${sources.map(s => path.basename(s)).join(' », « ')} » en « ${path.basename(expected)} »`
    if (failure) {
        logger.error('api', `Renommage du dossier ${label} interrompu après ${done.size} fichier(s) : ${failure}`)
        res.status(500).json({ error: `Déplacement interrompu après ${done.size} fichier(s) : ${failure}`, moved: done.size, updated }); return
    }
    logger.info('api', `Dossier de série renommé : ${label} (${done.size} fichier(s), ${updated} entrée(s))`)
    res.json({ ok: true, moved: done.size, updated })
})

// ── Renommage groupé ───────────────────────────────────────────
router.post('/rename-all', requireAdmin, async (req, res) => {
    const { serie_id, serie_ids } = req.body
    const onlyIds = Array.isArray(serie_ids) ? new Set(serie_ids.map(Number)) : serie_id ? new Set([Number(serie_id)]) : null
    const { nfoSupport } = readSettings()
    const seriesData = await loadCatalog()
    let organized: Organized
    try { organized = readOrganized() }
    catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : ORGANIZED_UNREADABLE }); return }
    const done: number[] = []
    const errors: { episode_id: number; error: string }[] = []
    for (const sd of seriesData) {
        if (onlyIds && !onlyIds.has(sd.id)) continue
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                let orgEntry: any = null
                let orgHash: string | null = null
                for (const [hash, eps] of Object.entries(organized)) {
                    if (eps[String(ep.id)]) { orgEntry = eps[String(ep.id)]; orgHash = hash; break }
                }
                if (!orgEntry || !orgHash) continue
                const { currentName, expectedName, needsRename } = computeExpectedName(ep, orgEntry, orgHash, nfoSupport)
                if (!needsRename) continue
                const oldPath = orgEntry.dest_path
                const newPath = path.join(path.dirname(oldPath), expectedName)
                try {
                    if (!fs.existsSync(oldPath)) {
                        const msg = `Fichier introuvable : « ${oldPath} »`
                        logger.error('api', `Renommage groupé, épisode ${ep.id} : ${msg}`)
                        errors.push({ episode_id: ep.id, error: msg }); continue
                    }
                    if (fs.existsSync(newPath)) {
                        const msg = `Un fichier nommé « ${expectedName} » existe déjà`
                        logger.warn('api', `Renommage groupé, épisode ${ep.id} : ${msg}`)
                        errors.push({ episode_id: ep.id, error: msg }); continue
                    }
                    fs.renameSync(oldPath, newPath)
                    organized[orgHash][String(ep.id)] = { ...orgEntry, dest_filename: expectedName, dest_path: newPath, at: new Date().toISOString() }
                    retargetEntries(organized, new Map([[oldPath, newPath]]))
                    done.push(ep.id)
                    logger.info('api', `Renommage : « ${currentName} » en « ${expectedName} »`)
                } catch (err) {
                    const msg = err instanceof Error ? err.message : UNEXPECTED_ERROR
                    logger.error('api', `Échec du renommage de l'épisode ${ep.id} : ${msg}`)
                    errors.push({ episode_id: ep.id, error: msg })
                }
            }
        }
    }
    writeOrganized(organized)
    res.json({ ok: true, done: done.length, errors })
})

// ── Purge des NFO et images ───────────────────────────────────
router.post('/purge-nfo', requireAuth, (req, res) => {
    const { mediaPath } = readSettings()
    if (!mediaPath || !fs.existsSync(mediaPath)) {
        res.status(400).json({ error: 'Chemin de la médiathèque non configuré ou introuvable' }); return
    }

    const NFO_EXTS = new Set(['.nfo', '.png', '.jpg', '.jpeg', '.tbn', '.xml'])
    let deleted = 0
    const errors: string[] = []

    function walk(dir: string) {
        let entries: fs.Dirent[]
        try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
        for (const entry of entries) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                walk(full)
            } else if (entry.isFile() && NFO_EXTS.has(path.extname(entry.name).toLowerCase())) {
                try {
                    fs.unlinkSync(full)
                    deleted++
                    logger.debug('api', `Purge NFO : « ${full} » supprimé`)
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
                    logger.error('api', `Purge NFO : impossible de supprimer « ${full} » : ${msg}`)
                    errors.push(full)
                }
            }
        }
    }

    walk(mediaPath)
    logger.info('api', `Purge NFO : ${deleted} fichier(s) supprimé(s)${errors.length > 0 ? `, ${errors.length} erreur(s)` : ''}`)
    res.json({ ok: true, deleted, errors })
})

export default router
