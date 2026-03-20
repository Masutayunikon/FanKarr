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

// Base directory : binaire Bun ou cwd (Docker/dev)
const _isBunBinary = typeof (globalThis as any).Bun !== 'undefined'
    && path.dirname((process as any).execPath) !== process.cwd()
const BASE_DIR = _isBunBinary
    ? path.dirname((process as any).execPath)
    : process.cwd()

const TORRENTS_PATH  = path.join(BASE_DIR, 'config', 'torrent_final.json')
const ORGANIZED_PATH = path.join(BASE_DIR, 'config', 'organized.json')

// ─── Utils log ────────────────────────────────────────────────
// Le worker tourne dans un thread séparé — il passe les logs au thread principal
// qui les écrit dans le fichier via logger.ts

function log(msg: string)   { parentPort?.postMessage({ type: 'log', level: 'info',  msg }) }
function warn(msg: string)  { parentPort?.postMessage({ type: 'log', level: 'warn',  msg }) }
function error(msg: string) { parentPort?.postMessage({ type: 'log', level: 'error', msg }) }
function debug(msg: string) { parentPort?.postMessage({ type: 'log', level: 'debug', msg }) }

// ─── Settings (lu directement, pas d'import circulaire) ──────

function readSettings(): { mediaPath: string; completePath: string; organizeMode: string; nfoSupport: boolean } {
    try {
        const p = path.join(process.cwd(), 'config', 'settings.json')
        if (!fs.existsSync(p)) return { mediaPath: '', completePath: '', organizeMode: 'hardlink', nfoSupport: false }
        return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch { return { mediaPath: '', completePath: '', organizeMode: 'hardlink', nfoSupport: false } }
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

// ─── Map correction titres API → titres GitLab ───────────────

const SERIE_TITLE_GITLAB_MAP: Record<string, string> = {
    'Enfer Et Paradis Henshū'            : 'Enfer et Paradis Henshū',
    'Hajime No Ippo Henshū'              : 'Hajime no Ippo Henshū',
    'Hikaru No Go Henshū'                : 'Hikaru no Go Henshū',
    'Hokuto No Ken Kaï'                  : 'Hokuto no Ken Kaï',
    'Kaguya-sama : Love is War Henshū'   : 'Kaguya-sama - Love is War Henshū',
    'Kenshin le Vagabond Henshū'         : 'Kenshin le vagabond Henshū',
    'Kuroko No Basket Henshū'            : 'Kuroko no Basket Henshū',
    'Shingeki No Kyojin Henshū'          : 'Shingeki no Kyojin Henshū',
    'Tower Of God Henshū'                : 'Tower of God Henshū',
}

function getGitlabSerieTitle(serieTitle: string): string {
    return SERIE_TITLE_GITLAB_MAP[serieTitle] ?? serieTitle
}



// ─── GitLab NFO downloader ────────────────────────────────────

const GITLAB_API      = 'https://gitlab.com/api/v4/projects/ElPouki%2Ffankai_pack/repository'
const GITLAB_RAW_BASE = 'https://gitlab.com/ElPouki/fankai_pack/-/raw/main/pack'

async function fetchJson(url: string): Promise<any> {
    const { default: nodeFetch } = await import('node-fetch')
    const res = await (nodeFetch as any)(url, { headers: { 'User-Agent': 'fankarr' } })
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
    return res.json()
}

async function fetchBinary(url: string): Promise<Buffer> {
    const { default: nodeFetch } = await import('node-fetch')
    const res = await (nodeFetch as any)(url, { headers: { 'User-Agent': 'fankarr' } })
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
    return Buffer.from(await res.arrayBuffer())
}

async function downloadGitlabFolder(serieTitle: string, destRoot: string): Promise<void> {
    const gitlabTitle = getGitlabSerieTitle(serieTitle)
    const folderPath  = `pack/${gitlabTitle}`

    log(`[nfo] Récupération dossier GitLab: ${gitlabTitle}`)

    // Lister récursivement tous les fichiers du dossier (pagination GitLab)
    let files: any[] = []
    try {
        let page = 1
        while (true) {
            const batch = await fetchJson(
                `${GITLAB_API}/tree?path=${encodeURIComponent(folderPath)}&recursive=true&per_page=100&page=${page}&ref=main`
            )
            if (!Array.isArray(batch) || batch.length === 0) break
            files.push(...batch)
            if (batch.length < 100) break
            page++
        }
    } catch (err) {
        warn(`[nfo] Dossier GitLab introuvable pour "${gitlabTitle}": ${err instanceof Error ? err.message : err}`)
        return
    }

    if (files.length === 0) {
        warn(`[nfo] Aucun fichier trouvé sur GitLab pour "${gitlabTitle}"`)
        return
    }

    const fileEntries = files.filter((f: any) => f.type === 'blob')
    log(`[nfo] ${fileEntries.length} fichiers à télécharger`)

    for (const entry of fileEntries) {
        // entry.path = "pack/Black Lagoon Henshū/Saison 1/fichier.nfo"
        // On retire le préfixe "pack/{gitlabTitle}/" pour obtenir le chemin relatif
        const relativePath = entry.path.replace(`pack/${gitlabTitle}/`, '')
        const destPath     = path.join(destRoot, relativePath)
        const destDir      = path.dirname(destPath)

        // Skip si déjà présent
        if (fs.existsSync(destPath)) continue

        try {
            fs.mkdirSync(destDir, { recursive: true })
            const rawUrl = `${GITLAB_RAW_BASE}/${encodeURIComponent(gitlabTitle)}/${relativePath.split('/').map(encodeURIComponent).join('/')}`
            const data   = await fetchBinary(rawUrl)
            fs.writeFileSync(destPath, data)
            log(`[nfo] ✓ ${relativePath}`)
        } catch (err) {
            warn(`[nfo] ✗ ${relativePath}: ${err instanceof Error ? err.message : err}`)
        }
    }

    log(`[nfo] Dossier GitLab synchronisé pour "${serieTitle}"`)
}

// ─── Filesystem ops ───────────────────────────────────────────

function seasonFolder(n: number): string {
    return `Saison ${n}`
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
    const { mediaPath, completePath, organizeMode, nfoSupport } = readSettings()
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

    // ── Téléchargement NFO/images depuis GitLab ───────────────
    if (nfoSupport) {
        // Collecter tous les titres de séries distincts depuis resolved_episodes
        // (un pack_integrale peut mélanger plusieurs séries, ex: One Piece Yabai + Kaï)
        const serieTitlesMap = new Map<number, string>()

        // Titre principal du torrent
        serieTitlesMap.set(torrent.serie_id ?? 0, serieTitle)

        // Titres alternatifs depuis resolved_episodes
        // resolved_episodes n'a pas toujours serie_title → on cherche dans torrent_final.json
        const allTorrents: any[] = (() => {
            try { return JSON.parse(fs.readFileSync(TORRENTS_PATH, 'utf-8')) } catch { return [] }
        })()
        const serieIdToTitle = new Map<number, string>()
        for (const t of allTorrents) {
            if (t.serie_id && t.serie_title) serieIdToTitle.set(t.serie_id, t.serie_title)
        }

        for (const ep of torrent.resolved_episodes ?? []) {
            if (ep.serie_id && !serieTitlesMap.has(ep.serie_id)) {
                const title = ep.serie_title ?? serieIdToTitle.get(ep.serie_id)
                if (title) serieTitlesMap.set(ep.serie_id, title)
            }
        }

        // Télécharger NFO pour chaque série distincte
        for (const title of serieTitlesMap.values()) {
            const serieDestRoot = path.join(mediaPath, title)
            await downloadGitlabFolder(title, serieDestRoot)
        }
    }

    // ── Cas fichier unique ────────────────────────────────────
    if (torrentFiles.length === 0) {
        log(`[organize] torrent_files vide → tentative fichier unique`)
        const candidates = [path.join(savePath, name), path.join(completePath, name)]
        let src: string | null = null
        for (const c of candidates) {
            if (fs.existsSync(c)) log(`[organize]   ✓ source trouvée: ${c}`)
            else debug(`[organize]   candidate absent: ${c}`)
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
    // Priorité : season_number dans torrent_files (packs multi-saisons)
    // Fallback  : resolved_episodes matchés par episode_number (torrents individuels)
    const filenameSeasonMap = new Map<string, number>()

    // Index resolved_episodes par episode_number pour lookup rapide
    const epByNum = new Map<number, number>()  // ep_number → season_number
    for (const ep of torrent.resolved_episodes ?? []) {
        if (ep.episode_number !== undefined && ep.season_number !== undefined)
            epByNum.set(Number(ep.episode_number), ep.season_number)
    }

    for (const tf of torrentFiles) {
        const sn: number | null = tf.season_number != null ? Number(tf.season_number) : null
        const tfNum = tf.num !== undefined ? Number(tf.num) : undefined
        if (sn !== null) {
            filenameSeasonMap.set(tf.filename, sn)
        } else if (tfNum !== undefined && epByNum.has(tfNum)) {
            filenameSeasonMap.set(tf.filename, epByNum.get(tfNum)!)
        } else if (torrent.season_number !== undefined) {
            filenameSeasonMap.set(tf.filename, torrent.season_number)
        }
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