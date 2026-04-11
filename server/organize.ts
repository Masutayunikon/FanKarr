/**
 * organize.ts
 * ===========
 * Lance l'organizer dans un Worker Thread dédié pour ne pas bloquer Express.
 */

import fs   from 'fs'
import path from 'path'
import { Worker } from 'worker_threads'
import { logger } from './logger.js'
import { DATA_DIR } from './config.js'
import { readSettings } from './settings.js'

const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')

export let workerRunning = false
const _prevStates = new Map<string, string>()

function resolveWorkerPath(): string {
    if (typeof (globalThis as any).Bun !== 'undefined') {
        return path.join(path.dirname((process as any).execPath), 'organize-worker.js')
    }
    return path.join(path.dirname(new URL(import.meta.url).pathname), 'organize-worker.js')
}

export interface OrganizeResult {
    total   : number
    skipped : number
    done    : number
    errors  : { file: string; error: string }[]
}

interface OrgEntry {
    at           : string
    season       : number
    episode      : number
    episode_id   : number
    src_filename : string
    dest_filename: string
    dest_path    : string
}

type Organized = Record<string, Record<string, OrgEntry>>

// ── Scan initial ──────────────────────────────────────────────

function swapExt(filename: string, ext: string): string {
    const cur = path.extname(filename)
    if (!cur || cur === ext) return filename
    return filename.slice(0, -cur.length) + ext
}

