/**
 * organize-worker.ts
 * ==================
 * Worker thread dédié à l'organisation des fichiers.
 * Tourne dans un thread séparé pour ne pas bloquer le event loop Express.
 *
 * Messages reçus  (parentPort.on) : { type: 'run', torrents: TorrentInfo[] }
 * Messages envoyés (parentPort.postMessage) :
 *   { type: 'log',    level: 'info'|'warn'|'error', msg: string }
 *   { type: 'result', hash: string, name: string, done, skipped, errors }
 *   { type: 'done' }
 */

import fs   from 'fs'
import fsp  from 'fs/promises'
import path from 'path'
import { parentPort } from 'worker_threads'

const TORRENTS_PATH  = path.join(process.cwd(), 'data', 'torrent_final.json')
const ORGANIZED_PATH = path.join(process.cwd(), 'data', 'organized.json')

// ─── Utils log ────────────────────────────────────────────────

function log(msg: string)   { parentPort?.postMessage({ type: 'log', level: 'info',  msg }) }
function warn(msg: string)  { parentPort?.postMessage({ type: 'log', level: 'warn',  msg }) }
function error(msg: string) { parentPort?.postMessage({ type: 'log', level: 'error', msg }) }

// ─── Settings (lu directement, pas d'import circulaire) ──────

