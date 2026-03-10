/**
 * Organizer
 * =========
 * Déplace ou hardlinke les fichiers téléchargés vers la médiathèque Jellyfin.
 * Incrémental : skip les fichiers déjà organisés.
 *
 * Structure dest :
 *   mediaPath / serie_title / Saison 001 / filename.mkv
 */

import fs   from 'fs'
import path from 'path'
import { readSettings } from './settings.js'

const TORRENTS_PATH  = path.join(process.cwd(), 'data', 'torrent_final.json')
const ORGANIZED_PATH = path.join(process.cwd(), 'data', 'organized.json')

// ─── Organized log ────────────────────────────────────────────

function loadOrganized(): Record<string, Record<string, string>> {
    try {
        if (!fs.existsSync(ORGANIZED_PATH)) return {}
        return JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8'))
    } catch { return {} }
}

function saveOrganized(data: Record<string, Record<string, string>>) {
    fs.writeFileSync(ORGANIZED_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

function markOrganized(hash: string, filename: string) {
    const data = loadOrganized()
    if (!data[hash]) data[hash] = {}
    data[hash][filename] = new Date().toISOString()
    saveOrganized(data)
}

function isOrganized(hash: string, filename: string): boolean {
    const data = loadOrganized()
    return !!data[hash]?.[filename]
}

// ─── Torrent lookup ───────────────────────────────────────────

function readTorrents(): any[] {
    try {
        if (!fs.existsSync(TORRENTS_PATH)) return []
        return JSON.parse(fs.readFileSync(TORRENTS_PATH, 'utf-8'))
    } catch { return [] }
}

function findTorrentByHash(hash: string): any | null {
    const torrents = readTorrents()
    return torrents.find(t => t.infohash?.toLowerCase() === hash.toLowerCase()) ?? null
}

// ─── Filesystem ops ───────────────────────────────────────────

function ensureDir(dir: string) {
    fs.mkdirSync(dir, { recursive: true })
}

function seasonFolder(n: number): string {
    return `Saison ${String(n).padStart(3, '0')}`
}

function tryHardlink(src: string, dest: string): boolean {
    try {
        fs.linkSync(src, dest)
        return true
    } catch (err) {
        console.warn(`[organize] hardlink échoué (${err instanceof Error ? err.message : err})`)
        return false
    }
}

function copyFile(src: string, dest: string) {
    fs.copyFileSync(src, dest)
}

// ─── Résultat d'organisation ──────────────────────────────────

export interface OrganizeResult {
    total   : number
    skipped : number
    done    : number
    errors  : { file: string; error: string }[]
}

// ─── Organise un torrent ──────────────────────────────────────

export async function organizeTorrent(
    hash    : string,
    name    : string,   // nom du dossier torrent (retourné par qB)
    savePath: string    // save_path retourné par qBittorrent
): Promise<OrganizeResult> {
    const settings = readSettings()
    const { mediaPath, completePath, organizeMode } = settings

    console.log(`[organize] ── Début organisation ──────────────────────`)
    console.log(`[organize] hash       : ${hash}`)
    console.log(`[organize] name       : ${name}`)
    console.log(`[organize] save_path  : ${savePath}`)
    console.log(`[organize] mediaPath  : ${mediaPath}`)
    console.log(`[organize] completePath: ${completePath}`)
    console.log(`[organize] mode       : ${organizeMode}`)

    const result: OrganizeResult = { total: 0, skipped: 0, done: 0, errors: [] }

    // Trouver le torrent dans torrent_final.json via infohash
    const torrent = findTorrentByHash(hash)
    if (!torrent) {
        console.error(`[organize] ✗ Aucun torrent avec infohash="${hash}" dans torrent_final.json`)
        throw new Error(`Torrent introuvable pour le hash : "${hash}"`)
    }
    console.log(`[organize] ✓ Torrent trouvé : ${torrent.raw}`)

    const serieTitle   = torrent.serie_title || torrent.show_title || name
    const torrentFiles: any[] = torrent.torrent_files ?? []
    console.log(`[organize] serie_title : ${serieTitle}`)
    console.log(`[organize] fichiers    : ${torrentFiles.length}`)

    if (torrentFiles.length === 0) {
        throw new Error(`Aucun fichier trouvé dans le torrent "${name}"`)
    }

    // Map filename → season_number depuis resolved_episodes
    const filenameSeasonMap = new Map<string, number>()
    for (const ep of torrent.resolved_episodes ?? []) {
        if (ep.filename && ep.season_number !== undefined) {
            filenameSeasonMap.set(ep.filename, ep.season_number)
        }
    }

    result.total = torrentFiles.length

    for (const tf of torrentFiles) {
        const filename = tf.filename
        const filePath: string[] = tf.path

        console.log(`[organize] ── Fichier : ${filename}`)
        console.log(`[organize]    path[]  : ${JSON.stringify(filePath)}`)

        // Skip si déjà organisé
        if (isOrganized(hash, filename)) {
            console.log(`[organize]    → déjà organisé, skip`)
            result.skipped++
            continue
        }

        // Essayer plusieurs chemins sources possibles
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
        for (const candidate of candidates) {
            console.log(`[organize]    candidate: ${candidate} → ${fs.existsSync(candidate) ? '✓ EXISTS' : '✗ absent'}`)
            if (fs.existsSync(candidate)) {
                src = candidate
                break
            }
        }

        if (!src) {
            const err = `Source introuvable (essayé ${candidates.length} chemins)`
            console.error(`[organize]    ✗ ${err}`)
            result.errors.push({ file: filename, error: err })
            continue
        }

        console.log(`[organize]    ✓ source : ${src}`)

        // Déterminer la saison
        const seasonNum = filenameSeasonMap.get(filename) ?? 1
        console.log(`[organize]    saison   : ${seasonNum}`)

        // Chemin destination
        const destDir = path.join(mediaPath, serieTitle, seasonFolder(seasonNum))
        const dest    = path.join(destDir, filename)
        console.log(`[organize]    dest     : ${dest}`)

        // Skip si dest existe déjà
        if (fs.existsSync(dest)) {
            console.log(`[organize]    → dest existe déjà, skip`)
            markOrganized(hash, filename)
            result.skipped++
            continue
        }

        try {
            ensureDir(destDir)

            if (organizeMode === 'hardlink') {
                const ok = tryHardlink(src, dest)
                if (!ok) {
                    console.warn(`[organize]    hardlink impossible → fallback copy`)
                    copyFile(src, dest)
                }
            } else {
                copyFile(src, dest)
                fs.unlinkSync(src)
            }

            markOrganized(hash, filename)
            result.done++
            console.log(`[organize]    ✓ ${organizeMode} OK`)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            console.error(`[organize]    ✗ ${msg}`)
            result.errors.push({ file: filename, error: msg })
        }
    }

    console.log(`[organize] ── Résultat : ${result.done} OK, ${result.skipped} skippés, ${result.errors.length} erreurs`)
    return result
}

// ─── Auto-organise polling ────────────────────────────────────

export async function autoOrganizeAll(
    listFn: () => Promise<any[]>
): Promise<void> {
    let torrents: any[]
    try {
        torrents = await listFn()
    } catch (err) {
        console.error('[organize] autoOrganizeAll: impossible de récupérer la liste des torrents:', err)
        return
    }

    console.log(`[organize] autoOrganizeAll: ${torrents.length} torrents récupérés`)

    const organized = loadOrganized()

    for (const t of torrents) {
        if (t.state !== 'seeding') {
            console.log(`[organize] skip ${t.name} (state=${t.state})`)
            continue
        }

        const torrent = findTorrentByHash(t.hash)
        if (!torrent) {
            console.warn(`[organize] hash ${t.hash} (${t.name}) non trouvé dans torrent_final.json`)
            continue
        }

        const files: any[] = torrent.torrent_files ?? []
        if (files.length === 0) continue

        const allDone = files.every((f: any) => organized[t.hash]?.[f.filename])
        if (allDone) {
            console.log(`[organize] ${t.name} → déjà entièrement organisé`)
            continue
        }

        console.log(`[organize] Auto-organisation : ${t.name}`)
        try {
            const result = await organizeTorrent(t.hash, t.name, t.save_path)
            console.log(`[organize] ${t.name} → ${result.done} fichiers, ${result.skipped} skippés, ${result.errors.length} erreurs`)
        } catch (err) {
            console.error(`[organize] Erreur pour ${t.name}:`, err)
        }
    }
}