export async function scanMediaPath(
    mediaPath    : string,
    organizedPath: string,
    seriesData   : any[] = []
): Promise<{ found: number; added: number }> {
    const result = { found: 0, added: 0 }

    if (!fs.existsSync(mediaPath)) {
        logger.warn('organize', `Dossier médiathèque introuvable : ${mediaPath}`)
        return result
    }

    logger.info('organize', `Scan de la médiathèque : ${mediaPath}`)

    // Map : nom_sans_extension → { hash, srcFilename, episodeId, season, episode }
    // On indexe par nom sans extension pour matcher quelle que soit l'extension sur le disque
    const filenameIndex = new Map<string, {
        hash        : string
        srcFilename : string
        episodeId   : number
        season      : number
        episode     : number
        destFilename: string
    }>()

    for (const sd of seriesData) {
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {

                // Helper : indexer par nom sans extension
                const idx = (filename: string, hash: string, destFilename?: string) => {
                    const base = filename.replace(/\.[^.]+$/, '')
                    if (!base) return
                    filenameIndex.set(base, {
                        hash,
                        srcFilename : filename,
                        episodeId   : ep.id,
                        season      : season.season_number,
                        episode     : ep.episode_number,
                        destFilename: destFilename ?? filename,
                    })
                }

                // 1. Noms depuis les paths (avec vrai infohash)
                for (const p of ep.paths ?? []) {
                    if (typeof p !== 'object' || !p.infohash || !p.path) continue
                    const hash        = p.infohash.toLowerCase()
                    const srcFilename = p.path.replace(/\\/g, '/').split('/').pop()
                    if (!srcFilename) continue
                    idx(srcFilename, hash)
                    if (ep.nfo_filename) idx(ep.nfo_filename, hash, ep.nfo_filename)
                }

                // 2. original_filename et formatted_name — indexés même si paths est vide
                // (pour les séries sans torrent importées manuellement)
                const fallbackHash = ep.paths?.[0]?.infohash?.toLowerCase() ?? 'manual'
                if (ep.original_filename) idx(ep.original_filename, fallbackHash, ep.original_filename)
                if (ep.formatted_name?.trim()) {
                    const fmtBase = ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim()
                    idx(fmtBase, fallbackHash, fmtBase)
                }
            }
        }
    }

    let organized: Organized = {}
    try {
        if (fs.existsSync(organizedPath))
            organized = JSON.parse(fs.readFileSync(organizedPath, 'utf-8'))
    } catch {}

    // Track les paires hash:episodeId présentes
    const presentFiles = new Set<string>()
    let noMatch = 0

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
                const nameWithoutExt = entry.name.replace(/\.[^.]+$/, '')
                const match = filenameIndex.get(nameWithoutExt)
                if (!match) {
                    noMatch++
                    const prefix    = nameWithoutExt.slice(0, 20).toLowerCase()
                    const close     = [...filenameIndex.keys()].filter(k => k.toLowerCase().startsWith(prefix)).slice(0, 3)
                    const closeStr  = close.length > 0 ? ` | candidats : ${close.map(c => `"${c}"`).join(', ')}` : ' | aucun candidat proche'
                    logger.warn('organize', `Scan no match : "${nameWithoutExt}"${closeStr}`)
                    continue
                }

                const { hash, srcFilename, episodeId, season, episode } = match
                // Le destFilename prend l'extension réelle du fichier sur le disque
                const realExt     = path.extname(entry.name)
                const destBase    = match.destFilename.replace(/\.[^.]+$/, '')
                const destFilename = destBase + realExt
                presentFiles.add(`${hash}:${episodeId}`)

                if (organized[hash]?.[String(episodeId)]) continue

                if (!organized[hash]) organized[hash] = {}
                organized[hash][String(episodeId)] = {
                    at           : new Date().toISOString(),
                    season,
                    episode,
                    episode_id   : episodeId,
                    src_filename : srcFilename,
                    dest_filename: destFilename,
                    dest_path    : full,
                }
                result.added++
                logger.debug('organize', `Scan match : "${entry.name}" → ep ${episodeId} (S${season}E${episode})`)
            }
        }
    }

    walk(mediaPath)

    // Supprimer uniquement les entrées connues dans l'index et absentes du disque
    const allEpisodeIds = new Set([...filenameIndex.values()].map(v => `${v.hash}:${v.episodeId}`))

    let removed = 0
    for (const [hash, episodes] of Object.entries(organized)) {
        for (const episodeId of Object.keys(episodes)) {
            if (allEpisodeIds.has(`${hash}:${episodeId}`) && !presentFiles.has(`${hash}:${episodeId}`)) {
                delete organized[hash][episodeId]
                removed++
            }
        }
        if (Object.keys(organized[hash]).length === 0) delete organized[hash]
    }

    if (result.added > 0 || removed > 0) {
        fs.writeFileSync(organizedPath, JSON.stringify(organized, null, 2), 'utf-8')
    }

    logger.info('organize', `Scan terminé — ${result.found} fichiers, ${result.added} ajoutés, ${removed} orphelins supprimés${noMatch > 0 ? `, ${noMatch} non matchés` : ''}`)

    return result
}

// ── Auto-import ───────────────────────────────────────────────

