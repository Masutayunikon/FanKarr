
import fs   from 'fs'
import fsp  from 'fs/promises'
import path from 'path'
import { parentPort } from 'worker_threads'
import { DATA_DIR } from './config.js'
import { getGitlabTitle } from './gitlab-map.js'
import { readOrganized } from './lib/organized-store.js'

// ─── Journal ──────────────────────────────────────────────────
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
    dest_dir     : string
}

// organized.json : Record<hash, Record<episode_id_string, OrgEntry>>
type Organized = Record<string, Record<string, OrgEntry>>

// ─── Réglages ─────────────────────────────────────────────────
function readSettings(): { mediaPath: string; completePath: string; organizeMode: string; nfoSupport: boolean, englishDirectory: boolean } {
    try {
        const p = path.join(DATA_DIR, 'settings.json')
        if (!fs.existsSync(p)) return { mediaPath: '', completePath: '', organizeMode: 'hardlink', nfoSupport: false, englishDirectory: false }
        return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch { return { mediaPath: '', completePath: '', organizeMode: 'hardlink', nfoSupport: false , englishDirectory: false } }
}

// ─── Suivi des imports ────────────────────────────────────────
function markOrganized(hash: string, episodeId: number, entry: OrgEntry) {
    parentPort?.postMessage({ type: 'mark', hash, episodeId, entry })
}

function isOrganized(hash: string, episodeId: number): boolean {
    return !!readOrganized()[hash]?.[String(episodeId)]
}

// ─── Recherche du torrent dans le catalogue ───────────────────

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

/** Hash non résolu (ex. dbid_X Synology) : recherche par torrent_name ou title, renvoie le vrai infohash. */
function findTorrentByName(
    name      : string,
    seriesData: any[],
): { torrent: any; serieData: any; infohash: string } | null {
    const n = name.toLowerCase().trim()
    if (!n) return null

    for (const sd of seriesData) {
        // Pack intégral (torrents au niveau série)
        for (const t of sd.torrents ?? []) {
            if (!t.infohash) continue
            if (
                t.torrent_name?.toLowerCase().trim() === n ||
                t.title?.toLowerCase().trim()        === n
            ) return { torrent: t, serieData: sd, infohash: t.infohash.toLowerCase() }
        }

        for (const season of sd.seasons ?? []) {
            for (const t of season.torrents ?? []) {
                if (!t.infohash) continue
                if (
                    t.torrent_name?.toLowerCase().trim() === n ||
                    t.title?.toLowerCase().trim()        === n
                ) return { torrent: { ...t, _season: season }, serieData: sd, infohash: t.infohash.toLowerCase() }
            }

            for (const ep of season.episodes ?? []) {
                for (const t of ep.torrents ?? []) {
                    if (!t.infohash) continue
                    if (
                        t.torrent_name?.toLowerCase().trim() === n ||
                        t.title?.toLowerCase().trim()        === n
                    ) return { torrent: { ...t, _episode: ep, _season: season }, serieData: sd, infohash: t.infohash.toLowerCase() }
                }
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
            let matchedPath   : string | null = null
            let matchedPathObj: any            = null

            for (const p of paths) {
                if (typeof p === 'string') {
                    if (!matchedPath) matchedPath = p.replace(/\\/g, '/')
                } else if (p?.infohash?.toLowerCase() === h) {
                    matchedPath    = p.path.replace(/\\/g, '/')
                    matchedPathObj = p
                    break
                }
            }

            if (!matchedPath) continue
            const filename = matchedPath.split('/').pop() ?? matchedPath

            const rawFmt      = matchedPathObj?.formatted_name    ?? ep.formatted_name
            const rawNfo      = matchedPathObj?.nfo_filename      ?? ep.nfo_filename
            const rawOriginal = matchedPathObj?.original_filename ?? ep.original_filename
            const fmtName     = rawFmt?.trim()
                ? rawFmt.replace(/[<>:"/\\|?*]/g, '') + '.mkv'
                : null

            if (!nfoSupport && !fmtName) {
                warn(`formatted_name absent pour l'épisode ${ep.id} (S${season.season_number}E${ep.episode_number}) : nom NFO ou nom d'origine utilisé`)
            }

            const srcExt = path.extname(filename)
            const resolvedName = nfoSupport
                ? (rawNfo ?? rawOriginal ?? filename)
                : (fmtName ?? rawNfo ?? rawOriginal ?? filename)
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

// ─── Téléchargement des NFO ───────────────────────────────────
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
    log(`Téléchargement des NFO et images depuis GitLab pour « ${gitlabTitle} »`)

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
        warn(`Dossier GitLab introuvable pour « ${gitlabTitle} » : ${err instanceof Error ? err.message : err}`)
        return
    }

    if (files.length === 0) { warn(`Aucun fichier NFO trouvé pour « ${gitlabTitle} »`); return }

    const fileEntries = files.filter((f: any) => f.type === 'blob')
    log(`${fileEntries.length} fichier(s) NFO et images à télécharger pour « ${gitlabTitle} »`)

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
            warn(`Échec du téléchargement de « ${relativePath} » : ${err instanceof Error ? err.message : err}`)
            failed++
        }
    }
    log(`NFO de « ${gitlabTitle} » : ${downloaded} téléchargé(s), ${skipped} déjà présent(s)${failed > 0 ? `, ${failed} échec(s)` : ''}`)
}

// ─── Fichiers ─────────────────────────────────────────────────

function swapExtension(filename: string, ext: string): string {
    const currentExt = path.extname(filename)
    if (!currentExt || currentExt === ext) return filename
    return filename.slice(0, -currentExt.length) + ext
}

function seasonFolder(n: number): string {
    const { englishDirectory } = readSettings()
    return n === 0 ? 'Specials' : (englishDirectory ? `Season ${String(n).padStart(2, '0')}` : `Saison ${n}`)
}

/** Supprime un fichier en réessayant si EBUSY (fichier ouvert sous Windows). */
async function unlinkWithRetry(filePath: string, maxAttempts = 5): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            await fsp.unlink(filePath)
            return
        } catch (err: any) {
            if (err?.code === 'EBUSY' && attempt < maxAttempts - 1) {
                warn(`Fichier « ${path.basename(filePath)} » occupé, nouvelle tentative (${attempt + 1}/${maxAttempts - 1})`)
                await new Promise(r => setTimeout(r, 500))
            } else {
                throw err
            }
        }
    }
}

