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
    } catch {
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
    name    : string,  // nom du dossier torrent dans completePath
    savePath: string   // save_path retourné par qBittorrent
): Promise<OrganizeResult> {
    const settings = readSettings()
    const { mediaPath, completePath, organizeMode } = settings

    const result: OrganizeResult = { total: 0, skipped: 0, done: 0, errors: [] }

    // Trouver le torrent dans torrent_final.json via infohash
    const torrent = findTorrentByHash(hash)
    if (!torrent) {
        throw new Error(`Torrent introuvable dans torrent_final.json pour le hash : "${hash}"`)
    }

    const serieTitle  = torrent.serie_title || torrent.show_title || name
    const torrentFiles: any[] = torrent.torrent_files ?? []

    if (torrentFiles.length === 0) {
        throw new Error(`Aucun fichier trouvé dans le torrent "${name}"`)
    }

    // Résoudre season_number par episode_id
    const epSeasonMap = new Map<number, number>()
    for (const ep of torrent.resolved_episodes ?? []) {
        if (ep.filename) {
            epSeasonMap.set(ep.episode_number, ep.season_number)
        }
    }
    // Map filename → season_number
    const filenameSeasonMap = new Map<string, number>()
    for (const ep of torrent.resolved_episodes ?? []) {
        if (ep.filename && ep.season_number !== undefined) {
            filenameSeasonMap.set(ep.filename, ep.season_number)
        }
    }

    result.total = torrentFiles.length

    for (const tf of torrentFiles) {
        const filename = tf.filename
        const filePath: string[] = tf.path  // ex: ["Saga 1 - ...", "file.mkv"]

        // Skip si déjà organisé
        if (isOrganized(hash, filename)) {
            result.skipped++
            continue
        }

        // Construire le chemin source
        // save_path peut déjà contenir le nom du dossier ou pas selon le client
        const torrentDir = path.join(savePath, name)
        const torrentDirAlt = savePath  // au cas où save_path inclut déjà le nom

        // Chemin source = dossier torrent + sous-dossiers + fichier
        const subPath = filePath.length > 1
            ? path.join(...filePath.slice(0, -1), filename)
            : filename

        let src = path.join(torrentDir, subPath)
        if (!fs.existsSync(src)) {
            // Fallback: save_path sans le nom du torrent
            src = path.join(torrentDirAlt, subPath)
        }
        if (!fs.existsSync(src)) {
            // Fallback: fichier directement dans save_path/name
            src = path.join(torrentDir, filename)
        }
        if (!fs.existsSync(src)) {
            result.errors.push({ file: filename, error: `Source introuvable : ${src}` })
            continue
        }

        // Déterminer la saison
        let seasonNum = filenameSeasonMap.get(filename)
        if (seasonNum === undefined) {
            // Fallback : season_number = 1
            seasonNum = 1
        }

        // Construire le chemin destination
        const destDir = path.join(mediaPath, serieTitle, seasonFolder(seasonNum))
        const dest    = path.join(destDir, filename)

        // Skip si dest existe déjà
        if (fs.existsSync(dest)) {
            markOrganized(hash, filename)
            result.skipped++
            continue
        }

        try {
            ensureDir(destDir)

            if (organizeMode === 'hardlink') {
                const ok = tryHardlink(src, dest)
                if (!ok) {
                    // Hardlink impossible (filesystems différents) → copy
                    console.warn(`[organize] hardlink échoué pour ${filename}, fallback copy`)
                    copyFile(src, dest)
                }
            } else {
                // move = copy + delete source
                copyFile(src, dest)
                fs.unlinkSync(src)
            }

            markOrganized(hash, filename)
            result.done++
            console.log(`[organize] ${organizeMode} ${filename} → ${dest}`)
        } catch (err) {
            result.errors.push({
                file : filename,
                error: err instanceof Error ? err.message : 'Erreur inconnue'
            })
        }
    }

    return result
}

// ─── Auto-organise polling ────────────────────────────────────
// Appelé depuis index.ts au démarrage, toutes les 30s
// Détecte les torrents "seeding" non encore organisés

export async function autoOrganizeAll(
    listFn: () => Promise<any[]>
): Promise<void> {
    let torrents: any[]
    try {
        torrents = await listFn()
    } catch { return }

    const organized = loadOrganized()

    for (const t of torrents) {
        if (t.state !== 'seeding') continue

        // Vérifier si tous les fichiers sont déjà organisés
        const torrent = findTorrentByHash(t.hash)
        if (!torrent) continue

        const files: any[] = torrent.torrent_files ?? []
        if (files.length === 0) continue

        const allDone = files.every(f => organized[t.hash]?.[f.filename])
        if (allDone) continue

        console.log(`[organize] Auto-organisation : ${t.name}`)
        try {
            const result = await organizeTorrent(t.hash, t.name, t.save_path)
            console.log(`[organize] ${t.name} → ${result.done} fichiers, ${result.skipped} skippés, ${result.errors.length} erreurs`)
        } catch (err) {
            console.error(`[organize] Erreur pour ${t.name}:`, err)
        }
    }
}