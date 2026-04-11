/**
 * organize-worker.ts
 * ==================
 * Worker thread dédié à l'organisation des fichiers.
 */

import fs   from 'fs'
import fsp  from 'fs/promises'
import path from 'path'
import { parentPort } from 'worker_threads'
import { DATA_DIR } from './config.js'
import { getGitlabTitle } from './gitlab-map.js'

const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')

// ─── Utils log ────────────────────────────────────────────────
function log(msg: string)   { parentPort?.postMessage({ type: 'log', level: 'info',  msg }) }
function warn(msg: string)  { parentPort?.postMessage({ type: 'log', level: 'warn',  msg }) }
function error(msg: string) { parentPort?.postMessage({ type: 'log', level: 'error', msg }) }
function debug(msg: string) { parentPort?.postMessage({ type: 'log', level: 'debug', msg }) }

// ─── Types ────────────────────────────────────────────────────
export interface OrgEntry {
    at           : string
    season       : number
    episode      : number
    episode_id   : number
    src_filename : string
    dest_filename: string
    dest_path    : string
}

// organized.json : Record<hash, Record<episode_id_string, OrgEntry>>
type Organized = Record<string, Record<string, OrgEntry>>

// ─── Settings ─────────────────────────────────────────────────
function readSettings(): { mediaPath: string; completePath: string; organizeMode: string; nfoSupport: boolean } {
    try {
        const p = path.join(DATA_DIR, 'settings.json')
        if (!fs.existsSync(p)) return { mediaPath: '', completePath: '', organizeMode: 'hardlink', nfoSupport: false }
        return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch { return { mediaPath: '', completePath: '', organizeMode: 'hardlink', nfoSupport: false } }
}

// ─── Organized log ────────────────────────────────────────────
function loadOrganized(): Organized {
    try {
        if (!fs.existsSync(ORGANIZED_PATH)) return {}
        return JSON.parse(fs.readFileSync(ORGANIZED_PATH, 'utf-8'))
    } catch { return {} }
}

function markOrganized(hash: string, episodeId: number, entry: OrgEntry) {
    const data = loadOrganized()
    if (!data[hash]) data[hash] = {}
    data[hash][String(episodeId)] = entry
    fs.writeFileSync(ORGANIZED_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

function isOrganized(hash: string, episodeId: number): boolean {
    return !!loadOrganized()[hash]?.[String(episodeId)]
}

// ─── Lookup torrent dans les seriesData ───────────────────────
function findTorrentByHash(hash: string, seriesData: any[]): { torrent: any; serieData: any } | null {
    const h = hash.toLowerCase()
    for (const sd of seriesData) {
        for (const t of sd.torrents ?? []) {
            if (t.infohash?.toLowerCase() === h)
                return { torrent: t, serieData: sd }
        }

        const seasonsWithHash = (sd.seasons ?? []).filter((s: any) =>
            s.torrents?.some((t: any) => t.infohash?.toLowerCase() === h)
        )
        if (seasonsWithHash.length === 1) {
            const season = seasonsWithHash[0]
            const t = season.torrents.find((t: any) => t.infohash?.toLowerCase() === h)
            return { torrent: { ...t, _season: season }, serieData: sd }
        } else if (seasonsWithHash.length > 1) {
            const t = seasonsWithHash[0].torrents.find((t: any) => t.infohash?.toLowerCase() === h)
            return { torrent: t, serieData: sd }
        }

        for (const season of sd.seasons ?? []) {
            const matchingEpisodes = season.episodes?.filter((ep: any) =>
                ep.torrents?.some((t: any) => t.infohash?.toLowerCase() === h)
            ) ?? []

            if (matchingEpisodes.length === 1) {
                const ep = matchingEpisodes[0]
                const t  = ep.torrents.find((t: any) => t.infohash?.toLowerCase() === h)
                return { torrent: { ...t, _episode: ep, _season: season }, serieData: sd }
            } else if (matchingEpisodes.length > 1) {
                const t = matchingEpisodes[0].torrents.find((t: any) => t.infohash?.toLowerCase() === h)
                return { torrent: { ...t, _season: season }, serieData: sd }
            }
        }
    }
    return null
}

function buildFileMap(
    serieData    : any,
    hash         : string,
    nfoSupport   : boolean,
    seasonFilter?: number,
): Map<string, { season_number: number; episode_number: number; episode_id: number; nfo_filename: string; fullPath: string }> {
    const map = new Map<string, { season_number: number; episode_number: number; episode_id: number; nfo_filename: string; fullPath: string }>()
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

            const fmtName = ep.formatted_name?.trim()
                ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '') + '.mkv'
                : null

            if (!nfoSupport && !fmtName) {
                warn(`formatted_name manquant pour épisode ${ep.id} (S${season.season_number}E${ep.episode_number}) — fallback nfo_filename`)
            }

            const srcExt = path.extname(filename)
            const resolvedName = nfoSupport
                ? (ep.nfo_filename ?? ep.original_filename ?? filename)
                : (fmtName ?? ep.nfo_filename ?? ep.original_filename ?? filename)
            const destName = swapExtension(resolvedName, srcExt)

            map.set(filename, {
                season_number : season.season_number,
                episode_number: ep.episode_number,
                episode_id    : ep.id,
                nfo_filename  : destName,
                fullPath      : matchedPath,
            })
        }
    }
    return map
}

