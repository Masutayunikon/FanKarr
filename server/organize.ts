
import fs   from 'fs'
import path from 'path'
import { Worker } from 'worker_threads'
import { logger } from './logger.js'
import { readSettings } from './settings.js'
import { readOrganized, writeOrganized, updateOrganized, retargetEntries, type Organized } from './lib/organized-store.js'

export let workerRunning = false
const _prevStates = new Map<string, string>()

function resolveWorkerPath(): string {
    if (typeof (globalThis as any).Bun !== 'undefined') {
        return path.join(path.dirname((process as any).execPath), 'organize-worker.js')
    }
    return path.join(path.dirname(new URL(import.meta.url).pathname), 'organize-worker.js')
}

export interface OrganizeResult {
    serieId?: number | null
    total   : number
    skipped : number
    done    : number
    errors  : { file: string; error: string }[]
}

type WorkerResult = { hash: string; name: string; serieId?: number | null; total: number; done: number; skipped: number; errors: { file: string; error: string }[] }

// ── File d'attente des workers ────────────────────────────────
let _queue: Promise<unknown> = Promise.resolve()
let _queued = 0
const _pendingManual = new Map<string, Promise<OrganizeResult>>()

function enqueue<T>(job: () => Promise<T>): Promise<T> {
    _queued++
    const run = _queue.then(job).finally(() => { _queued-- })
    _queue = run.catch(() => {})
    return run
}

function runWorker(torrents: any[], seriesData: any[], onResult: (r: WorkerResult) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        workerRunning = true
        const worker  = new Worker(resolveWorkerPath())
        let settled   = false
        const finish  = (err?: Error) => {
            if (settled) return
            settled = true
            workerRunning = false
            worker.terminate()
            err ? reject(err) : resolve()
        }

        worker.on('message', (msg: any) => {
            if (msg.type === 'log') {
                logger[msg.level as 'info' | 'warn' | 'error' | 'debug']?.('organize-worker', msg.msg)
            } else if (msg.type === 'mark') {
                try {
                    updateOrganized(data => { (data[msg.hash] ??= {})[String(msg.episodeId)] = msg.entry })
                } catch (err) {
                    logger.error('organize', `Échec de l'enregistrement de l'import (épisode ${msg.episodeId}) :${err instanceof Error ? err.message : err}`)
                }
            } else if (msg.type === 'result') {
                onResult(msg)
            } else if (msg.type === 'done') {
                finish()
            }
        })
        worker.on('error', err => finish(err))
        worker.on('exit', code => finish(code > 1 ? new Error(`Arrêt inattendu du worker (code ${code})`) : undefined))

        worker.postMessage({ type: 'run', torrents, seriesData })
    })
}

// ── Analyse de la médiathèque ─────────────────────────────────

function swapExt(filename: string, ext: string): string {
    const cur = path.extname(filename)
    if (!cur || cur === ext) return filename
    return filename.slice(0, -cur.length) + ext
}

export let lastScan: { at: string; found: number; added: number } | null = null