export async function autoOrganizeAll(
    listFn     : () => Promise<any[]>,
    seriesData : any[],
    onResult  ?: (r: { hash: string; name: string; done: number; skipped: number; errors: number; errorFiles: { file: string; error: string }[] }) => void
): Promise<void> {
    const { autoImport } = readSettings()
    if (!autoImport) {
        logger.debug('organize', 'Import automatique désactivé — skip')
        return
    }

    if (workerRunning) {
        logger.debug('organize', 'Worker déjà en cours — skip')
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

    let organized: Organized = {}
    try {
        if (fs.existsSync(ORGANIZED_PATH))
            organized = JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8'))
    } catch {}

    const hasUnorganized = torrents.some(t =>
        t.state === 'seeding' && !organized[t.hash?.toLowerCase()]
    )

    if (!isFirstRun && newlySeeding.length === 0 && !hasUnorganized) return
    if (seedingCount === 0) return

    if (newlySeeding.length > 0 && !isFirstRun) {
        logger.info('organize', `${newlySeeding.length} torrent(s) terminé(s) → lancement de l'import automatique`)
        for (const t of newlySeeding) {
            logger.debug('organize', `Nouveau seeding : "${t.name}"`)
        }
    } else {
        logger.debug('organize', `Lancement worker (${seedingCount} torrents en seeding, vérification initiale)`)
    }

    workerRunning = true
    const worker  = new Worker(resolveWorkerPath())

    worker.on('message', (msg: any) => {
        if (msg.type === 'log') {
            logger[msg.level as 'info' | 'warn' | 'error' | 'debug']?.('organize-worker', msg.msg)
        } else if (msg.type === 'result') {
            if (msg.errors.length > 0) {
                logger.warn('organize', `"${msg.name}" — ${msg.done} importé(s), ${msg.skipped} skippé(s), ${msg.errors.length} erreur(s)`)
                for (const e of msg.errors) {
                    logger.error('organize', `Erreur sur "${e.file}" : ${e.error}`)
                }
            } else if (msg.done > 0) {
                logger.info('organize', `"${msg.name}" — ${msg.done} fichier(s) importé(s), ${msg.skipped} skippé(s)`)
            } else {
                logger.debug('organize', `"${msg.name}" — rien à importer (${msg.skipped} skippé(s))`)
            }
            onResult?.({
                hash      : msg.hash,
                name      : msg.name,
                done      : msg.done,
                skipped   : msg.skipped,
                errors    : msg.errors.length,
                errorFiles: msg.errors,
            })
        } else if (msg.type === 'done') {
            logger.debug('organize', 'Worker terminé')
            workerRunning = false
            worker.terminate()
        }
    })

    worker.on('error', (err) => {
        logger.error('organize', `Worker erreur : ${err.message}`)
        workerRunning = false
    })
    worker.on('exit', (code) => {
        if (code > 1) logger.error('organize', `Worker exit inattendu avec code ${code}`)
        else logger.debug('organize', `Worker terminé (code ${code})`)
        workerRunning = false
    })

    worker.postMessage({ type: 'run', torrents, seriesData })
}

// ── Import manuel ─────────────────────────────────────────────

export async function organizeTorrent(
    hash      : string,
    name      : string,
    savePath  : string,
    seriesData: any[]
): Promise<OrganizeResult> {
    logger.info('organize', `Import manuel lancé pour "${name}" (${hash})`)

    return new Promise((resolve, reject) => {
        const worker      = new Worker(resolveWorkerPath())
        const fakeTorrent = { hash, name, save_path: savePath, state: 'seeding' }
        const result: OrganizeResult = { total: 0, skipped: 0, done: 0, errors: [] }

        worker.on('message', (msg: any) => {
            if (msg.type === 'log') {
                logger[msg.level as 'info' | 'warn' | 'error' | 'debug']?.('organize-worker', msg.msg)
            } else if (msg.type === 'result') {
                result.total   = msg.total
                result.skipped = msg.skipped
                result.done    = msg.done
                result.errors  = msg.errors
                if (msg.errors.length > 0) {
                    logger.warn('organize', `Import "${name}" — ${msg.done} OK, ${msg.errors.length} erreur(s)`)
                    for (const e of msg.errors) {
                        logger.error('organize', `Erreur sur "${e.file}" : ${e.error}`)
                    }
                } else {
                    logger.info('organize', `Import "${name}" terminé — ${msg.done} fichier(s) importé(s), ${msg.skipped} skippé(s)`)
                }
            } else if (msg.type === 'done') {
                worker.terminate()
                resolve(result)
            }
        })

        worker.on('error', (err) => {
            logger.error('organize', `Worker erreur lors de l'import de "${name}" : ${err.message}`)
            worker.terminate()
            reject(err)
        })
        worker.on('exit', (code) => {
            if (code > 1) reject(new Error(`Worker exit inattendu: code ${code}`))
        })

        worker.postMessage({ type: 'run', torrents: [fakeTorrent], seriesData })
    })
}