/**
 * organize-worker.ts
 * ==================
 * Worker thread dédié à l'organisation des fichiers.
 * Tourne dans un thread séparé pour ne pas bloquer le event loop Express.
 *
 * Messages reçus  : { type: 'run', torrents: TorrentInfo[], seriesData: SerieData[] }
 * Messages envoyés :
 *   { type: 'log',    level: 'info'|'warn'|'error', msg: string }
 *   { type: 'result', hash: string, name: string, done, skipped, errors }
 *   { type: 'done' }
 */

import fs   from 'fs'
import fsp  from 'fs/promises'
import path from 'path'
import { parentPort } from 'worker_threads'
import { DATA_DIR } from './config.js'

const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')

// ─── Utils log ────────────────────────────────────────────────
function log(msg: string)   { parentPort?.postMessage({ type: 'log', level: 'info',  msg }) }
function warn(msg: string)  { parentPort?.postMessage({ type: 'log', level: 'warn',  msg }) }
function error(msg: string) { parentPort?.postMessage({ type: 'log', level: 'error', msg }) }
function debug(msg: string) { parentPort?.postMessage({ type: 'log', level: 'debug', msg }) }

// ─── Settings ─────────────────────────────────────────────────
function readSettings(): { mediaPath: string; completePath: string; organizeMode: string; nfoSupport: boolean; usePlexTitles: boolean } {
    try {
        const p = path.join(DATA_DIR, 'settings.json')
        if (!fs.existsSync(p)) return { mediaPath: '', completePath: '', organizeMode: 'hardlink', nfoSupport: false, usePlexTitles: false }
        return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch { return { mediaPath: '', completePath: '', organizeMode: 'hardlink', nfoSupport: false, usePlexTitles: false } }
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

// ─── Lookup torrent dans les seriesData passées via message ───
function findTorrentByHash(hash: string, seriesData: any[]): { torrent: any; serieData: any } | null {
    for (const sd of seriesData) {
        // Niveau série
        for (const t of sd.torrents ?? []) {
            if (t.infohash?.toLowerCase() === hash.toLowerCase())
                return { torrent: t, serieData: sd }
        }
        // Niveau saison
        for (const season of sd.seasons ?? []) {
            for (const t of season.torrents ?? []) {
                if (t.infohash?.toLowerCase() === hash.toLowerCase())
                    return { torrent: { ...t, _season: season }, serieData: sd }
            }
            // Niveau épisode — compter combien d'épisodes partagent ce torrent
            const matchingEpisodes = season.episodes?.filter((ep: any) =>
                ep.torrents?.some((t: any) => t.infohash?.toLowerCase() === hash.toLowerCase())
            ) ?? []

            if (matchingEpisodes.length === 1) {
                // Torrent propre à un seul épisode → cas épisode unique
                const ep = matchingEpisodes[0]
                const t  = ep.torrents.find((t: any) => t.infohash?.toLowerCase() === hash.toLowerCase())
                return { torrent: { ...t, _episode: ep, _season: season }, serieData: sd }
            } else if (matchingEpisodes.length > 1) {
                // Même torrent partagé entre plusieurs épisodes → traiter comme pack_saison
                const t = matchingEpisodes[0].torrents.find((t: any) => t.infohash?.toLowerCase() === hash.toLowerCase())
                return { torrent: { ...t, _season: season }, serieData: sd }
            }
        }
    }
    return null
}

// Construit la map filename → { season_number, original_filename, fullPath }
// Supporte les deux formats : { infohash, path } et string (legacy)
// destFilename : original_filename si nfoSupport, formatted_name sinon
function buildFileMap(
    serieData    : any,
    hash         : string,
    nfoSupport   : boolean,
    seasonFilter?: number,
): Map<string, { season_number: number; original_filename: string; fullPath: string }> {
    const map = new Map<string, { season_number: number; original_filename: string; fullPath: string }>()
    const h = hash.toLowerCase()

    for (const season of serieData.seasons ?? []) {
        if (seasonFilter !== undefined && season.season_number !== seasonFilter) continue
        for (const ep of season.episodes ?? []) {
            const paths: any[] = ep.paths ?? []
            let matchedPath: string | null = null

            for (const p of paths) {
                if (typeof p === 'string') {
                    if (!matchedPath) matchedPath = p.replace(/\\/g, '/')
                } else if (p?.infohash?.toLowerCase() === h) {
                    matchedPath = p.path.replace(/\\/g, '/')
                    break
                }
            }

            if (!matchedPath) continue
            const filename = matchedPath.split('/').pop() ?? matchedPath

            // nfoSupport → original_filename (correspond aux .nfo GitLab)
            // sinon → formatted_name de l'API, ou fallback original_filename
            const fmtName = ep.formatted_name?.trim()
                ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '') + '.mkv'
                : null

            if (!nfoSupport && !fmtName) {
                warn(`[organize] formatted_name manquant pour ep ${ep.id} (ep ${ep.episode_number}) — fallback original_filename`)
            }

            const destName = nfoSupport
                ? (ep.original_filename ?? filename)
                : (fmtName ?? ep.original_filename ?? filename)

            map.set(filename, {
                season_number    : season.season_number,
                original_filename: destName,
                fullPath         : matchedPath,
            })
        }
    }
    return map
}

// ─── Dossiers exclus ─────────────────────────────────────────
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
    'Enfer Et Paradis Henshū'          : 'Enfer et Paradis Henshū',
    'Hajime No Ippo Henshū'            : 'Hajime no Ippo Henshū',
    'Hikaru No Go Henshū'              : 'Hikaru no Go Henshū',
    'Hokuto No Ken Kaï'                : 'Hokuto no Ken Kaï',
    'Kaguya-sama : Love is War Henshū' : 'Kaguya-sama - Love is War Henshū',
    'Kenshin le Vagabond Henshū'       : 'Kenshin le vagabond Henshū',
    'Kuroko No Basket Henshū'          : 'Kuroko no Basket Henshū',
    'Shingeki No Kyojin Henshū'        : 'Shingeki no Kyojin Henshū',
    'Tower Of God Henshū'              : 'Tower of God Henshū',
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
        warn(`[nfo] Dossier GitLab introuvable pour "${serieTitle}": ${err instanceof Error ? err.message : err}`)
        return
    }

    if (files.length === 0) { warn(`[nfo] Aucun fichier trouvé pour "${serieTitle}"`); return }

    const fileEntries = files.filter((f: any) => f.type === 'blob')
    log(`[nfo] ${fileEntries.length} fichiers à télécharger`)

    for (const entry of fileEntries) {
        const relativePath = entry.path.replace(`pack/${gitlabTitle}/`, '')
        const destPath     = path.join(destRoot, relativePath)
        if (fs.existsSync(destPath)) continue
        try {
            fs.mkdirSync(path.dirname(destPath), { recursive: true })
            const rawUrl = `${GITLAB_RAW_BASE}/${encodeURIComponent(gitlabTitle)}/${relativePath.split('/').map(encodeURIComponent).join('/')}`
            const data   = await fetchBinary(rawUrl)
            fs.writeFileSync(destPath, data)
            log(`[nfo] ✓ ${relativePath}`)
        } catch (err) {
            warn(`[nfo] ✗ ${relativePath}: ${err instanceof Error ? err.message : err}`)
        }
    }
    log(`[nfo] GitLab synchronisé pour "${gitlabTitle}"`)
}