export async function scanMediaPath(
    mediaPath    : string,
    organizedPath: string,
    seriesData   : any[] = []
): Promise<{ found: number; added: number }> {
    const result = { found: 0, added: 0 }

    if (!fs.existsSync(mediaPath)) {
        logger.warn('organize', `Dossier de la médiathèque introuvable : ${mediaPath}`)
        return result
    }

    logger.info('organize', `Analyse de la médiathèque : ${mediaPath}`)

    const filenameIndex = new Map<string, {
        hashes      : string[]
        srcFilename : string
        episodeId   : number
        season      : number
        episode     : number
        destFilename: string
    }>()

    for (const sd of seriesData) {
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {

                const idx = (filename: string, hash: string, destFilename?: string) => {
                    const base = filename.replace(/\.[^.]+$/, '')
                    if (!base) return
                    const existing = filenameIndex.get(base)
                    if (existing && existing.episodeId === ep.id) {
                        if (!existing.hashes.includes(hash)) existing.hashes.push(hash)
                        return
                    }
                    filenameIndex.set(base, {
                        hashes      : [hash],
                        srcFilename : filename,
                        episodeId   : ep.id,
                        season      : season.season_number,
                        episode     : ep.episode_number,
                        destFilename: destFilename ?? filename,
                    })
                }

                for (const p of ep.paths ?? []) {
                    if (typeof p !== 'object' || !p.infohash || !p.path) continue
                    const hash        = p.infohash.toLowerCase()
                    const srcFilename = p.path.replace(/\\/g, '/').split('/').pop()
                    if (!srcFilename) continue
                    idx(srcFilename, hash)
                    const pathNfo = p.nfo_filename ?? ep.nfo_filename
                    if (pathNfo) idx(pathNfo, hash, pathNfo)
                    const pathFmt = p.formatted_name ?? ep.formatted_name
                    if (pathFmt?.trim()) {
                        const fmtBase = pathFmt.replace(/[<>:"/\\|?*]/g, '').trim()
                        idx(fmtBase, hash, fmtBase)
                    }
                }

                const fallbackHash = ep.paths?.[0]?.infohash?.toLowerCase() ?? 'manual'
                if (ep.original_filename) idx(ep.original_filename, fallbackHash, ep.original_filename)
                if (ep.nfo_filename)      idx(ep.nfo_filename, fallbackHash, ep.nfo_filename)
                if (ep.formatted_name?.trim()) {
                    const fmtBase = ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim()
                    idx(fmtBase, fallbackHash, fmtBase)
                }
            }
        }
    }

    let organized: Organized
    try { organized = readOrganized(organizedPath) }
    catch (err) {
        logger.error('organize', `Analyse annulée : ${err instanceof Error ? err.message : err}`)
        return result
    }

    const presentFiles = new Set<string>()
    let noMatch = 0

    const trackedByPath = new Map<string, string[]>()
    for (const [hash, episodes] of Object.entries(organized)) {
        for (const [episodeId, entry] of Object.entries(episodes)) {
            if (!entry?.dest_path) continue
            const keys = trackedByPath.get(entry.dest_path) ?? []
            keys.push(`${hash}:${episodeId}`)
            trackedByPath.set(entry.dest_path, keys)
        }
    }

    function walk(dir: string) {
        let entries: fs.Dirent[]
        try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
        catch { return }
        for (const entry of entries) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                walk(full)
            } else if (entry.isFile() && /\.(mkv|mp4|avi|m4v|mov|wmv)$/i.test(entry.name)) {
                result.found++

                // Fichier déjà suivi (sous n'importe quel hash) : ne pas créer d'entrée en double
                const tracked = trackedByPath.get(full)
                if (tracked) {
                    for (const key of tracked) presentFiles.add(key)
                    continue
                }

                const nameWithoutExt = entry.name.replace(/\.[^.]+$/, '')
                let match = filenameIndex.get(nameWithoutExt)

                // À défaut, un nom de l'index qui préfixe le fichier (ex. "X.S01E01.MULTI.1080p" pour "X.S01E01.MULTI.1080p.x264-FANKAI")
                if (!match) {
                    const lower = nameWithoutExt.toLowerCase()
                    for (const [key, val] of filenameIndex.entries()) {
                        if (lower.startsWith(key.toLowerCase() + '.') || lower === key.toLowerCase()) {
                            match = val
                            break
                        }
                    }
                }

                if (!match) {
                    noMatch++
                    const prefix    = nameWithoutExt.slice(0, 20).toLowerCase()
                    const close     = [...filenameIndex.keys()].filter(k => k.toLowerCase().startsWith(prefix)).slice(0, 3)
                    const closeStr  = close.length > 0 ? ` (candidats : ${close.map(c => `« ${c} »`).join(', ')})` : ' (aucun candidat proche)'
                    logger.warn('organize', `Analyse : aucune correspondance pour « ${nameWithoutExt} »${closeStr}`)
                    continue
                }

                const { hashes, srcFilename, episodeId, season, episode } = match
                const hash = hashes.find(h => organized[h]?.[String(episodeId)]) ?? hashes[0]
                presentFiles.add(`${hash}:${episodeId}`)

                if (organized[hash]?.[String(episodeId)]) continue

                if (!organized[hash]) organized[hash] = {}
                organized[hash][String(episodeId)] = {
                    at           : new Date().toISOString(),
                    season,
                    episode,
                    episode_id   : episodeId,
                    src_filename : srcFilename,
                    dest_filename: entry.name,
                    dest_path    : full,
                }
                result.added++
                logger.debug('organize', `Analyse : « ${entry.name} » associé à l'épisode ${episodeId} (S${season}E${episode})`)
            }
        }
    }

    walk(mediaPath)

    const mediaEmpty = result.found === 0 && Object.keys(organized).length > 0
    if (mediaEmpty) logger.warn('organize', `Analyse : aucun fichier trouvé dans ${mediaPath}, entrées existantes conservées`)

    // Supprimer uniquement les entrées connues dans l'index et absentes du disque
    const allEpisodeIds = new Set(
        [...filenameIndex.values()].flatMap(v => v.hashes.map(h => `${h}:${v.episodeId}`))
    )

    let removed = 0
    for (const [hash, episodes] of Object.entries(organized)) {
        if (mediaEmpty) break
        for (const episodeId of Object.keys(episodes)) {
            if (allEpisodeIds.has(`${hash}:${episodeId}`) && !presentFiles.has(`${hash}:${episodeId}`)) {
                delete organized[hash][episodeId]
                removed++
            }
        }
        if (Object.keys(organized[hash]).length === 0) delete organized[hash]
    }

    const { autoUnimportMissing } = readSettings()
    let autoRemoved = 0
    if (autoUnimportMissing && !mediaEmpty) {
        for (const [hash, episodes] of Object.entries(organized)) {
            for (const [episodeId, entry] of Object.entries(episodes as Record<string, any>)) {
                const destPath = entry?.dest_path
                if (destPath && !fs.existsSync(destPath)) {
                    delete (organized[hash] as any)[episodeId]
                    autoRemoved++
                    logger.info('organize', `Retrait automatique : fichier introuvable « ${destPath} »`)
                }
            }
            if (Object.keys(organized[hash]).length === 0) delete organized[hash]
        }
    }

    if (result.added > 0 || removed > 0 || autoRemoved > 0) {
        writeOrganized(organized, organizedPath)
    }

    lastScan = { at: new Date().toISOString(), ...result }
    logger.info('organize', `Analyse terminée : ${result.found} fichier(s), ${result.added} ajouté(s), ${removed} entrée(s) obsolète(s) retirée(s) du suivi${autoRemoved > 0 ? `, ${autoRemoved} retirée(s) (fichier manquant)` : ''}${noMatch > 0 ? `, ${noMatch} sans correspondance` : ''}`)

    return result
}

