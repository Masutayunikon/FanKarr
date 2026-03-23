/**
 * organize.ts
 * ===========
 * Lance l'organizer dans un Worker Thread dédié pour ne pas bloquer Express.
 */

import fs     from 'fs'
import path   from 'path'
import { Worker } from 'worker_threads'
import { logger } from './logger.js'
import { DATA_DIR } from './config.js'

const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')

// Un seul worker à la fois
let workerRunning = false

// État précédent des torrents pour détecter les passages downloading → seeding
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

/**
 * Scan initial du mediaPath au démarrage.
 * Construit l'index filename → infohash depuis les seriesData passées en paramètre.
 */
export async function scanMediaPath(
    mediaPath    : string,
    organizedPath: string,
    seriesData   : any[] = []
): Promise<{ found: number; added: number }> {
    const result = { found: 0, added: 0 }

    if (!fs.existsSync(mediaPath)) {
        logger.warn('organize', `scanMediaPath: ${mediaPath} inexistant, skip`)
        return result
    }

    // Construire index filename → infohash depuis les seriesData
    const filenameIndex = new Map<string, string>()  // filename → infohash
    for (const sd of seriesData) {
        for (const season of sd.seasons ?? []) {
            for (const ep of season.episodes ?? []) {
                for (const p of ep.paths ?? []) {
                    if (typeof p === 'string') {
                        // Legacy : pas d'infohash disponible, on skip pour le scan
                        continue
                    }
                    const hash = p.infohash?.toLowerCase()
                    if (!hash || !p.path) continue
                    const filename = p.path.replace(/\\/g, '/').split('/').pop()
                    if (filename) filenameIndex.set(filename, hash)
                }
            }
        }
    }

    // Charger organized.json existant
    let organized: Record<string, Record<string, string>> = {}
    try {
        if (fs.existsSync(organizedPath))
            organized = JSON.parse(fs.readFileSync(organizedPath, 'utf-8'))
    } catch {}

    const presentFiles = new Set<string>()

    function walk(dir: string) {
        let entries: fs.Dirent[]
        try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
        catch { return }
        for (const entry of entries) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                walk(full)
            } else if (entry.isFile() && entry.name.endsWith('.mkv')) {
                result.found++
                const hash = filenameIndex.get(entry.name)
                if (!hash) continue
                presentFiles.add(`${hash}:${entry.name}`)
                if (organized[hash]?.[entry.name]) continue
                if (!organized[hash]) organized[hash] = {}
                organized[hash][entry.name] = new Date().toISOString()
                result.added++
            }
        }
    }

    walk(mediaPath)

    // Nettoyer les entrées orphelines
    let removed = 0
    for (const [hash, files] of Object.entries(organized)) {
        for (const filename of Object.keys(files)) {
            if (!presentFiles.has(`${hash}:${filename}`) && filenameIndex.get(filename) === hash) {
                delete organized[hash][filename]
                removed++
            }
        }
        if (Object.keys(organized[hash]).length === 0) delete organized[hash]
    }

    if (result.added > 0 || removed > 0) {
        fs.writeFileSync(organizedPath, JSON.stringify(organized, null, 2), 'utf-8')
        logger.info('organize', `scanMediaPath: ${result.found} fichiers, ${result.added} ajoutés, ${removed} orphelins supprimés`)
    } else {
        logger.info('organize', `scanMediaPath: ${result.found} fichiers scannés, rien de nouveau`)
    }

    return result
}

/**
 * Auto-organisation — appelée depuis index.ts avec les seriesData du cache GitHub.
 */
export async function autoOrganizeAll(
    listFn     : () => Promise<any[]>,
    seriesData : any[],
    onResult  ?: (r: { hash: string; name: string; done: number; skipped: number; errors: number; errorFiles: { file: string; error: string }[] }) => void
): Promise<void> {
    if (workerRunning) {
        console.log('[organize] Worker déjà en cours, skip')
        return
    }

    let torrents: any[]
    try {
        torrents = await listFn()
    } catch (err) {
        console.error('[organize] Impossible de récupérer la liste des torrents:', err)
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

    if (!isFirstRun && newlySeeding.length === 0) return
    if (seedingCount === 0) return

    if (newlySeeding.length > 0 && !isFirstRun) {
        console.log(`[organize] ${newlySeeding.length} nouveau(x) torrent(s) terminé(s) → lancement worker`)
    } else {
        console.log(`[organize] Lancement worker (${seedingCount} torrents en seeding)`)
    }
    workerRunning = true

    const worker = new Worker(resolveWorkerPath())

    worker.on('message', (msg: any) => {
        if (msg.type === 'log') {
            if (msg.level === 'error') console.error(msg.msg)
            else if (msg.level === 'warn') console.warn(msg.msg)
            else console.log(msg.msg)
        } else if (msg.type === 'result') {
            console.log(`[organize] ${msg.name} → ${msg.done} OK, ${msg.skipped} skippés, ${msg.errors.length} erreurs`)
            onResult?.({
                hash      : msg.hash,
                name      : msg.name,
                done      : msg.done,
                skipped   : msg.skipped,
                errors    : msg.errors.length,
                errorFiles: msg.errors,
            })
        } else if (msg.type === 'done') {
            console.log('[organize] Worker terminé')
            workerRunning = false
            worker.terminate()
        }
    })

    worker.on('error', (err) => { console.error('[organize] Worker erreur:', err); workerRunning = false })
    worker.on('exit',  (code) => { if (code !== 0) console.error(`[organize] Worker exit ${code}`); workerRunning = false })

    worker.postMessage({ type: 'run', torrents, seriesData })
}

/**
 * Organisation manuelle d'un torrent.
 */
export async function organizeTorrent(
    hash      : string,
    name      : string,
    savePath  : string,
    seriesData: any[]
): Promise<OrganizeResult> {
    return new Promise((resolve, reject) => {
        const worker      = new Worker(resolveWorkerPath())
        const fakeTorrent = { hash, name, save_path: savePath, state: 'seeding' }
        const result: OrganizeResult = { total: 0, skipped: 0, done: 0, errors: [] }

        worker.on('message', (msg: any) => {
            if (msg.type === 'log') {
                if (msg.level === 'error') console.error(msg.msg)
                else if (msg.level === 'warn') console.warn(msg.msg)
                else console.log(msg.msg)
            } else if (msg.type === 'result') {
                result.total   = msg.total
                result.skipped = msg.skipped
                result.done    = msg.done
                result.errors  = msg.errors
            } else if (msg.type === 'done') {
                worker.terminate()
                resolve(result)
            }
        })

        worker.on('error', (err) => { worker.terminate(); reject(err) })
        worker.on('exit',  (code) => { if (code !== 0) reject(new Error(`Worker exit ${code}`)) })

        worker.postMessage({ type: 'run', torrents: [fakeTorrent], seriesData })
    })
}