import fs from 'fs'
import path from 'path'
import { DATA_DIR } from '../config.js'
import { readSettings } from '../settings.js'
import { logger } from '../logger.js'
import { getGitlabTitle, localizeNfoPath } from '../gitlab-map.js'
import { loadEnrichedSeriesData, loadOrganized } from './github-cache.js'

export const GITLAB_API_NFO = 'https://gitlab.com/api/v4/projects/ElPouki%2Ffankai_pack/repository'
export const GITLAB_RAW_NFO = 'https://gitlab.com/ElPouki/fankai_pack/-/raw/main/pack'

export interface NfoUpdateNotif {
    serieTitle: string; commitSha: string; commitMsg: string
    updatedAt: string; status: 'updated' | 'error'; error?: string
}

export const recentNfoUpdates: NfoUpdateNotif[] = []
const MAX_NFO_NOTIFS   = 30
const NFO_COMMITS_PATH = path.join(DATA_DIR, 'nfo_commits.json')

export function loadNfoCommits(): Record<string, string> {
    try { if (!fs.existsSync(NFO_COMMITS_PATH)) return {}; return JSON.parse(fs.readFileSync(NFO_COMMITS_PATH, 'utf-8')) }
    catch { return {} }
}

export function saveNfoCommits(commits: Record<string, string>) {
    fs.mkdirSync(path.dirname(NFO_COMMITS_PATH), { recursive: true })
    fs.writeFileSync(NFO_COMMITS_PATH, JSON.stringify(commits, null, 2), 'utf-8')
}

export async function getLatestGitlabCommit(gitlabTitle: string): Promise<{ sha: string; message: string } | null> {
    try {
        const res = await fetch(`${GITLAB_API_NFO}/commits?path=${encodeURIComponent('pack/' + gitlabTitle)}&per_page=1&ref_name=main`, { headers: { 'User-Agent': 'fankarr' } })
        if (!res.ok) return null
        const data: any[] = await res.json()
        if (!data.length) return null
        return { sha: data[0].id, message: data[0].title ?? data[0].message ?? '' }
    } catch { return null }
}