function readSettings(): { mediaPath: string; completePath: string; organizeMode: string } {
    try {
        const p = path.join(process.cwd(), 'data', 'settings.json')
        if (!fs.existsSync(p)) return { mediaPath: '/media/Kai', completePath: '/downloads/complete', organizeMode: 'hardlink' }
        return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch { return { mediaPath: '/media/Kai', completePath: '/downloads/complete', organizeMode: 'hardlink' } }
}

// ─── Organized log ────────────────────────────────────────────

function loadOrganized(): Record<string, Record<string, string>> {
    try {
        if (!fs.existsSync(ORGANIZED_PATH)) return {}
        return JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8'))
    } catch { return {} }
}

function markOrganized(hash: string, filename: string) {
    const data = loadOrganized()
    if (!data[hash]) data[hash] = {}
    data[hash][filename] = new Date().toISOString()
    fs.writeFileSync(ORGANIZED_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

function isOrganized(hash: string, filename: string): boolean {
    return !!loadOrganized()[hash]?.[filename]
}

// ─── Torrent lookup ───────────────────────────────────────────

function findTorrentByHash(hash: string): any | null {
    try {
        if (!fs.existsSync(TORRENTS_PATH)) return null
        const torrents = JSON.parse(fs.readFileSync(TORRENTS_PATH, 'utf-8'))
        return torrents.find((t: any) => t.infohash?.toLowerCase() === hash.toLowerCase()) ?? null
    } catch { return null }
}

// ─── Dossiers exclus (bonus, musique, images) ────────────────

const EXCLUDED_FOLDERS = new Set([
    'endings', 'ending', 'openings', 'opening', 'ost', 'artworks', 'artwork',
    'bonus', 'extras', 'extra', 'specials', 'special', 'ncop', 'nced',
    'images', 'image', 'scans', 'scan', 'soundtrack', 'music',
])

function isInExcludedFolder(filePath: string[]): boolean {
    for (const folder of filePath.slice(0, -1)) {
        const f = folder.toLowerCase().trim()
        if (EXCLUDED_FOLDERS.has(f)) return true
        for (const excl of EXCLUDED_FOLDERS) {
            if (f.startsWith(excl)) return true
        }
    }
    return false
}

// ─── Filesystem ops ───────────────────────────────────────────

function seasonFolder(n: number): string {
    return `Saison ${String(n).padStart(3, '0')}`
}

function tryHardlink(src: string, dest: string): boolean {
    try { fs.linkSync(src, dest); return true }
    catch (err) {
        warn(`[organize] hardlink échoué (${err instanceof Error ? err.message : err})`)
        return false
    }
}

// ─── Organise un torrent ──────────────────────────────────────

async function organizeTorrent(hash: string, name: string, savePath: string) {
    const { mediaPath, completePath, organizeMode } = readSettings()
    const result = { total: 0, skipped: 0, done: 0, errors: [] as { file: string; error: string }[] }

    log(`[organize] ── ${name} ──`)
    log(`[organize] hash=${hash} save_path=${savePath} mode=${organizeMode}`)

    const torrent = findTorrentByHash(hash)
    if (!torrent) {
        error(`[organize] ✗ Hash ${hash} introuvable dans torrent_final.json`)
        throw new Error(`Torrent introuvable : ${hash}`)
    }
    log(`[organize] ✓ Trouvé : ${torrent.raw}`)

    const serieTitle   = torrent.serie_title || torrent.show_title || name
    const torrentFiles: any[] = torrent.torrent_files ?? []
    log(`[organize] serie=${serieTitle} fichiers=${torrentFiles.length}`)

    // ── Cas fichier unique ────────────────────────────────────
    if (torrentFiles.length === 0) {
        log(`[organize] torrent_files vide → tentative fichier unique`)
        const candidates = [path.join(savePath, name), path.join(completePath, name)]
        let src: string | null = null
        for (const c of candidates) {
            log(`[organize]   candidate: ${c} → ${fs.existsSync(c) ? '✓' : '✗'}`)
            if (fs.existsSync(c)) { src = c; break }
        }
        if (!src) throw new Error(`Source introuvable pour "${name}"`)

        const seasonNum = torrent.resolved_episodes?.[0]?.season_number ?? 1
        const destDir   = path.join(mediaPath, serieTitle, seasonFolder(seasonNum))
        const dest      = path.join(destDir, name)
        log(`[organize]   dest: ${dest}`)

        if (!fs.existsSync(dest)) {
            fs.mkdirSync(destDir, { recursive: true })
            if (organizeMode === 'hardlink') {
                if (!tryHardlink(src, dest)) await fsp.copyFile(src, dest)
            } else {
                await fsp.copyFile(src, dest)
                await fsp.unlink(src)
            }
            log(`[organize]   ✓ ${organizeMode} OK`)
        } else {
            log(`[organize]   → dest existe déjà, skip`)
        }
        markOrganized(hash, name)
        return { ...result, total: 1, done: 1 }
    }

    // ── Map filename → season ─────────────────────────────────
    const filenameSeasonMap = new Map<string, number>()
    for (const ep of torrent.resolved_episodes ?? []) {
        if (ep.filename && ep.season_number !== undefined)
            filenameSeasonMap.set(ep.filename, ep.season_number)
    }

    result.total = torrentFiles.length

    for (const tf of torrentFiles) {
        const filename = tf.filename
        const filePath: string[] = tf.path

        // Skip les fichiers dans des dossiers bonus/musique/images
        if (isInExcludedFolder(filePath)) {
            log(`[organize] skip bonus: ${filename}`)
            result.skipped++
            continue
        }

        if (isOrganized(hash, filename)) { result.skipped++; continue }

        const candidates = [
            path.join(savePath, name, ...filePath.slice(0, -1), filename),
            path.join(savePath, ...filePath.slice(0, -1), filename),
            path.join(savePath, name, filename),
            path.join(savePath, filename),
            path.join(completePath, name, ...filePath.slice(0, -1), filename),
            path.join(completePath, name, filename),
            path.join(completePath, filename),
        ]

        let src: string | null = null
        for (const c of candidates) {
            if (fs.existsSync(c)) { src = c; break }
        }

        if (!src) {
            const tried = candidates.map(c => `  • ${c}`).join('\n')
            error(`[organize] ✗ ${filename} introuvable:\n${tried}`)
            result.errors.push({ file: filename, error: 'Source introuvable' })
            continue
        }

        const seasonNum = filenameSeasonMap.get(filename) ?? 1
        const destDir   = path.join(mediaPath, serieTitle, seasonFolder(seasonNum))
        const dest      = path.join(destDir, filename)

        if (fs.existsSync(dest)) {
            markOrganized(hash, filename)
            result.skipped++
            continue
        }

        try {
            fs.mkdirSync(destDir, { recursive: true })
            if (organizeMode === 'hardlink') {
                if (!tryHardlink(src, dest)) await fsp.copyFile(src, dest)
            } else {
                await fsp.copyFile(src, dest)
                await fsp.unlink(src)
            }
            markOrganized(hash, filename)
            result.done++
            log(`[organize] ✓ ${filename} → Saison ${String(seasonNum).padStart(3,'0')}`)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            error(`[organize] ✗ ${filename}: ${msg}`)
            result.errors.push({ file: filename, error: msg })
        }
    }

    log(`[organize] ── Résultat ${name}: ${result.done} OK, ${result.skipped} skippés, ${result.errors.length} erreurs`)
    return result
}

// ─── Boucle principale du worker ─────────────────────────────

parentPort?.on('message', async (msg: any) => {
    if (msg.type !== 'run') return

    const torrents: any[] = msg.torrents
    const organized = loadOrganized()

    for (const t of torrents) {
        if (t.state !== 'seeding') continue

        const torrent = findTorrentByHash(t.hash)
        if (!torrent) {
            warn(`[organize] hash ${t.hash} (${t.name}) non trouvé`)
            continue
        }

        const files: any[] = torrent.torrent_files ?? []
        // Pour fichier unique : vérifier via le name directement
        const allDone = files.length > 0
            ? files.every((f: any) => organized[t.hash]?.[f.filename])
            : !!organized[t.hash]?.[t.name]

        if (allDone) continue

        try {
            const result = await organizeTorrent(t.hash, t.name, t.save_path)
            parentPort?.postMessage({ type: 'result', hash: t.hash, name: t.name, ...result })
        } catch (err) {
            error(`[organize] Erreur ${t.name}: ${err instanceof Error ? err.message : err}`)
        }
    }

    parentPort?.postMessage({ type: 'done' })
})