// ─── Dossiers exclus ──────────────────────────────────────────
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

// ─── GitLab NFO downloader ────────────────────────────────────
const GITLAB_API      = 'https://gitlab.com/api/v4/projects/ElPouki%2Ffankai_pack/repository'
const GITLAB_RAW_BASE = 'https://gitlab.com/ElPouki/fankai_pack/-/raw/main/pack'

async function fetchJson(url: string): Promise<any> {
    const { default: nodeFetch } = await import('node-fetch')
    const res = await (nodeFetch as any)(url, { headers: { 'User-Agent': 'fankarr' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

async function fetchBinary(url: string): Promise<Buffer> {
    const { default: nodeFetch } = await import('node-fetch')
    const res = await (nodeFetch as any)(url, { headers: { 'User-Agent': 'fankarr' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
}

async function downloadGitlabFolder(serieTitle: string, destRoot: string): Promise<void> {
    const gitlabTitle = getGitlabTitle(serieTitle)
    const folderPath  = `pack/${gitlabTitle}`
    log(`Téléchargement NFO/images depuis GitLab pour "${gitlabTitle}"`)

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
        warn(`Dossier GitLab introuvable pour "${gitlabTitle}" : ${err instanceof Error ? err.message : err}`)
        return
    }

    if (files.length === 0) { warn(`Aucun fichier NFO trouvé pour "${gitlabTitle}"`); return }

    const fileEntries = files.filter((f: any) => f.type === 'blob')
    log(`${fileEntries.length} fichiers NFO/images à télécharger pour "${gitlabTitle}"`)

    let downloaded = 0, skipped = 0, failed = 0
    for (const entry of fileEntries) {
        const relativePath = entry.path.replace(`pack/${gitlabTitle}/`, '')
        const destPath     = path.join(destRoot, relativePath)
        if (fs.existsSync(destPath)) { skipped++; continue }
        try {
            fs.mkdirSync(path.dirname(destPath), { recursive: true })
            const rawUrl = `${GITLAB_RAW_BASE}/${encodeURIComponent(gitlabTitle)}/${relativePath.split('/').map(encodeURIComponent).join('/')}`
            const data   = await fetchBinary(rawUrl)
            fs.writeFileSync(destPath, data)
            downloaded++
        } catch (err) {
            warn(`Échec téléchargement NFO "${relativePath}" : ${err instanceof Error ? err.message : err}`)
            failed++
        }
    }
    log(`NFO "${gitlabTitle}" — ${downloaded} téléchargés, ${skipped} déjà présents${failed > 0 ? `, ${failed} échecs` : ''}`)
}

// ─── Filesystem ops ───────────────────────────────────────────

function swapExtension(filename: string, ext: string): string {
    const currentExt = path.extname(filename)
    if (!currentExt || currentExt === ext) return filename
    return filename.slice(0, -currentExt.length) + ext
}

function seasonFolder(n: number): string {
    return n === 0 ? 'Specials' : `Saison ${n}`
}

function tryHardlink(src: string, dest: string): boolean {
    try { fs.linkSync(src, dest); return true }
    catch (err) {
        debug(`Hardlink échoué (${err instanceof Error ? err.message : err}), fallback copie`)
        return false
    }
}

function sanitizeDirName(name: string): string {
    return name
        .replace(/:/g, ' -')
        .replace(/[<>"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

// ─── Organise un torrent ──────────────────────────────────────
async function organizeTorrent(hash: string, name: string, savePath: string, seriesData: any[]) {
    const { mediaPath, completePath, organizeMode, nfoSupport } = readSettings()
    const result = { total: 0, skipped: 0, done: 0, errors: [] as { file: string; error: string }[] }

    const found = findTorrentByHash(hash, seriesData)
    if (!found) {
        error(`Hash ${hash} introuvable dans les données série`)
        throw new Error(`Torrent introuvable : ${hash}`)
    }

    const { torrent, serieData } = found
    const rawTitle   = serieData.title ?? serieData.show_title ?? name
    const serieTitle = sanitizeDirName(rawTitle)

    debug(`Série identifiée : "${serieTitle}" (mode: ${organizeMode}${nfoSupport ? ', NFO' : ''})`)

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

        const srcExt       = path.extname(filename)
        const resolvedName = nfoSupport
            ? (ep.nfo_filename ?? ep.original_filename ?? filename)
            : (fmtName ?? ep.nfo_filename ?? ep.original_filename ?? filename)
        const destName = swapExtension(resolvedName, srcExt)

        const destDir = path.join(mediaPath, serieTitle, seasonFolder(season.season_number ?? 1))
        const dest    = path.join(destDir, destName)

        if (isOrganized(hash, ep.id)) return { ...result, total: 1, skipped: 1 }

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
            error(`Fichier source introuvable : ${filename}`)
            return { ...result, total: 1, errors: [{ file: filename, error: 'Source introuvable' }] }
        }

        if (!fs.existsSync(dest)) {
            fs.mkdirSync(destDir, { recursive: true })
            if (organizeMode === 'hardlink') {
                if (!tryHardlink(src, dest)) await fsp.copyFile(src, dest)
            } else {
                await fsp.copyFile(src, dest)
                markOrganized(hash, ep.id, {
                    at: new Date().toISOString(), season: season.season_number ?? 1,
                    episode: ep.episode_number, episode_id: ep.id,
                    src_filename: filename, dest_filename: destName, dest_path: dest,
                })
                await fsp.unlink(src)
                log(`${destName} → Saison ${season.season_number}`)
                return { ...result, total: 1, done: 1 }
            }
        }

        markOrganized(hash, ep.id, {
            at: new Date().toISOString(), season: season.season_number ?? 1,
            episode: ep.episode_number, episode_id: ep.id,
            src_filename: filename, dest_filename: destName, dest_path: dest,
        })
        log(`${destName} → Saison ${season.season_number}`)
        return { ...result, total: 1, done: 1 }
    }

    // ── Pack saison / intégrale ───────────────────────────────
    const seasonFilter = torrent._season?.season_number
    const fileMap      = buildFileMap(serieData, hash, nfoSupport, seasonFilter)

    if (fileMap.size === 0) {
        warn(`Aucun fichier mappé pour "${name}"`)
        return result
    }

    result.total = fileMap.size

    for (const [filename, { season_number, episode_number, episode_id, nfo_filename, fullPath }] of fileMap) {
        if (isOrganized(hash, episode_id)) { result.skipped++; continue }

        const candidates = [
            path.join(savePath, fullPath),
            path.join(completePath, fullPath),
            path.join(savePath, filename),
            path.join(completePath, filename),
        ]
        let src: string | null = null
        for (const c of candidates) { if (fs.existsSync(c)) { src = c; break } }

        if (!src) {
            error(`Fichier source introuvable : ${filename}`)
            result.errors.push({ file: filename, error: 'Source introuvable' })
            continue
        }

        const destDir = path.join(mediaPath, serieTitle, seasonFolder(season_number))
        const dest    = path.join(destDir, nfo_filename)

        if (fs.existsSync(dest)) {
            markOrganized(hash, episode_id, {
                at: new Date().toISOString(), season: season_number,
                episode: episode_number, episode_id,
                src_filename: filename, dest_filename: nfo_filename, dest_path: dest,
            })
            result.skipped++
            continue
        }

        try {
            fs.mkdirSync(destDir, { recursive: true })
            if (organizeMode === 'hardlink') {
                if (!tryHardlink(src, dest)) await fsp.copyFile(src, dest)
                markOrganized(hash, episode_id, {
                    at: new Date().toISOString(), season: season_number,
                    episode: episode_number, episode_id,
                    src_filename: filename, dest_filename: nfo_filename, dest_path: dest,
                })
            } else {
                await fsp.copyFile(src, dest)
                markOrganized(hash, episode_id, {
                    at: new Date().toISOString(), season: season_number,
                    episode: episode_number, episode_id,
                    src_filename: filename, dest_filename: nfo_filename, dest_path: dest,
                })
                await fsp.unlink(src)
            }
            result.done++
            debug(`${nfo_filename} → Saison ${season_number}`)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            error(`Échec import "${filename}" : ${msg}`)
            result.errors.push({ file: filename, error: msg })
        }
    }

    return result
}

// ─── Boucle principale ────────────────────────────────────────
parentPort?.on('message', async (msg: any) => {
    if (msg.type !== 'run') return

    const torrents: any[]   = msg.torrents
    const seriesData: any[] = msg.seriesData ?? []
    const organized         = loadOrganized()
    const { nfoSupport }    = readSettings()

    for (const t of torrents) {
        if (t.state !== 'seeding') continue

        const found = findTorrentByHash(t.hash, seriesData)
        if (!found) {
            debug(`Torrent "${t.name}" (${t.hash.slice(0, 8)}…) non trouvé dans les données série — catalogue peut-être pas à jour`)
            continue
        }

        const { torrent, serieData } = found
        const seasonFilter = torrent._season?.season_number
        const fileMap      = buildFileMap(serieData, t.hash, nfoSupport, seasonFilter)
        const orgHash      = organized[t.hash] ?? {}
        const allDone      = fileMap.size > 0
            ? [...fileMap.values()].every(f => orgHash[String(f.episode_id)])
            : Object.keys(orgHash).length > 0

        if (allDone) {
            debug(`"${t.name}" déjà entièrement importé — skip`)
            continue
        }

        try {
            const result = await organizeTorrent(t.hash, t.name, t.save_path, seriesData)
            parentPort?.postMessage({ type: 'result', hash: t.hash, name: t.name, ...result })
        } catch (err) {
            error(`Erreur lors de l'import de "${t.name}" : ${err instanceof Error ? err.message : err}`)
        }
    }

    parentPort?.postMessage({ type: 'done' })
})