// ── Import automatique ────────────────────────────────────────

export async function autoOrganizeAll(
    listFn     : () => Promise<any[]>,
    seriesData : any[],
    onResult  ?: (r: { hash: string; name: string; serieId?: number | null; done: number; skipped: number; errors: number; errorFiles: { file: string; error: string }[] }) => void
): Promise<void> {
    const { autoImport, mediaPath } = readSettings()
    if (!autoImport) {
        logger.debug('organize', 'Import automatique désactivé')
        return
    }
    if (!mediaPath?.trim()) {
        logger.debug('organize', 'Médiathèque non configurée')
        return
    }

    if (_queued > 0) {
        logger.debug('organize', 'Import déjà en cours')
        return
    }

    let torrents: any[]
    try {
        torrents = await listFn()
    } catch (err) {
        logger.error('organize', `Impossible de récupérer la liste des torrents : ${err instanceof Error ? err.message : err}`)
        return
    }

    if (torrents.length === 0) return

    const isFirstRun   = _prevStates.size === 0
    const seedingCount = torrents.filter(t => t.state === 'seeding').length

    const newlySeeding = torrents.filter(t => {
        const prev = _prevStates.get(t.hash)
        return t.state === 'seeding' && (prev === undefined || prev !== 'seeding')
    })

    for (const t of torrents) _prevStates.set(t.hash, t.state)

    let organized: Organized
    try { organized = readOrganized() }
    catch (err) {
        logger.error('organize', `Import automatique annulé : ${err instanceof Error ? err.message : err}`)
        return
    }

    const hasUnorganized = torrents.some(t =>
        t.state === 'seeding' && !organized[t.hash?.toLowerCase()]
    )

    if (!isFirstRun && newlySeeding.length === 0 && !hasUnorganized) return
    if (seedingCount === 0) return

    if (newlySeeding.length > 0 && !isFirstRun) {
        logger.info('organize', `${newlySeeding.length} torrent(s) terminé(s) : lancement de l'import automatique`)
        for (const t of newlySeeding) {
            logger.debug('organize', `Torrent terminé : « ${t.name} »`)
        }
    } else {
        logger.debug('organize', `Import automatique : vérification de ${seedingCount} torrent(s) terminé(s)`)
    }

    try {
        await enqueue(() => runWorker(torrents, seriesData, msg => {
            if (msg.errors.length > 0) {
                logger.warn('organize', `« ${msg.name} » : ${msg.done} importé(s), ${msg.skipped} ignoré(s), ${msg.errors.length} erreur(s)`)
                for (const e of msg.errors) {
                    logger.error('organize', `Erreur sur « ${e.file} » : ${e.error}`)
                }
            } else if (msg.done > 0) {
                logger.info('organize', `« ${msg.name} » : ${msg.done} fichier(s) importé(s), ${msg.skipped} ignoré(s)`)
            } else {
                logger.debug('organize', `« ${msg.name} » : rien à importer (${msg.skipped} ignoré(s))`)
            }
            onResult?.({
                hash      : msg.hash,
                name      : msg.name,
                serieId   : msg.serieId ?? null,
                done      : msg.done,
                skipped   : msg.skipped,
                errors    : msg.errors.length,
                errorFiles: msg.errors,
            })
        }))
        logger.debug('organize', 'Worker d\'import terminé')
    } catch (err) {
        logger.error('organize', `Erreur du worker : ${err instanceof Error ? err.message : err}`)
    }
}

