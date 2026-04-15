import fs from 'fs'
import path from 'path'
import { DATA_DIR } from '../config.js'
import { readSettings } from '../settings.js'
import { logger } from '../logger.js'
import { getGitlabTitle } from '../gitlab-map.js'
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
    let downloaded = 0, skipped = 0
    for (const entry of files.filter((f: any) => f.type === 'blob')) {
        const relativePath = entry.path.replace(`pack/${gitlabTitle}/`, '')
        const destPath     = path.join(destRoot, relativePath)
        try {
            const res = await fetch(`${GITLAB_RAW_NFO}/${encodeURIComponent(gitlabTitle)}/${relativePath.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'User-Agent': 'fankarr' } })
            if (!res.ok) { skipped++; continue }
            fs.mkdirSync(path.dirname(destPath), { recursive: true })
            fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()))
            downloaded++
        } catch { skipped++ }
    }
    logger.info('nfo-update', `"${gitlabTitle}" — ${downloaded} fichiers mis à jour, ${skipped} ignorés`)
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
        logger.info('nfo-update', `MAJ NFO détectée pour "${gitlabTitle}" (${latest.sha.slice(0, 8)})`)
        try {
            await downloadNfoFolder(gitlabTitle, path.join(mediaPath, serieTitle))
            commits[gitlabTitle] = latest.sha
            hasChanges = true
            recentNfoUpdates.unshift({ serieTitle, commitSha: latest.sha.slice(0, 8), commitMsg: latest.message, updatedAt: new Date().toISOString(), status: 'updated' })
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.error('nfo-update', `Échec MAJ NFO "${gitlabTitle}" : ${msg}`)
            recentNfoUpdates.unshift({ serieTitle, commitSha: latest.sha.slice(0, 8), commitMsg: latest.message, updatedAt: new Date().toISOString(), status: 'error', error: msg })
        }
        if (recentNfoUpdates.length > MAX_NFO_NOTIFS) recentNfoUpdates.pop()
    }
    if (hasChanges) saveNfoCommits(commits)
}