// ─── Filesystem ops ───────────────────────────────────────────
function seasonFolder(n: number): string { return `Saison ${n}` }

function tryHardlink(src: string, dest: string): boolean {
    try { fs.linkSync(src, dest); return true }
    catch (err) {
        warn(`[organize] hardlink échoué (${err instanceof Error ? err.message : err})`)
        return false
    }
}

// ─── Sanitise un nom de dossier ──────────────────────────────
// Remplace les caractères interdits sur les systèmes de fichiers communs
function sanitizeDirName(name: string): string {
    return name
        .replace(/:/g, ' -')      // "Kaguya-sama : Love" → "Kaguya-sama - Love"
        .replace(/[<>"/\\|?*]/g, '') // autres caractères interdits
        .replace(/\s+/g, ' ')     // espaces multiples
        .trim()
}

// ─── Organise un torrent ──────────────────────────────────────
async function organizeTorrent(hash: string, name: string, savePath: string, seriesData: any[]) {
    const { mediaPath, completePath, organizeMode, nfoSupport } = readSettings()
    const result = { total: 0, skipped: 0, done: 0, errors: [] as { file: string; error: string }[] }

    log(`[organize] ── ${name} ──`)
    log(`[organize] hash=${hash} save_path=${savePath} mode=${organizeMode}`)

    const found = findTorrentByHash(hash, seriesData)
    if (!found) {
        error(`[organize] ✗ Hash ${hash} introuvable dans les données série`)
        throw new Error(`Torrent introuvable : ${hash}`)
    }

    const { torrent, serieData } = found
    const { usePlexTitles } = readSettings()
    const rawTitle   = serieData.title ?? serieData.show_title ?? name
    const serieTitle = sanitizeDirName(
        usePlexTitles && serieData.title_for_plex
            ? serieData.title_for_plex
            : rawTitle
    )
    const torrentTitle  = torrent.title ?? name
    log(`[organize] ✓ Trouvé : ${torrentTitle} — série: ${serieTitle}`)

    // ── NFO/images depuis GitLab ──────────────────────────────
    if (nfoSupport) {
        await downloadGitlabFolder(serieTitle, path.join(mediaPath, serieTitle))
    }

    // ── Cas torrent épisode unique ────────────────────────────
    if (torrent._episode) {
        const ep      = torrent._episode
        const season  = torrent._season
        const paths: any[] = ep.paths ?? []
        let filePath: string | null = null
        for (const p of paths) {
            if (typeof p === 'string') { if (!filePath) filePath = p.replace(/\\/g, '/') }
            else if (p?.infohash?.toLowerCase() === hash.toLowerCase()) { filePath = p.path.replace(/\\/g, '/'); break }
        }
        const filename = filePath?.split('/').pop() ?? name
        const fmtName  = ep.formatted_name?.trim()
            ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '') + '.mkv'
            : null
        const destName = nfoSupport
            ? (ep.original_filename ?? filename)
            : (fmtName ?? ep.original_filename ?? filename)
        const destDir  = path.join(mediaPath, serieTitle, seasonFolder(season.season_number ?? 1))
        const dest     = path.join(destDir, destName)

        if (isOrganized(hash, filename)) return { ...result, total: 1, skipped: 1 }

        const candidates = filePath ? [
            path.join(savePath, filePath),
            path.join(completePath, filePath),
            path.join(savePath, filename),
            path.join(completePath, filename),
        ] : [
            path.join(savePath, filename),
            path.join(completePath, filename),
        ]

        let src: string | null = null
        for (const c of candidates) { if (fs.existsSync(c)) { src = c; break } }

        if (!src) {
            error(`[organize] ✗ ${filename} introuvable`)
            return { ...result, total: 1, errors: [{ file: filename, error: 'Source introuvable' }] }
        }

        if (!fs.existsSync(dest)) {
            fs.mkdirSync(destDir, { recursive: true })
            if (organizeMode === 'hardlink') {
                if (!tryHardlink(src, dest)) await fsp.copyFile(src, dest)
            } else {
                await fsp.copyFile(src, dest)
                await fsp.unlink(src)
            }
        }
        markOrganized(hash, filename)
        log(`[organize] ✓ ${destName} → Saison ${season.season_number}`)
        return { ...result, total: 1, done: 1 }
    }

    // ── Pack saison / intégrale ───────────────────────────────
    const seasonFilter = torrent._season?.season_number
    const fileMap = buildFileMap(serieData, hash, nfoSupport, seasonFilter)

    if (fileMap.size === 0) {
        warn(`[organize] Aucun fichier mappé pour ${name}`)
        return result
    }

    result.total = fileMap.size

    for (const [filename, { season_number, original_filename, fullPath }] of fileMap) {
        if (isOrganized(hash, filename)) { result.skipped++; continue }

        // Source : on utilise save_path + fullPath (chemin relatif exact dans le torrent)
        // save_path vient de qBittorrent → résiste aux renommages de dossier
        const candidates = [
            path.join(savePath, fullPath),
            path.join(completePath, fullPath),
            path.join(savePath, filename),
            path.join(completePath, filename),
        ]
        let src: string | null = null
        for (const c of candidates) { if (fs.existsSync(c)) { src = c; break } }

        if (!src) {
            error(`[organize] ✗ ${filename} introuvable`)
            result.errors.push({ file: filename, error: 'Source introuvable' })
            continue
        }

        const destDir = path.join(mediaPath, serieTitle, seasonFolder(season_number))
        const dest    = path.join(destDir, original_filename)

        if (fs.existsSync(dest)) { markOrganized(hash, filename); result.skipped++; continue }

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
            log(`[organize] ✓ ${original_filename} → Saison ${season_number}`)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            error(`[organize] ✗ ${filename}: ${msg}`)
            result.errors.push({ file: filename, error: msg })
        }
    }

    log(`[organize] ── ${name}: ${result.done} OK, ${result.skipped} skippés, ${result.errors.length} erreurs`)
    return result
}