// ── Migration des IDs d'épisodes ──────────────────────────────
// Les IDs du scraper changent : on les retrouve via (infohash, saison, épisode)

export async function migrateOrganizedEpisodeIds(
    organizedPath: string,
    seriesData   : any[]
): Promise<{ updated: number; orphaned: number }> {

    // infohash : Map<"saison:épisode", ID actuel>
    const hashEpMap = new Map<string, Map<string, number>>()
    const validIds  = new Set<number>()

    for (const sd of seriesData) {
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                validIds.add(ep.id)
                for (const p of ep.paths ?? []) {
                    if (typeof p !== 'object' || !p.infohash) continue
                    const h   = p.infohash.toLowerCase()
                    const key = `${season.season_number}:${ep.episode_number}`
                    if (!hashEpMap.has(h)) hashEpMap.set(h, new Map())
                    hashEpMap.get(h)!.set(key, ep.id)
                }
            }
        }
    }

    let organized: Organized
    try { organized = readOrganized(organizedPath) }
    catch (err) {
        logger.error('organize', `Migration des IDs annulée :${err instanceof Error ? err.message : err}`)
        return { updated: 0, orphaned: 0 }
    }

    let updated = 0
    let orphaned = 0
    let changed  = false

    for (const [hash, episodes] of Object.entries(organized)) {
        if (hash === 'manual') continue
        const epMap = hashEpMap.get(hash.toLowerCase())

        const newEpisodes: Record<string, any> = {}
        for (const [oldIdStr, entry] of Object.entries(episodes as Record<string, any>)) {
            const oldId = Number(oldIdStr)

            if (validIds.has(oldId)) {
                newEpisodes[oldIdStr] = entry
                continue
            }

            const key   = `${entry.season}:${entry.episode}`
            const newId = epMap?.get(key)

            if (newId && newId !== oldId) {
                if (newEpisodes[String(newId)] || (episodes as any)[String(newId)]) {
                    changed = true
                    logger.info('organize', `Migration des IDs : entrée de l'épisode ${oldId} supprimée, ${newId} déjà présent (${hash.slice(0, 8)}…, S${entry.season}E${entry.episode})`)
                } else {
                    newEpisodes[String(newId)] = { ...entry, episode_id: newId }
                    updated++
                    changed = true
                    logger.info('organize', `Migration des IDs : épisode ${oldId} remplacé par ${newId} (${hash.slice(0, 8)}…, S${entry.season}E${entry.episode})`)
                }
            } else {
                orphaned++
                newEpisodes[oldIdStr] = entry
                logger.warn('organize', `Migration des IDs : épisode ${oldId} introuvable dans le catalogue (${hash.slice(0, 8)}…, S${entry.season}E${entry.episode})`)
            }
        }

        organized[hash] = newEpisodes
        if (Object.keys(organized[hash]).length === 0) delete organized[hash]
    }

    if (changed) {
        writeOrganized(organized, organizedPath)
        logger.info('organize', `Migration des IDs terminée : ${updated} mis à jour${orphaned > 0 ? `, ${orphaned} non résolu(s)` : ''}`)
    } else {
        logger.debug('organize', `Migration des IDs : aucun changement${orphaned > 0 ? ` (${orphaned} ID(s) inconnu(s) conservé(s))` : ''}`)
    }

    return { updated, orphaned }
}