function tryHardlink(src: string, dest: string): boolean {
    try { fs.linkSync(src, dest); return true }
    catch (err) {
        debug(`Hardlink impossible (${err instanceof Error ? err.message : err}), copie du fichier`)
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

// ─── Import d'un torrent ──────────────────────────────────────
async function organizeTorrent(
    hash              : string,
    name              : string,
    savePath          : string,
    seriesData        : any[],
    completedFileNames: Set<string> | null = null,
) {
    const { mediaPath, completePath, organizeMode, nfoSupport } = readSettings()
    const result = { total: 0, skipped: 0, done: 0, errors: [] as { file: string; error: string }[] }

    const found = findTorrentByHash(hash, seriesData)
    if (!found) {
        error(`Hash ${hash} introuvable dans le catalogue`)
        throw new Error(`Torrent introuvable : ${hash}`)
    }

    const { torrent, serieData } = found
    const rawTitle   = serieData.title ?? serieData.show_title ?? name
    const serieTitle = sanitizeDirName(rawTitle)

    debug(`Série identifiée : « ${serieTitle} » (mode : ${organizeMode}${nfoSupport ? ', NFO' : ''})`)

    if (nfoSupport) {
        await downloadGitlabFolder(serieTitle, path.join(mediaPath, serieTitle))
    }

    // ── Torrent d'un seul épisode ─────────────────────────────
    if (torrent._episode) {
        const ep      = torrent._episode
        const season  = torrent._season
        const paths: any[] = ep.paths ?? []
        let filePath   : string | null = null
        let matchedPathObj: any         = null
        for (const p of paths) {
            if (typeof p === 'string') { if (!filePath) filePath = p.replace(/\\/g, '/') }
            else if (p?.infohash?.toLowerCase() === hash.toLowerCase()) {
                filePath       = p.path.replace(/\\/g, '/')
                matchedPathObj = p
                break
            }
        }
        const filename = filePath?.split('/').pop() ?? name
        const rawFmt      = matchedPathObj?.formatted_name    ?? ep.formatted_name
        const rawNfo      = matchedPathObj?.nfo_filename      ?? ep.nfo_filename
        const rawOriginal = matchedPathObj?.original_filename ?? ep.original_filename
        const fmtName     = rawFmt?.trim()
            ? rawFmt.replace(/[<>:"/\\|?*]/g, '') + '.mkv'
            : null

        const srcExt       = path.extname(filename)
        const resolvedName = nfoSupport
            ? (rawNfo ?? rawOriginal ?? filename)
            : (fmtName ?? rawNfo ?? rawOriginal ?? filename)
        const destName = swapExtension(resolvedName, srcExt)

        const destDir = path.join(mediaPath, serieTitle, seasonFolder(season.season_number ?? 1))
        const dest    = path.join(destDir, destName)

        if (isOrganized(hash, ep.id)) return { ...result, total: 1, skipped: 1 }

        if (completedFileNames !== null && !completedFileNames.has(filename.toLowerCase())) {
            warn(`Ignoré (téléchargement incomplet ou fichier non sélectionné) : ${filename}`)
            return { ...result, total: 1, skipped: 1 }
        }

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
            error(`Fichier source introuvable : ${filename}\n  Chemins essayés :\n${candidates.map(c => `    - ${c}`).join('\n')}`)
            return { ...result, total: 1, errors: [{ file: filename, error: `Fichier source introuvable (chemins essayés : ${candidates.join(', ')})` }] }
        }

        if (!fs.existsSync(dest)) {
            fs.mkdirSync(destDir, { recursive: true })
            if (organizeMode === 'copy') {
              await  fsp.copyFile(src, dest)
            } else if (organizeMode === 'hardlink') {
                if (!tryHardlink(src, dest)) await fsp.copyFile(src, dest)
            } else {
                await fsp.copyFile(src, dest)
                markOrganized(hash, ep.id, {
                    at: new Date().toISOString(), season: season.season_number ?? 1,
                    episode: ep.episode_number, episode_id: ep.id,
                    src_filename: filename, dest_filename: destName, dest_path: dest, dest_dir: destDir,
                })
                await unlinkWithRetry(src)
                log(`${destName} importé dans ${path.basename(destDir)}`)
                return { ...result, total: 1, done: 1 }
            }
        }

        markOrganized(hash, ep.id, {
            at: new Date().toISOString(), season: season.season_number ?? 1,
            episode: ep.episode_number, episode_id: ep.id,
            src_filename: filename, dest_filename: destName, dest_path: dest, dest_dir: destDir,
        })
        log(`${destName} importé dans ${path.basename(destDir)}`)
        return { ...result, total: 1, done: 1 }
    }

    // ── Pack saison ou intégrale ──────────────────────────────
    const seasonFilter = torrent._season?.season_number
    const fileMap      = buildFileMap(serieData, hash, nfoSupport, seasonFilter)

    if (fileMap.size === 0) {
        warn(`Aucun fichier de « ${name} » ne correspond au catalogue`)
        return result
    }

    result.total = fileMap.size

    for (const [filename, { season_number, episode_number, episode_id, nfo_filename, fullPath }] of fileMap) {
        if (isOrganized(hash, episode_id)) { result.skipped++; continue }

        if (completedFileNames !== null && !completedFileNames.has(filename.toLowerCase())) {
            warn(`Ignoré (téléchargement incomplet ou fichier non sélectionné) : ${filename}`)
            result.skipped++
            continue
        }

        const candidates = [
            path.join(savePath, fullPath),
            path.join(completePath, fullPath),
            path.join(savePath, filename),
            path.join(completePath, filename),
        ]
        let src: string | null = null
        for (const c of candidates) { if (fs.existsSync(c)) { src = c; break } }

        if (!src) {
            // Pas encore téléchargé ou hors sélection (priorité 0)
            warn(`Ignoré (fichier absent du disque) : ${filename}\n  Chemins essayés :\n${candidates.map(c => `    - ${c}`).join('\n')}`)
            result.skipped++
            continue
        }

        const destDir = path.join(mediaPath, serieTitle, seasonFolder(season_number))
        const dest    = path.join(destDir, nfo_filename)

        if (fs.existsSync(dest)) {
            markOrganized(hash, episode_id, {
                at: new Date().toISOString(), season: season_number,
                episode: episode_number, episode_id,
                src_filename: filename, dest_filename: nfo_filename, dest_path: dest, dest_dir: destDir,
            })
            result.skipped++
            continue
        }

        try {
            fs.mkdirSync(destDir, { recursive: true })
            if (organizeMode === 'copy') {
                await fsp.copyFile(src, dest)
                markOrganized(hash, episode_id, {
                    at: new Date().toISOString(), season: season_number,
                    episode: episode_number, episode_id,
                    src_filename: filename, dest_filename: nfo_filename, dest_path: dest, dest_dir: destDir,
                })
            } else if (organizeMode === 'hardlink') {
                if (!tryHardlink(src, dest)) await fsp.copyFile(src, dest)
                markOrganized(hash, episode_id, {
                    at: new Date().toISOString(), season: season_number,
                    episode: episode_number, episode_id,
                    src_filename: filename, dest_filename: nfo_filename, dest_path: dest, dest_dir: destDir,
                })
            } else {
                await fsp.copyFile(src, dest)
                markOrganized(hash, episode_id, {
                    at: new Date().toISOString(), season: season_number,
                    episode: episode_number, episode_id,
                    src_filename: filename, dest_filename: nfo_filename, dest_path: dest, dest_dir: destDir,
                })
                await unlinkWithRetry(src)
            }
            result.done++
            debug(`${nfo_filename} importé dans ${path.basename(destDir)}`)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            error(`Échec de l'import de « ${filename} » : ${msg}`)
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
    const { nfoSupport }    = readSettings()

    let organized: Organized
    try { organized = readOrganized() as Organized }
    catch (err) {
        error(`Import annulé : ${err instanceof Error ? err.message : err}`)
        parentPort?.postMessage({ type: 'done' })
        return
    }

    for (const t of torrents) {
        if (t.state !== 'seeding') continue

        let found = findTorrentByHash(t.hash, seriesData)
        let effectiveHash = t.hash

        // Hash non résolu (ex. dbid_X Synology) : recherche par nom de dossier
        if (!found && t.name) {
            const byName = findTorrentByName(t.name, seriesData)
            if (byName) {
                found         = byName
                effectiveHash = byName.infohash
                debug(`Hash résolu par nom de torrent : « ${t.name} » (${effectiveHash.slice(0, 8)}…)`)
            }
        }

        if (!found) {
            debug(`Torrent « ${t.name} » (${t.hash.slice(0, 8)}…) absent du catalogue (pas encore à jour ?)`)
            continue
        }

        const { torrent, serieData } = found
        const seasonFilter = torrent._season?.season_number
        const fileMap      = buildFileMap(serieData, effectiveHash, nfoSupport, seasonFilter)
        const orgHash      = organized[effectiveHash] ?? {}
        const allDone      = fileMap.size > 0
            ? [...fileMap.values()].every(f => orgHash[String(f.episode_id)])
            : Object.keys(orgHash).length > 0

        if (allDone) {
            debug(`« ${t.name} » déjà entièrement importé`)
            continue
        }

        try {
            // Fichiers terminés (nom seul) ; null si le client ne donne pas les noms
            let completedFileNames: Set<string> | null = null
            if (Array.isArray(t.files) && t.files.length > 0) {
                const hasNames = t.files.some((f: any) => f.name && String(f.name).trim())
                if (hasNames) {
                    completedFileNames = new Set(
                        t.files
                            .filter((f: any) => (f.progress ?? 0) >= 1 && f.name && String(f.name).trim())
                            .map((f: any) => {
                                const parts = String(f.name).replace(/\\/g, '/').split('/')
                                return (parts[parts.length - 1] ?? '').toLowerCase()
                            })
                            .filter(Boolean)
                    )
                }
            }

            const result = await organizeTorrent(effectiveHash, t.name, t.save_path, seriesData, completedFileNames)
            parentPort?.postMessage({ type: 'result', hash: effectiveHash, name: t.name, serieId: serieData.id ?? null, ...result })
        } catch (err) {
            error(`Échec de l'import de « ${t.name} » :${err instanceof Error ? err.message : err}`)
        }
    }

    parentPort?.postMessage({ type: 'done' })
})