// ─── Boucle principale du worker ─────────────────────────────
parentPort?.on('message', async (msg: any) => {
    if (msg.type !== 'run') return

    const torrents: any[]   = msg.torrents
    const seriesData: any[] = msg.seriesData ?? []
    const organized = loadOrganized()
    const { nfoSupport } = readSettings()

    for (const t of torrents) {
        if (t.state !== 'seeding') continue

        const found = findTorrentByHash(t.hash, seriesData)
        if (!found) {
            warn(`[organize] hash ${t.hash} (${t.name}) non trouvé dans les données série`)
            continue
        }

        // Vérifier si déjà tout organisé
        const { torrent, serieData } = found
        const seasonFilter   = torrent._season?.season_number
        const fileMap        = buildFileMap(serieData, t.hash, nfoSupport, seasonFilter)
        const allDone = fileMap.size > 0
            ? [...fileMap.keys()].every(f => organized[t.hash]?.[f])
            : !!organized[t.hash]?.[t.name]

        if (allDone) continue

        try {
            const result = await organizeTorrent(t.hash, t.name, t.save_path, seriesData)
            parentPort?.postMessage({ type: 'result', hash: t.hash, name: t.name, ...result })
        } catch (err) {
            error(`[organize] Erreur ${t.name}: ${err instanceof Error ? err.message : err}`)
        }
    }

    parentPort?.postMessage({ type: 'done' })
})