// ── Dédoublonnage ─────────────────────────────────────────────
export function dedupeOrganizedEpisodes(
    organizedPath: string,
): { removed: number } {
    let organized: Organized
    try { organized = readOrganized(organizedPath) }
    catch (err) {
        logger.error('organize', `Dédoublonnage annulé : ${err instanceof Error ? err.message : err}`)
        return { removed: 0 }
    }

    // episode_id : [{ hash, entry }]
    const byEpisode = new Map<string, { hash: string; entry: any }[]>()
    for (const [hash, episodes] of Object.entries(organized)) {
        for (const [episodeId, entry] of Object.entries(episodes as Record<string, any>)) {
            if (!byEpisode.has(episodeId)) byEpisode.set(episodeId, [])
            byEpisode.get(episodeId)!.push({ hash, entry })
        }
    }

    let removed = 0
    for (const [episodeId, candidates] of byEpisode) {
        if (candidates.length < 2) continue

        const present = candidates.filter(c => c.entry?.dest_path && fs.existsSync(c.entry.dest_path))
        if (present.length === 0) continue

        for (const c of candidates) {
            if (present.includes(c)) continue
            delete (organized[c.hash] as any)[episodeId]
            removed++
            logger.info('organize', `Dédoublonnage : épisode ${episodeId} retiré de ${c.hash.slice(0, 8)}… (fichier absent, conservé sous ${present[0].hash.slice(0, 8)}…)`)
        }
    }

    if (removed > 0) {
        writeOrganized(organized, organizedPath)
        logger.info('organize', `Dédoublonnage terminé : ${removed} entrée(s) redondante(s) supprimée(s)`)
    }

    return { removed }
}

// ── Renommage selon le catalogue ──────────────────────────────

