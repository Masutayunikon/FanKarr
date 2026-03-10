/**
 * organize.ts
 * ===========
 * Lance l'organizer dans un Worker Thread dédié pour ne pas bloquer Express.
 * Le worker gère tout le filesystem (copy, hardlink, move).
 */

import path   from 'path'
import { Worker } from 'worker_threads'

// Un seul worker à la fois
let workerRunning = false

export interface OrganizeResult {
    total   : number
    skipped : number
    done    : number
    errors  : { file: string; error: string }[]
}

/**
 * Lance l'auto-organisation dans un worker thread.
 * listFn est appelée dans le thread principal (accès qBittorrent),
 * puis les données sont passées au worker.
 */
export async function autoOrganizeAll(
    listFn: () => Promise<any[]>
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

    const seedingCount = torrents.filter(t => t.state === 'seeding').length
    if (seedingCount === 0) return

    console.log(`[organize] Lancement worker (${seedingCount} torrents en seeding)`)
    workerRunning = true

    const workerPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'organize-worker.js')

    const worker = new Worker(workerPath)

    worker.on('message', (msg: any) => {
        if (msg.type === 'log') {
            if (msg.level === 'error') console.error(msg.msg)
            else if (msg.level === 'warn') console.warn(msg.msg)
            else console.log(msg.msg)
        } else if (msg.type === 'result') {
            console.log(`[organize] ${msg.name} → ${msg.done} OK, ${msg.skipped} skippés, ${msg.errors.length} erreurs`)
        } else if (msg.type === 'done') {
            console.log('[organize] Worker terminé')
            workerRunning = false
            worker.terminate()
        }
    })

    worker.on('error', (err) => {
        console.error('[organize] Worker erreur:', err)
        workerRunning = false
    })

    worker.on('exit', (code) => {
        if (code !== 0) console.error(`[organize] Worker exit code ${code}`)
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

        worker.postMessage({ type: 'run', torrents: [fakeTorrent] })
    })
}