export async function downloadNfoFolder(gitlabTitle: string, destRoot: string): Promise<void> {
    let files: any[] = [], page = 1
    while (true) {
        const batch = await fetch(`${GITLAB_API_NFO}/tree?path=${encodeURIComponent('pack/' + gitlabTitle)}&recursive=true&per_page=100&page=${page}&ref=main`, { headers: { 'User-Agent': 'fankarr' } }).then(r => r.ok ? r.json() : [])
        if (!Array.isArray(batch) || batch.length === 0) break
        files.push(...batch); if (batch.length < 100) break; page++
    }
    const { englishDirectory } = readSettings()
    let downloaded = 0, skipped = 0
    for (const entry of files.filter((f: any) => f.type === 'blob')) {
        const relativePath = entry.path.replace(`pack/${gitlabTitle}/`, '')
        const destPath     = path.join(destRoot, localizeNfoPath(relativePath, !!englishDirectory))
        try {
            const res = await fetch(`${GITLAB_RAW_NFO}/${encodeURIComponent(gitlabTitle)}/${relativePath.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'User-Agent': 'fankarr' } })
            if (!res.ok) { skipped++; continue }
            fs.mkdirSync(path.dirname(destPath), { recursive: true })
            fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()))
            downloaded++
        } catch { skipped++ }
    }
    logger.info('nfo-update', `NFO de « ${gitlabTitle} » : ${downloaded} fichier(s) mis à jour, ${skipped} échec(s)`)
}

export async function checkNfoUpdates() {
    const { mediaPath, nfoSupport } = readSettings()
    if (!nfoSupport) return
    const organized = loadOrganized()
    if (Object.keys(organized).length === 0) return
    const seriesData  = await loadEnrichedSeriesData()
    const knownHashes = new Set(Object.keys(organized))
    const serieTitles = new Set<string>()
    for (const sd of seriesData) {
        const allTorrents = [...(sd.torrents ?? []), ...(sd.seasons ?? []).flatMap((s: any) => s.torrents ?? []), ...(sd.seasons ?? []).flatMap((s: any) => (s.episodes ?? []).flatMap((e: any) => e.torrents ?? []))]
        if (allTorrents.some((t: any) => knownHashes.has(t.infohash?.toLowerCase()))) {
            const rawTitle = sd.title ?? sd.show_title ?? ''
            if (rawTitle) serieTitles.add(rawTitle.replace(/:/g, ' -').replace(/[<>"/\\|?*]/g, '').replace(/\s+/g, ' ').trim())
        }
    }
    if (serieTitles.size === 0) return
    const commits = loadNfoCommits()
    let hasChanges = false
    for (const serieTitle of serieTitles) {
        const gitlabTitle = getGitlabTitle(serieTitle)
        const latest      = await getLatestGitlabCommit(gitlabTitle)
        if (!latest || commits[gitlabTitle] === latest.sha) continue
        logger.info('nfo-update', `Mise à jour des NFO disponible pour « ${gitlabTitle} » (${latest.sha.slice(0, 8)})`)
        try {
            await downloadNfoFolder(gitlabTitle, path.join(mediaPath, serieTitle))
            commits[gitlabTitle] = latest.sha
            hasChanges = true
            recentNfoUpdates.unshift({ serieTitle, commitSha: latest.sha.slice(0, 8), commitMsg: latest.message, updatedAt: new Date().toISOString(), status: 'updated' })
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            logger.error('nfo-update', `Échec de la mise à jour des NFO de « ${gitlabTitle} » : ${msg}`)
            recentNfoUpdates.unshift({ serieTitle, commitSha: latest.sha.slice(0, 8), commitMsg: latest.message, updatedAt: new Date().toISOString(), status: 'error', error: msg })
        }
        if (recentNfoUpdates.length > MAX_NFO_NOTIFS) recentNfoUpdates.pop()
    }
    if (hasChanges) saveNfoCommits(commits)
}

// ─── NFO mal placés ───────────────────────────────────────────
// Avant la prise en compte des dossiers en anglais, les NFO et images du pack GitLab
// étaient écrits dans « Saison N » alors que les vidéos allaient dans « Season NN ».
// Seuls les dossiers « Saison N » sans vidéo sont concernés.

const NFO_SIDE_EXTS = new Set(['.nfo', '.png', '.jpg', '.jpeg', '.webp', '.tbn'])

export interface MisplacedNfoFolder {
    serie : string
    folder: string   // « Saison 1 »
    target: string   // « Season 01 »
    files : number
}

function listMisplacedFiles(dir: string): string[] {
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true })
            .filter(e => e.isFile() && !e.name.startsWith('.') && !/^(desktop\.ini|thumbs\.db)$/i.test(e.name))
        // Dossier avec des vidéos : rangé en français avant l'activation de l'anglais, les NFO vont avec
        if (files.some(e => !NFO_SIDE_EXTS.has(path.extname(e.name).toLowerCase()))) return []
        return files.map(e => e.name)
    } catch { return [] }
}

export function findMisplacedNfo(): MisplacedNfoFolder[] {
    const { mediaPath, englishDirectory } = readSettings()
    if (!englishDirectory || !mediaPath?.trim() || !fs.existsSync(mediaPath)) return []
    const result: MisplacedNfoFolder[] = []
    let series: fs.Dirent[] = []
    try { series = fs.readdirSync(mediaPath, { withFileTypes: true }).filter(e => e.isDirectory()) } catch { return [] }
    for (const serie of series) {
        let subs: fs.Dirent[] = []
        try { subs = fs.readdirSync(path.join(mediaPath, serie.name), { withFileTypes: true }).filter(e => e.isDirectory()) } catch { continue }
        for (const sub of subs) {
            const m = sub.name.match(/^Saison\s+(\d+)$/i)
            if (!m) continue
            const files = listMisplacedFiles(path.join(mediaPath, serie.name, sub.name))
            if (files.length === 0) continue
            const target = localizeNfoPath(`${sub.name}/x`, true).split('/')[0]!
            result.push({ serie: serie.name, folder: sub.name, target, files: files.length })
        }
    }
    return result
}

/** Déplace les NFO et images de « Saison N » vers « Season NN » ; les vidéos ne sont pas touchées. */
export function cleanupMisplacedNfo(): { moved: number; removed: number; foldersRemoved: number; errors: number } {
    const { mediaPath } = readSettings()
    const stats = { moved: 0, removed: 0, foldersRemoved: 0, errors: 0 }
    for (const f of findMisplacedNfo()) {
        const srcDir  = path.join(mediaPath, f.serie, f.folder)
        const destDir = path.join(mediaPath, f.serie, f.target)
        for (const name of listMisplacedFiles(srcDir)) {
            const src  = path.join(srcDir, name)
            const dest = path.join(destDir, name)
            try {
                if (fs.existsSync(dest)) {
                    fs.unlinkSync(src)          // déjà présent au bon endroit : doublon
                    stats.removed++
                } else {
                    fs.mkdirSync(destDir, { recursive: true })
                    try { fs.renameSync(src, dest) }
                    catch { fs.copyFileSync(src, dest); fs.unlinkSync(src) }
                    stats.moved++
                }
            } catch (err) {
                stats.errors++
                logger.warn('nfo-update', `Nettoyage NFO : échec sur « ${src} » : ${err instanceof Error ? err.message : err}`)
            }
        }
        try {
            // Dossier vide (hors desktop.ini, Thumbs.db, fichiers cachés) : supprimé
            const rest = fs.readdirSync(srcDir)
            if (rest.every(n => n.startsWith('.') || /^(desktop\.ini|thumbs\.db)$/i.test(n))) {
                for (const n of rest) fs.rmSync(path.join(srcDir, n), { force: true })
                fs.rmdirSync(srcDir)
                stats.foldersRemoved++
            }
        } catch {}
    }
    logger.info('nfo-update', `Nettoyage NFO : ${stats.moved} déplacé(s), ${stats.removed} doublon(s) supprimé(s), ${stats.foldersRemoved} dossier(s) supprimé(s)${stats.errors ? `, ${stats.errors} échec(s)` : ''}`)
    return stats
}