export async function syncFilenameChanges(
    seriesData   : any[],
    organizedPath: string,
): Promise<{ renamed: number; errors: number }> {
    const { nfoSupport } = readSettings()
    let organized: Organized
    try { organized = readOrganized(organizedPath) }
    catch (err) {
        logger.error('organize', `Renommage selon le catalogue annulé :${err instanceof Error ? err.message : err}`)
        return { renamed: 0, errors: 0 }
    }

    let renamed = 0
    let errors  = 0
    let changed = false

    for (const sd of seriesData) {
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                let orgEntry: any   = null
                let orgHash: string | null = null
                for (const [hash, eps] of Object.entries(organized)) {
                    if ((eps as any)[String(ep.id)]) {
                        orgEntry = (eps as any)[String(ep.id)]
                        orgHash  = hash
                        break
                    }
                }
                if (!orgEntry || !orgHash) continue

                const currentName = orgEntry.dest_path
                    ? path.basename(orgEntry.dest_path)
                    : orgEntry.dest_filename
                const srcExt = path.extname(currentName)
                const matchedPathEntry = (ep.paths ?? []).find((p: any) =>
                    typeof p === 'object' && p.infohash?.toLowerCase() === orgHash
                )
                const rawFmt = matchedPathEntry?.formatted_name ?? ep.formatted_name
                const rawNfo = matchedPathEntry?.nfo_filename   ?? ep.nfo_filename
                const expectedName: string = nfoSupport
                    ? (rawNfo ? rawNfo.replace(/\.[^.]+$/, '') + srcExt : currentName)
                    : (rawFmt?.trim() ? rawFmt.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt : currentName)

                if (expectedName === currentName) continue

                const oldPath = orgEntry.dest_path
                if (!oldPath || !fs.existsSync(oldPath)) continue

                const newPath = path.join(path.dirname(oldPath), expectedName)
                try {
                    if (fs.existsSync(newPath)) {
                        logger.warn('organize', `Renommage ignoré : « ${expectedName} » existe déjà`)
                        continue
                    }
                    fs.renameSync(oldPath, newPath)
                    ;(organized[orgHash] as any)[String(ep.id)] = {
                        ...orgEntry,
                        dest_filename: expectedName,
                        dest_path    : newPath,
                        at           : new Date().toISOString(),
                    }
                    retargetEntries(organized, new Map([[oldPath, newPath]]))
                    renamed++
                    changed = true
                    logger.info('organize', `Renommage : « ${currentName} » en « ${expectedName} »`)
                } catch (err) {
                    errors++
                    logger.error('organize', `Échec du renommage de l'épisode ${ep.id} :${err instanceof Error ? err.message : err}`)
                }
            }
        }
    }

    if (changed)
        writeOrganized(organized, organizedPath)

    if (renamed > 0 || errors > 0)
        logger.info('organize', `Noms de fichiers mis à jour : ${renamed} renommé(s)${errors > 0 ? `, ${errors} erreur(s)` : ''}`)

    return { renamed, errors }
}

// ── Import manuel ─────────────────────────────────────────────

export async function organizeTorrent(
    hash      : string,
    name      : string,
    savePath  : string,
    seriesData: any[],
    files?    : { name?: string; progress: number; priority?: number }[],
): Promise<OrganizeResult> {
    const key     = hash.toLowerCase()
    const pending = _pendingManual.get(key)
    if (pending) {
        logger.info('organize', `Import manuel de « ${name} » déjà en file d'attente`)
        return pending
    }
    logger.info('organize', `Import manuel ${_queued > 0 ? 'mis en file d\'attente' : 'lancé'} pour « ${name} » (${hash})`)

    // Progression par fichier : le worker ignore les fichiers incomplets (évite EBUSY sous Windows)
    const fakeTorrent = { hash, name, save_path: savePath, state: 'seeding', files: files ?? [] }
    const result: OrganizeResult = { total: 0, skipped: 0, done: 0, errors: [] }

    const job = enqueue(async () => {
        _pendingManual.delete(key)
        try {
            await runWorker([fakeTorrent], seriesData, msg => {
                result.serieId = msg.serieId ?? null
                result.total   = msg.total
                result.skipped = msg.skipped
                result.done    = msg.done
                result.errors  = msg.errors
                if (msg.errors.length > 0) {
                    logger.warn('organize', `Import de « ${name} » : ${msg.done} importé(s), ${msg.errors.length} erreur(s)`)
                    for (const e of msg.errors) {
                        logger.error('organize', `Erreur sur « ${e.file} » : ${e.error}`)
                    }
                } else {
                    logger.info('organize', `Import de « ${name} » terminé : ${msg.done} fichier(s) importé(s), ${msg.skipped} ignoré(s)`)
                }
            })
        } catch (err) {
            logger.error('organize', `Échec de l'import de « ${name} » :${err instanceof Error ? err.message : err}`)
            throw err
        }
        return result
    })
    _pendingManual.set(key, job)
    return job
}