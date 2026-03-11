/**
 * organize.ts
 * ===========
 * Lance l'organizer dans un Worker Thread dédié pour ne pas bloquer Express.
 * Le worker gère tout le filesystem (copy, hardlink, move).
 */

import fs     from 'fs'
import path   from 'path'
import { Worker } from 'worker_threads'
import { logger } from './logger.js'

// Un seul worker à la fois
let workerRunning = false

export interface OrganizeResult {
    total   : number
    skipped : number
    done    : number
    errors  : { file: string; error: string }[]
}

/**
 * Scan initial du mediaPath au démarrage.
 * Parcourt récursivement le dossier Jellyfin et marque dans organized.json
 * tous les fichiers déjà présents qui correspondent à un torrent connu.
 */
export async function scanMediaPath(
    mediaPath   : string,
    torrentsPath: string,
    organizedPath: string
): Promise<{ found: number; added: number }> {
    const result = { found: 0, added: 0 }

    if (!fs.existsSync(mediaPath)) {
        logger.warn('organize', `scanMediaPath: ${mediaPath} inexistant, skip`)
        return result
    }

    // Charger torrent_final.json
    let torrents: any[] = []
    try {
        if (!fs.existsSync(torrentsPath)) return result
        torrents = JSON.parse(fs.readFileSync(torrentsPath, 'utf-8'))
    } catch {
        logger.error('organize', 'scanMediaPath: impossible de lire torrent_final.json')
        return result
    }

    // Construire un index filename → { hash, infohash }
    const filenameIndex = new Map<string, string>()  // filename → infohash
    for (const t of torrents) {
        const hash = t.infohash?.toLowerCase()
        if (!hash) continue
        for (const f of t.torrent_files ?? []) {
            if (f.filename) filenameIndex.set(f.filename, hash)
        }
        // Fichier unique (torrent_files vide) → on indexe par raw name
        if ((t.torrent_files ?? []).length === 0 && t.raw) {
            filenameIndex.set(t.raw, hash)
        }
    }

    // Charger organized.json existant
    let organized: Record<string, Record<string, string>> = {}
    try {
        if (fs.existsSync(organizedPath))
            organized = JSON.parse(fs.readFileSync(organizedPath, 'utf-8'))
    } catch {}

    // Parcourir récursivement mediaPath
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
                if (organized[hash]?.[entry.name]) continue  // déjà connu
                // Marquer comme organisé
                if (!organized[hash]) organized[hash] = {}
                organized[hash][entry.name] = new Date().toISOString()
                result.added++
            }
        }
    }

    walk(mediaPath)

    if (result.added > 0) {
        fs.writeFileSync(organizedPath, JSON.stringify(organized, null, 2), 'utf-8')
        logger.info('organize', `scanMediaPath: ${result.found} fichiers scannés, ${result.added} ajoutés à organized.json`)
    } else {
        logger.info('organize', `scanMediaPath: ${result.found} fichiers scannés, rien de nouveau`)
    }

    return result
}

/**
 * Lance l'auto-organisation dans un worker thread.
 * listFn est appelée dans le thread principal (accès qBittorrent),
 * puis les données sont passées au worker.
 */
export async function autoOrganizeAll(
    listFn  : () => Promise<any[]>,
    onResult?: (r: { hash: string; name: string; done: number; skipped: number; errors: number; errorFiles: { file: string; error: string }[] }) => void
): Promise<void> {
    if (workerRunning) {
        logger.debug('organize', 'Worker déjà en cours, skip')
        return
    }

    let torrents: any[]
    try {
        torrents = await listFn()
    } catch (err) {
        logger.error('organize', "Impossible de récupérer la liste des torrents: " + (err instanceof Error ? err.message : String(err)))
        return
    }

    if (torrents.length === 0) return

    const seedingCount = torrents.filter(t => t.state === 'seeding').length
    if (seedingCount === 0) return

    logger.info('organize', `Lancement worker (${seedingCount} torrents en seeding)`)
    workerRunning = true

    const workerPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'organize-worker.js')

    const worker = new Worker(workerPath)

    worker.on('message', (msg: any) => {
        if (msg.type === 'log') {
            logger[msg.level as 'debug'|'info'|'warn'|'error']('organize', msg.msg)
        } else if (msg.type === 'result') {
            logger.info('organize', `${msg.name} → ${msg.done} OK, ${msg.skipped} skippés, ${msg.errors.length} erreurs`)
            onResult?.({
                hash       : msg.hash,
                name       : msg.name,
                done       : msg.done,
                skipped    : msg.skipped,
                errors     : msg.errors.length,
                errorFiles : msg.errors,
            })
        } else if (msg.type === 'done') {
            logger.debug('organize', 'Worker terminé')
            workerRunning = false
            worker.terminate()
        }
    })

    worker.on('error', (err) => {
        logger.error('organize', `Worker erreur: ${err instanceof Error ? err.message : err}`)
        workerRunning = false
    })

    worker.on('exit', (code) => {
        if (code !== 0) logger.error('organize', `Worker exit code ${code}`)
        workerRunning = false
    })

    // Envoyer les torrents au worker
    worker.postMessage({ type: 'run', torrents })
}

/**
 * Organisation manuelle d'un torrent (appelée depuis l'API /organize).
 * Lance aussi dans un worker thread.
 */
export async function organizeTorrent(
    hash    : string,
    name    : string,
    savePath: string
): Promise<OrganizeResult> {
    return new Promise((resolve, reject) => {
        const workerPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'organize-worker.js')
        const worker = new Worker(workerPath)

        // On envoie un seul torrent "fictif seeding"
        const fakeTorrent = { hash, name, save_path: savePath, state: 'seeding' }
        const result: OrganizeResult = { total: 0, skipped: 0, done: 0, errors: [] }

        worker.on('message', (msg: any) => {
            if (msg.type === 'log') {
                logger[msg.level as 'debug'|'info'|'warn'|'error']('organize', msg.msg)
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

        worker.postMessage({ type: 'run', torrents: [fakeTorrent] })
    })
}